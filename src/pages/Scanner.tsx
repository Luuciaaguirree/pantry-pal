import { useState, useRef } from "react";
import { Camera, Upload, Check, Edit2, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Product, getProductEmoji } from "@/types/food";
import { useInventory } from "@/hooks/useInventory";
import { useTickets } from "@/hooks/useTickets";
import { Ticket } from "@/types/food";
import { useToast } from "@/hooks/use-toast";
import { parseTicketText, type ParsedItem, type Confidence, type ItemStatus } from "@/lib/ticketParser";

// ---------------- OCR helpers (tesseract.js + pdfjs-dist) ----------------
async function preprocessImage(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = img.width < 1000 ? Math.min(2, Math.ceil(1000 / img.width)) : 1;
  const w = Math.max(800, img.width * scale);
  const h = Math.max(800, img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const contrast = 1.2;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
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
    const { createWorker } = Tesseract as any;
    const worker = await createWorker({
      logger: (m: any) => {
        if (m.status === "recognizing text" && onProgress) onProgress(Math.round((m.progress || 0) * 100));
      },
    });
    await worker.load();
    try {
      await worker.loadLanguage("spa");
      await worker.initialize("spa");
    } catch {
      await worker.loadLanguage("eng");
      await worker.initialize("eng");
    }
    await worker.setParameters({ tessedit_pageseg_mode: "6" });
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
    const pdfjsLib = await import("pdfjs-dist");
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
      const groups: Record<number, any[]> = {};
      (content.items || []).forEach((it: any) => {
        const y = Math.round((it.transform && it.transform[5]) || 0);
        const x = Math.round((it.transform && it.transform[4]) || 0);
        if (!groups[y]) groups[y] = [];
        groups[y].push({ x, str: it.str });
      });
      const ys = Object.keys(groups).map(Number).sort((a, b) => b - a);
      for (const y of ys) {
        const line = groups[y].sort((a, b) => a.x - b.x).map((c) => c.str).join(" ");
        fullText += line + "\n";
      }
    }
    return fullText;
  } catch (e) {
    console.error("PDFJS error", e);
    return "";
  }
}

// ---------------- Demo sample (uses strict parser) ----------------
const DEMO_TICKET_TEXT = `MERCADONA S.A.
CIF A-46103834
FECHA: 11/05/2026
LECH SEMI 1L           1,05
YOG NAT 4X125          1,85
TOM RAF 0,540 KG       2,15
PLAT CAN 1,200 KG      1,79
PAN INT                1,20
PRD ESP 1              0,99
SUBTOTAL               9,03
IVA 10%                0,90
TOTAL                  9,93
TARJETA                9,93`;

interface ScanItem extends ParsedItem {
  id: string;
  // editable working values
  name: string;
  quantityNum: number;
  unit: string;
  daysUntilExpiry: number;
}

function toScanItems(parsed: ParsedItem[]): ScanItem[] {
  return parsed.map((p) => {
    // try to coerce a numeric quantity for the inventory model
    let quantityNum = 1;
    let unit = "ud";
    if (p.cantidad) {
      const m = p.cantidad.match(/(\d+[.,]?\d*)\s*(kg|g|gr|ml|l|ud|uds|pack)?/i);
      if (m) {
        quantityNum = Number(m[1].replace(",", ".")) || 1;
        if (m[2]) unit = m[2].toLowerCase();
      }
    }
    return {
      ...p,
      id: crypto.randomUUID(),
      name: p.producto_detectado,
      quantityNum,
      unit,
      daysUntilExpiry: 7,
    };
  });
}

const confidenceStyle: Record<Confidence, string> = {
  alta: "bg-green-100 text-green-800 border-green-200",
  media: "bg-amber-100 text-amber-800 border-amber-200",
  baja: "bg-red-100 text-red-800 border-red-200",
};

