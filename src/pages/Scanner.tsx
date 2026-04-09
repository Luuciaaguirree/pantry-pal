import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Check, Edit2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product, getProductEmoji } from "@/types/food";
import { useInventory } from "@/hooks/useInventory";
import { useTickets } from "@/hooks/useTickets";
import { Ticket } from "@/types/food";
import { useToast } from "@/hooks/use-toast";

// OCR helpers (tesseract.js + pdfjs-dist) — free and runs in the browser
// Basic image preprocessing to improve OCR: scale up, grayscale and increase contrast
async function preprocessImage(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  // target width for better OCR — scale up small images
  const scale = img.width < 1000 ? Math.min(2, Math.ceil(1000 / img.width)) : 1;
  const w = Math.max(800, img.width * scale);
  const h = Math.max(800, img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  // simple grayscale + contrast
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  // quick contrast boost
  const contrast = 1.2; // 1 = no change
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    let c = (gray - 128) * contrast + 128;
    c = Math.max(0, Math.min(255, c));
    data[i] = data[i + 1] = data[i + 2] = c;
  }
  ctx.putImageData(imageData, 0, 0);

  return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b || file), "image/png"));
}

async function extractTextFromImage(file: File, onProgress?: (p: number) => void): Promise<string> {
  try {
    const Tesseract = await import("tesseract.js");
    // use worker for better control
    const { createWorker } = Tesseract as any;
    const worker = await createWorker({
      logger: (m: any) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round((m.progress || 0) * 100));
        }
      },
    });

    await worker.load();
    // load Spanish language for better results on Spanish receipts
    try {
      await worker.loadLanguage('spa');
      await worker.initialize('spa');
    } catch {
      // fallback to default language if spa not available
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
    }
    // set page segmentation mode to single block or auto as experiment
    await worker.setParameters({ tessedit_pageseg_mode: '6' });

    const pre = await preprocessImage(file);
    const { data } = await worker.recognize(pre as any);
    const text = data?.text ?? "";
    await worker.terminate();
    return text;
  } catch (e) {
    console.error("Tesseract error", e);
    return "";
  }
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
  // dynamic import of pdfjs-dist
  const pdfjsLib = await import("pdfjs-dist");
    // try to set worker src from CDN (fallback)
    try {
      // @ts-ignore
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "3.8.162"}/pdf.worker.min.js`;
    } catch {}

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // group items by approximate y coordinate to reconstruct visual lines
      const groups: Record<number, any[]> = {};
      (content.items || []).forEach((it: any) => {
        const y = Math.round((it.transform && it.transform[5]) || 0);
        const x = Math.round((it.transform && it.transform[4]) || 0);
        if (!groups[y]) groups[y] = [];
        groups[y].push({ x, str: it.str });
      });
      const ys = Object.keys(groups).map((v) => Number(v)).sort((a, b) => b - a);
      for (const y of ys) {
        const line = groups[y].sort((a, b) => a.x - b.x).map((c) => c.str).join(' ');
        fullText += line + "\n";
      }
    }
    return fullText;
  } catch (e) {
    console.error("PDFJS error", e);
    return "";
  }
}

function parseTextToItems(text: string) {
  // Very simple heuristic parser: split by lines and try to find a price
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: Array<{ name: string; quantity: number; unit: string; price: number; daysUntilExpiry: number }> = [];
  // price regex supporting thousands and both comma/point decimals
  const priceRe = /(?:€|EUR)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2}))\b/;
  const ignoreRe = /TOTAL|SUBTOTAL|IVA|TICKET|CAMBIO|EFECTIVO|VUELTO|IMPORTE|A PAGAR/i;

  for (const origLine of lines) {
    let line = origLine;
    if (ignoreRe.test(line)) continue; // skip totals and non-product lines

    // remove trailing single-letter markers (A/B) or column markers
    line = line.replace(/\s+[A-Z]$/i, "");

    // find all price occurrences in the line
    const matches = Array.from(line.matchAll(priceRe));
    if (matches.length === 0) continue;

    // choose the last price as the item total (often right-most column)
    let priceRaw = matches[matches.length - 1][1];
    if (priceRaw.indexOf(',') > -1 && priceRaw.indexOf('.') > -1) {
      priceRaw = priceRaw.replace(/\./g, '').replace(',', '.');
    } else {
      priceRaw = priceRaw.replace(',', '.');
    }
    const price = parseFloat(priceRaw) || 0;

    // remove all price tokens from line for easier name/qty extraction
    line = line.replace(new RegExp(matches.map((m) => escapeRegExp(m[0])).join('|'), 'g'), ' ');

    // try to extract quantity and unit appearing near the middle (e.g., '1 ud')
    let quantity = 1;
    let unit = 'ud';
    const qtyRe = /(\d+[.,]?\d*)\s*(kg|g|l|ml|uds?|unid|unidad|pack|x\d+g)?/i;
    const qtyMatch = line.match(qtyRe);
    if (qtyMatch) {
      quantity = Number(qtyMatch[1].toString().replace(',', '.')) || 1;
      if (qtyMatch[2]) unit = qtyMatch[2];
      // remove the qty token from the name
      line = line.replace(qtyMatch[0], ' ');
    }

    // name is remaining text (remove excessive spaces and common labels)
    let name = line.replace(/DESCRIPCION|DESCRIPCIÓN|CANTIDAD|PRECIO|TOTAL/gi, '').trim();
    if (!name) name = origLine;

    // daysUntilExpiry heuristic
    const perishKeywords = /fresco|fresca|frescas|frescos|salm[oó]n|pollo|carne|pescado|leche|yogur|queso|perecible/i;
    const daysUntilExpiry = perishKeywords.test(origLine) ? 3 : 7;

    items.push({ name: name, quantity, unit, price, daysUntilExpiry });
  }

  // helper to escape price tokens for regex
  function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  return items;
}

// Simulated OCR result for demo
function simulateOCR(): Array<{ name: string; quantity: number; unit: string; price: number; daysUntilExpiry: number }> {
  const products = [
    { name: "Pechuga de pollo", quantity: 1, unit: "kg", price: 5.99, daysUntilExpiry: 3 },
    { name: "Leche entera", quantity: 2, unit: "L", price: 1.29, daysUntilExpiry: 7 },
    { name: "Tomates", quantity: 6, unit: "uds", price: 2.49, daysUntilExpiry: 5 },
    { name: "Pan integral", quantity: 1, unit: "ud", price: 1.89, daysUntilExpiry: 4 },
    { name: "Yogur natural", quantity: 4, unit: "uds", price: 2.15, daysUntilExpiry: 10 },
    { name: "Salmón fresco", quantity: 1, unit: "ud", price: 7.50, daysUntilExpiry: 2 },
    { name: "Lechuga", quantity: 1, unit: "ud", price: 0.99, daysUntilExpiry: 4 },
    { name: "Huevos", quantity: 12, unit: "uds", price: 2.39, daysUntilExpiry: 14 },
  ];
  // Return random 4-6 products
  const count = 4 + Math.floor(Math.random() * 3);
  return products.sort(() => Math.random() - 0.5).slice(0, count);
}

const Scanner = () => {
  const [step, setStep] = useState<"capture" | "processing" | "confirm">("capture");
  const [scannedItems, setScannedItems] = useState<
    Array<{ name: string; quantity: number; unit: string; price: number; daysUntilExpiry: number }>
  >([]);
  const [rawTexts, setRawTexts] = useState<Array<{ fileName: string; text: string }>>([]);
  const [useGpt, setUseGpt] = useState(false);
  const [storeName, setStoreName] = useState("Mercadona");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addProducts } = useInventory();
  const { addTicket } = useTickets();
  const { toast } = useToast();
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);

  const handleCapture = () => {
    setStep("processing");
    setTimeout(() => {
      const items = simulateOCR();
      setScannedItems(items);
      setStep("confirm");
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      // process files: images via Tesseract, PDFs via pdfjs
      (async () => {
        setStep('processing');
        try {
          // Option: send files to a GPT-based extractor (server proxy) if enabled
          if (useGpt) {
            try {
              const res = await sendFilesToGpt(files);
              if (res?.rawTexts) setRawTexts(res.rawTexts);
              if (res?.items && res.items.length > 0) {
                setScannedItems(res.items);
                setStep('confirm');
                setOcrProgress(null);
                return;
              }
            } catch (e) {
              console.error('GPT extractor error', e);
              // fall through to local OCR
            }
          }

          let aggregated: Array<{ name: string; quantity: number; unit: string; price: number; daysUntilExpiry: number }> = [];
          const perFileTexts: Array<{ fileName: string; text: string }> = [];
          for (const file of files) {
            let text = "";
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
              text = await extractTextFromPDF(file);
            } else if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name)) {
              text = await extractTextFromImage(file, (p) => setOcrProgress(p));
            } else {
              // unknown type — skip
              continue;
            }
            perFileTexts.push({ fileName: file.name, text });
            const items = parseTextToItems(text);
            aggregated = aggregated.concat(items);
          }

          // store raw texts for UI panel
          setRawTexts(perFileTexts);
          // reset progress
          setOcrProgress(null);

          if (aggregated.length > 0) {
            setScannedItems(aggregated);
            setStep('confirm');
          } else {
            // fallback to demo capture
            handleCapture();
          }
        } catch (err) {
          console.error(err);
          handleCapture();
        }
      })();
    }
  };

  // send files to a server endpoint that calls a multimodal LLM (ChatGPT) to extract items
  async function sendFilesToGpt(files: FileList | File[]) {
    const fd = new FormData();
    const arr = Array.from(files as File[]);
    arr.forEach((f) => fd.append('files', f, f.name));

    // optional: you can set a custom endpoint via env or leave default
    const endpoint = (import.meta.env && (import.meta.env.VITE_GPT_OCR_ENDPOINT as string)) || '/api/gpt-ocr';

    const resp = await fetch(endpoint, {
      method: 'POST',
      body: fd,
    });
    if (!resp.ok) throw new Error(`GPT proxy error ${resp.status}`);
    const json = await resp.json();
    // expected shape: { items: [...], rawTexts: [{fileName, text}] }
    return json;
  }

  const handleConfirm = () => {
    const ticketId = crypto.randomUUID();
    const now = new Date();

    const products: Product[] = scannedItems.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      expiryDate: new Date(now.getTime() + item.daysUntilExpiry * 86400000).toISOString(),
      addedDate: now.toISOString(),
      ticketId,
      emoji: getProductEmoji(item.name),
      consumed: false,
    }));

    const ticket: Ticket = {
      id: ticketId,
      storeName,
      date: now.toISOString(),
      totalAmount: scannedItems.reduce((s, i) => s + i.price, 0),
      products,
    };

    addProducts(products);
    addTicket(ticket);

    toast({
      title: "✅ Ticket guardado",
      description: `${products.length} productos añadidos al inventario`,
    });

    setStep("capture");
    setScannedItems([]);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setScannedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index: number) => {
    setScannedItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary/5 border-b px-4 pt-6 pb-4">
        <h1 className="font-display font-bold text-xl text-foreground">🧾 Escáner de tickets</h1>
        <p className="text-sm text-muted-foreground">Escanea o sube tu ticket de compra</p>
      </div>

      <div className="p-4">
        {step === "capture" && (
          <div className="space-y-4 animate-fade-in">
            <div
              onClick={handleCapture}
              className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-12 cursor-pointer hover:bg-primary/10 transition-colors"
            >
              <Camera className="h-12 w-12 text-primary" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Escanear ticket</p>
                <p className="text-sm text-muted-foreground">Toca para usar la cámara</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">o bien</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              variant="outline"
              className="w-full gap-2 h-12"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-5 w-5" />
              Subir imagen o PDF del ticket
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileUpload}
            />

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                id="useGpt"
                type="checkbox"
                checked={useGpt}
                onChange={(e) => setUseGpt(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="useGpt">Usar GPT para extracción (requiere proxy configurado)</label>
            </div>

            {/* Demo button */}
            <Button
              variant="secondary"
              className="w-full gap-2"
              onClick={handleCapture}
            >
              <Plus className="h-4 w-4" />
              Demo: generar ticket de ejemplo
            </Button>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in space-y-4">
            <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-muted-foreground font-medium">Analizando ticket con IA...</p>
            <p className="text-xs text-muted-foreground">Extrayendo productos y fechas</p>
            {ocrProgress !== null && (
              <p className="text-xs text-muted-foreground">Progreso OCR: {ocrProgress}%</p>
            )}
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <Edit2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Revisa y corrige si es necesario</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Supermercado:</label>
              <Input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Raw OCR text panel per uploaded file */}
            {rawTexts.length > 0 && (
              <div className="rounded-lg border bg-muted p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-sm">Texto extraído (raw)</strong>
                </div>
                {rawTexts.map((r, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="font-medium">{r.fileName}</div>
                    <pre className="whitespace-pre-wrap break-words text-[12px] bg-card p-2 rounded mt-1">{r.text}</pre>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {scannedItems.map((item, i) => (
                <div key={i} className="rounded-xl border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{getProductEmoji(item.name)}</span>
                    <button
                      onClick={() => removeItem(i)}
                      className="text-xs text-danger hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(i, "name", e.target.value)}
                    className="h-8 text-sm font-medium"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Cantidad</label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Precio €</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(i, "price", Number(e.target.value))}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Días caducidad</label>
                      <Input
                        type="number"
                        value={item.daysUntilExpiry}
                        onChange={(e) => updateItem(i, "daysUntilExpiry", Number(e.target.value))}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-center">
              <p className="text-sm text-muted-foreground">Total estimado</p>
              <p className="text-2xl font-bold text-primary">
                {scannedItems.reduce((s, i) => s + i.price, 0).toFixed(2)}€
              </p>
            </div>

            <Button className="w-full gap-2 h-12 text-base font-semibold" onClick={handleConfirm}>
              <Check className="h-5 w-5" />
              Confirmar y guardar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;
