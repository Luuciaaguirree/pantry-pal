import { useTickets } from "@/hooks/useTickets";
import { useInventory } from "@/hooks/useInventory";
import { useState } from "react";
import { ArrowLeft, Receipt, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Ticket } from "@/types/food";
import { cn } from "@/lib/utils";

const History = () => {
  const { tickets } = useTickets();
  const { products } = useInventory();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  if (selectedTicket) {
    const ticketProducts = products.filter((p) => p.ticketId === selectedTicket.id);
    const consumed = ticketProducts.filter((p) => p.consumed);
    const expired = ticketProducts.filter((p) => !p.consumed && new Date(p.expiryDate) < new Date());
    const active = ticketProducts.filter((p) => !p.consumed && new Date(p.expiryDate) >= new Date());
    const saved = consumed.reduce((s, p) => s + p.price, 0);
    const lost = expired.reduce((s, p) => s + p.price, 0);

    return (
      <div className="min-h-screen bg-background pb-24 animate-fade-in">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-display font-bold text-lg">{selectedTicket.storeName}</h1>
            <p className="text-xs text-muted-foreground">
              {new Date(selectedTicket.date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-success/5 border-success/20 p-3 text-center">
              <p className="text-xs text-muted-foreground">Aprovechado</p>
              <p className="text-xl font-bold text-success">{saved.toFixed(2)}€</p>
            </div>
            <div className="rounded-xl border bg-danger/5 border-danger/20 p-3 text-center">
              <p className="text-xs text-muted-foreground">Perdido</p>
              <p className="text-xl font-bold text-danger">{lost.toFixed(2)}€</p>
            </div>
          </div>

          <div className="space-y-2">
            {ticketProducts.map((product) => (
              <div key={product.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <span className="text-xl">{product.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.price.toFixed(2)}€</p>
                </div>
                {product.consumed ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : new Date(product.expiryDate) < new Date() ? (
                  <XCircle className="h-5 w-5 text-danger" />
                ) : (
                  <span className="text-xs text-muted-foreground">Activo</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary/5 border-b px-4 pt-6 pb-4">
        <h1 className="font-display font-bold text-xl flex items-center gap-2">
          <Receipt className="h-6 w-6 text-primary" /> Historial
        </h1>
        <p className="text-sm text-muted-foreground">Tus tickets de compra</p>
      </div>

      <div className="p-4">
        {tickets.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <span className="text-5xl">📃</span>
            <p className="text-muted-foreground">Aún no hay tickets</p>
            <p className="text-xs text-muted-foreground">Escanea tu primer ticket para empezar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="w-full text-left rounded-xl border bg-card p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">{ticket.storeName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ticket.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      {" · "}
                      {ticket.products.length} productos
                    </p>
                  </div>
                  <span className="font-bold text-foreground">{ticket.totalAmount.toFixed(2)}€</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
