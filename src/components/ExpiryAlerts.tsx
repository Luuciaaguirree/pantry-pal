import { Product, getExpiryStatus, getDaysLeft } from "@/types/food";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpiryAlertsProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

export function ExpiryAlerts({ products, onProductClick }: ExpiryAlertsProps) {
  const urgentProducts = products
    .filter((p) => {
      const status = getExpiryStatus(p.expiryDate);
      return status === "urgent" || status === "expiring";
    })
    .sort((a, b) => getDaysLeft(a.expiryDate) - getDaysLeft(b.expiryDate));

  if (urgentProducts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-danger">
        <AlertTriangle className="h-4 w-4" />
        <span>Atención</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {urgentProducts.map((product) => {
          const status = getExpiryStatus(product.expiryDate);
          const daysLeft = getDaysLeft(product.expiryDate);
          const isUrgent = status === "urgent";

          return (
            <button
              key={product.id}
              onClick={() => onProductClick(product)}
              className={cn(
                "flex-shrink-0 flex items-center gap-2 rounded-xl px-3 py-2 text-sm border transition-all hover:shadow-sm",
                isUrgent
                  ? "border-danger/40 bg-danger/10 text-danger"
                  : "border-warning/40 bg-warning/10 text-warning-foreground"
              )}
            >
              <span className="text-lg">{product.emoji}</span>
              <div className="text-left">
                <p className="font-semibold text-xs leading-tight">{product.name}</p>
                <p className="text-[10px] opacity-80">
                  {daysLeft === 0 ? "¡Hoy!" : daysLeft === 1 ? "Mañana" : `${daysLeft} días`}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
