import { Product, getDaysLeft, getExpiryStatus } from "@/types/food";
import { ArrowLeft, Calendar, Clock, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
  onConsume: (id: string) => void;
  onRemove: (id: string) => void;
}

const MOCK_RECIPES = [
  { id: "1", name: "Arroz con pollo", prepTime: 30, emoji: "🍗", ingredients: ["Pollo", "Arroz", "Cebolla", "Ajo"] },
  { id: "2", name: "Ensalada rápida", prepTime: 10, emoji: "🥗", ingredients: ["Lechuga", "Tomate", "Aguacate"] },
  { id: "3", name: "Tortilla de patatas", prepTime: 25, emoji: "🥔", ingredients: ["Patata", "Huevo", "Cebolla"] },
];

export function ProductDetail({ product, onBack, onConsume, onRemove }: ProductDetailProps) {
  const status = getExpiryStatus(product.expiryDate);
  const daysLeft = getDaysLeft(product.expiryDate);

  const statusLabel = {
    fresh: "En buen estado",
    expiring: "Caduca pronto",
    urgent: "¡Urgente!",
    expired: "Caducado",
  };

  const statusColor = {
    fresh: "text-success",
    expiring: "text-warning-foreground",
    urgent: "text-danger",
    expired: "text-danger",
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-display font-bold text-lg">{product.name}</h1>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Hero */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border">
          <span className="text-5xl">{product.emoji}</span>
          <div className="flex-1">
            <h2 className="font-display font-bold text-xl">{product.name}</h2>
            <p className="text-sm text-muted-foreground">{product.quantity} {product.unit}</p>
            <p className={cn("text-sm font-semibold mt-1", statusColor[status])}>
              {statusLabel[status]}
            </p>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-3 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Caduca</p>
              <p className="text-sm font-semibold">
                {new Date(product.expiryDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
              </p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-3 flex items-center gap-3">
            <Clock className={cn("h-5 w-5", statusColor[status])} />
            <div>
              <p className="text-xs text-muted-foreground">Quedan</p>
              <p className={cn("text-sm font-bold", statusColor[status])}>
                {daysLeft < 0 ? "Caducado" : daysLeft === 0 ? "Hoy" : `${daysLeft} días`}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            className="flex-1 gap-2"
            onClick={() => onConsume(product.id)}
          >
            <Package className="h-4 w-4" /> Consumido
          </Button>
          <Button
            variant="outline"
            className="border-danger/30 text-danger hover:bg-danger hover:text-danger-foreground"
            onClick={() => onRemove(product.id)}
          >
            Eliminar
          </Button>
        </div>

        {/* Recipes */}
        <div>
          <h3 className="font-display font-bold text-lg mb-3">🍝 Recetas con {product.name}</h3>
          <div className="space-y-3">
            {MOCK_RECIPES.map((recipe) => (
              <div key={recipe.id} className="rounded-xl border bg-card p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
                <span className="text-3xl">{recipe.emoji}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{recipe.name}</h4>
                  <p className="text-xs text-muted-foreground">{recipe.prepTime} min · {recipe.ingredients.join(", ")}</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs h-7">
                  Ver
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
