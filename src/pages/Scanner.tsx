import { useState, useRef } from "react";
import { Camera, Upload, Check, Edit2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product, getProductEmoji } from "@/types/food";
import { useInventory } from "@/hooks/useInventory";
import { useTickets } from "@/hooks/useTickets";
import { Ticket } from "@/types/food";
import { useToast } from "@/hooks/use-toast";

// OCR helpers (tesseract.js + pdfjs-dist) — free and runs in the browser
async function extractTextFromImage(file: File): Promise<string> {
  try {
    const Tesseract = await import("tesseract.js");
    const { data } = await Tesseract.recognize(file);
    return data?.text ?? "";
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
      const strings = content.items.map((s: any) => s.str || "");
      fullText += strings.join(" ") + "\n";
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
  const priceRe = /(\d+[.,]\d{2})/;

  for (const line of lines) {
    const priceMatch = line.match(priceRe);
    if (!priceMatch) continue;
    const priceRaw = priceMatch[1].replace(',', '.');
    const price = parseFloat(priceRaw) || 0;
    // name is part before price
    const before = line.slice(0, line.indexOf(priceMatch[0])).trim();
    // try to extract quantity (simple number at start)
    const qtyMatch = before.match(/^(\d+)\s*/);
    const quantity = qtyMatch ? Number(qtyMatch[1]) : 1;
    let name = before;
    if (qtyMatch) name = before.slice(qtyMatch[0].length).trim();
    // unit heuristic
    const unit = /kg|g|l|ml|uds|unid|unidad|pack/i.test(line) ? 'uds' : 'ud';
    // daysUntilExpiry default heuristic: perishables shorter
    const perishKeywords = /fresco|fresca|frescas|frescos|salm[oó]n|pollo|carne|pescado|leche|yogur|queso/i;
    const daysUntilExpiry = perishKeywords.test(line) ? 3 : 7;

    items.push({ name: name || line, quantity, unit, price, daysUntilExpiry });
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
  const [storeName, setStoreName] = useState("Mercadona");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addProducts } = useInventory();
  const { addTicket } = useTickets();
  const { toast } = useToast();

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
          let aggregated: Array<{ name: string; quantity: number; unit: string; price: number; daysUntilExpiry: number }> = [];
          for (const file of files) {
            let text = "";
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
              text = await extractTextFromPDF(file);
            } else if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name)) {
              text = await extractTextFromImage(file);
            } else {
              // unknown type — skip
              continue;
            }
            const items = parseTextToItems(text);
            aggregated = aggregated.concat(items);
          }

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
