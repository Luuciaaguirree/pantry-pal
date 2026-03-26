import { Product, getExpiryStatus, getDaysLeft } from "@/types/food";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, Trash2 } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onConsume: (id: string) => void;
  onRemove: (id: string) => void;
  onClick?: (product: Product) => void;
}

export function ProductCard({ product, onConsume, onRemove, onClick }: ProductCardProps) {
  const status = getExpiryStatus(product.expiryDate);
  const daysLeft = getDaysLeft(product.expiryDate);

  const statusColors = {
    fresh: "border-success/30 bg-success/5",
    expiring: "border-warning/40 bg-warning/5",
    urgent: "border-danger/40 bg-danger/10",
    expired: "border-danger/60 bg-danger/15 opacity-75",
  };

  const badgeColors = {
    fresh: "bg-success/15 text-success",
    expiring: "bg-warning/15 text-warning-foreground",
    urgent: "bg-danger/15 text-danger",
    expired: "bg-danger/20 text-danger",
  };

  const daysText =
    status === "expired"
      ? "Caducado"
      : daysLeft === 0
      ? "Hoy"
      : daysLeft === 1
      ? "Mañana"
      : `${daysLeft} días`;

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 p-3 transition-all animate-fade-in cursor-pointer hover:shadow-md",
        statusColors[status]
      )}
      onClick={() => onClick?.(product)}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{product.emoji}</span>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
            badgeColors[status]
          )}
        >
          {daysText}
        </span>
      </div>
      <h3 className="font-semibold text-sm leading-tight mb-1 text-foreground">{product.name}</h3>
      <p className="text-xs text-muted-foreground">
        {product.quantity} {product.unit}
      </p>
      <div className="flex gap-1.5 mt-3">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-7 text-xs gap-1 border-success/30 text-success hover:bg-success hover:text-success-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onConsume(product.id);
          }}
        >
          <Check className="h-3 w-3" /> Consumido
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-danger"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(product.id);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
