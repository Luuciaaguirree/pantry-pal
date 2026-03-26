import { useState, useRef } from "react";
import { Camera, Upload, Check, Edit2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product, getProductEmoji } from "@/types/food";
import { useInventory } from "@/hooks/useInventory";
import { useTickets } from "@/hooks/useTickets";
import { Ticket } from "@/types/food";
import { useToast } from "@/hooks/use-toast";

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
      handleCapture();
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
              Subir imagen del ticket
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