const Scanner = () => {
  const [step, setStep] = useState<"capture" | "processing" | "confirm">("capture");
  const [items, setItems] = useState<ScanItem[]>([]);
  const [rawTexts, setRawTexts] = useState<Array<{ fileName: string; text: string }>>([]);
  const [storeName, setStoreName] = useState("Mercadona");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addProducts } = useInventory();
  const { addTicket } = useTickets();
  const { toast } = useToast();
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);

  const handleDemo = () => {
    setStep("processing");
    setTimeout(() => {
      const parsed = parseTicketText(DEMO_TICKET_TEXT);
      setItems(toScanItems(parsed));
      setRawTexts([{ fileName: "demo-ticket.txt", text: DEMO_TICKET_TEXT }]);
      setStep("confirm");
    }, 600);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    (async () => {
      setStep("processing");
      try {
        let aggregated: ParsedItem[] = [];
        const perFileTexts: Array<{ fileName: string; text: string }> = [];
        for (const file of files) {
          let text = "";
          if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
            text = await extractTextFromPDF(file);
          } else if (file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name)) {
            text = await extractTextFromImage(file, (p) => setOcrProgress(p));
          } else {
            continue;
          }
          perFileTexts.push({ fileName: file.name, text });
          aggregated = aggregated.concat(parseTicketText(text));
        }
        setRawTexts(perFileTexts);
        setOcrProgress(null);

        if (aggregated.length === 0) {
          toast({
            title: "No se detectaron productos",
            description: "No hemos podido leer productos claros en el ticket. Inténtalo con una foto más nítida.",
            variant: "destructive",
          });
          setStep("capture");
          return;
        }

        setItems(toScanItems(aggregated));
        const lowConf = aggregated.filter((i) => i.estado === "revisar").length;
        toast({
          title: "Hemos detectado estos productos",
          description: lowConf
            ? `Revisa los ${lowConf} producto(s) marcados antes de guardarlos.`
            : "Revísalos antes de guardar.",
        });
        setStep("confirm");
      } catch (err) {
        console.error(err);
        setStep("capture");
        toast({
          title: "Error al procesar el ticket",
          description: "Ha ocurrido un problema. Inténtalo de nuevo.",
          variant: "destructive",
        });
      }
    })();
  };

  const updateItem = (id: string, patch: Partial<ScanItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };
  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));
  const confirmItem = (id: string) =>
    updateItem(id, { estado: "confirmado" as ItemStatus, confianza: "alta" });

  const pendingReview = items.filter((i) => i.estado === "revisar").length;

  const handleSaveAll = () => {
    // Strict: only save items the user has confirmed (estado === confirmado)
    const toSave = items.filter((i) => i.estado === "confirmado" && i.name && i.name !== "No reconocido");
    if (toSave.length === 0) {
      toast({
        title: "Nada que guardar",
        description: "Confirma al menos un producto antes de guardarlo.",
        variant: "destructive",
      });
      return;
    }

    const ticketId = crypto.randomUUID();
    const now = new Date();
    const products: Product[] = toSave.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      quantity: item.quantityNum,
      unit: item.unit,
      price: item.precio ?? 0,
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
      totalAmount: products.reduce((s, p) => s + p.price, 0),
      products,
    };
    addProducts(products);
    addTicket(ticket);
    toast({
      title: "✅ Ticket guardado",
      description: `${products.length} producto(s) añadidos al inventario`,
    });
    setStep("capture");
    setItems([]);
    setRawTexts([]);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary/5 border-b px-4 pt-6 pb-4">
        <h1 className="font-display font-bold text-xl text-foreground">🧾 Escáner de tickets</h1>
        <p className="text-sm text-muted-foreground">Lectura estricta: solo se añade lo que aparece claro en el ticket</p>
      </div>

      <div className="p-4">
        {step === "capture" && (
          <div className="space-y-4 animate-fade-in">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-12 cursor-pointer hover:bg-primary/10 transition-colors"
            >
              <Camera className="h-12 w-12 text-primary" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Escanear ticket</p>
                <p className="text-sm text-muted-foreground">Toca para hacer una foto o subir el archivo</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">o bien</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="w-full gap-2 h-12" onClick={() => fileInputRef.current?.click()}>
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

            <Button variant="secondary" className="w-full gap-2" onClick={handleDemo}>
              <Plus className="h-4 w-4" />
              Demo: ticket de ejemplo
            </Button>

            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">¿Cómo funciona?</p>
              <p>Solo se extraen líneas con producto y precio claros. Cabeceras, IVA, totales y formas de pago se ignoran. Si no estamos seguros, lo marcamos como <strong>revisar</strong> en lugar de inventarlo.</p>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in space-y-4">
            <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-muted-foreground font-medium">Analizando ticket...</p>
            <p className="text-xs text-muted-foreground">Extrayendo solo productos claros</p>
            {ocrProgress !== null && <p className="text-xs text-muted-foreground">Progreso OCR: {ocrProgress}%</p>}
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-sm font-medium text-foreground">Hemos detectado estos productos</p>
              <p className="text-xs text-muted-foreground mt-1">
                Revisa los marcados antes de guardarlos. Los productos con confianza <strong>baja</strong> no se guardarán hasta que los confirmes.
              </p>
            </div>

            {pendingReview > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-800 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>{pendingReview} producto(s) requieren tu revisión</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Supermercado:</label>
              <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="h-8 text-sm" />
            </div>

            <div className="space-y-2">
              {items.map((item) => {
                const needsReview = item.estado === "revisar";
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border bg-card p-3 space-y-2 ${needsReview ? "border-amber-300 bg-amber-50/40" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getProductEmoji(item.name)}</span>
                        <Badge variant="outline" className={confidenceStyle[item.confianza]}>
                          {item.confianza}
                        </Badge>
                        {needsReview && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                            revisar
                          </Badge>
                        )}
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-xs text-destructive hover:underline">
                        Eliminar
                      </button>
                    </div>

                    <div className="text-[11px] text-muted-foreground italic">
                      Texto original: <span className="font-mono not-italic">{item.texto_original}</span>
                    </div>

                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      placeholder="Nombre del producto"
                      className="h-8 text-sm font-medium"
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Cantidad</label>
                        <Input
                          type="number"
                          value={item.quantityNum}
                          onChange={(e) => updateItem(item.id, { quantityNum: Number(e.target.value) })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Precio €</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.precio ?? 0}
                          onChange={(e) => updateItem(item.id, { precio: Number(e.target.value) })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Días caducidad</label>
                        <Input
                          type="number"
                          value={item.daysUntilExpiry}
                          onChange={(e) => updateItem(item.id, { daysUntilExpiry: Number(e.target.value) })}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>

                    {needsReview && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => confirmItem(item.id)}
                        disabled={!item.name || item.name === "No reconocido"}
                      >
                        <Check className="h-4 w-4" />
                        Confirmar producto
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {rawTexts.length > 0 && (
              <details className="rounded-lg border bg-muted p-3">
                <summary className="text-sm font-medium cursor-pointer">Ver texto extraído del ticket</summary>
                <div className="mt-2 space-y-2">
                  {rawTexts.map((r, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="font-medium">{r.fileName}</div>
                      <pre className="whitespace-pre-wrap break-words text-[12px] bg-card p-2 rounded mt-1">{r.text}</pre>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-center">
              <p className="text-sm text-muted-foreground">Total a guardar (solo confirmados)</p>
              <p className="text-2xl font-bold text-primary">
                {items
                  .filter((i) => i.estado === "confirmado")
                  .reduce((s, i) => s + (i.precio ?? 0), 0)
                  .toFixed(2)}
                €
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Edita libremente antes de guardar</span>
            </div>

            <Button className="w-full gap-2 h-12 text-base font-semibold" onClick={handleSaveAll}>
              <Check className="h-5 w-5" />
              Guardar productos confirmados
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;
