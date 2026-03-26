import { useInventory } from "@/hooks/useInventory";
import { useSavings } from "@/hooks/useSavings";
import { PiggyBank, TrendingUp, TrendingDown, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

const Savings = () => {
  const { products } = useInventory();
  const { totalSaved, totalLost, savingsRate, consumed, expired } = useSavings(products);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary/5 border-b px-4 pt-6 pb-4">
        <h1 className="font-display font-bold text-xl flex items-center gap-2">
          <PiggyBank className="h-6 w-6 text-primary" /> Tu ahorro
        </h1>
        <p className="text-sm text-muted-foreground">Control de desperdicio y ahorro</p>
      </div>

      <div className="p-4 space-y-5">
        {/* Main savings card */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-6 text-center space-y-2">
          <Leaf className="h-8 w-8 text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Has ahorrado</p>
          <p className="text-4xl font-display font-bold text-primary">{totalSaved.toFixed(0)}€</p>
          <p className="text-xs text-muted-foreground">gracias a consumir tus alimentos a tiempo</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-4 space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Aprovechado</span>
            </div>
            <p className="text-2xl font-bold text-success">{totalSaved.toFixed(2)}€</p>
            <p className="text-xs text-muted-foreground">{consumed.length} productos</p>
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-1">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-danger" />
              <span className="text-xs text-muted-foreground">Desperdiciado</span>
            </div>
            <p className="text-2xl font-bold text-danger">{totalLost.toFixed(2)}€</p>
            <p className="text-xs text-muted-foreground">{expired.length} productos</p>
          </div>
        </div>

        {/* Savings rate */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Tasa de aprovechamiento</span>
            <span className={cn(
              "text-lg font-bold",
              savingsRate >= 80 ? "text-success" : savingsRate >= 50 ? "text-warning-foreground" : "text-danger"
            )}>
              {savingsRate}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                savingsRate >= 80 ? "bg-success" : savingsRate >= 50 ? "bg-warning" : "bg-danger"
              )}
              style={{ width: `${savingsRate}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {savingsRate >= 80
              ? "🌟 ¡Excelente! Estás reduciendo el desperdicio"
              : savingsRate >= 50
              ? "💪 Vas bien, ¡sigue así!"
              : "📈 Puedes mejorar — revisa las alertas de caducidad"}
          </p>
        </div>

        {products.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <span className="text-4xl">💰</span>
            <p className="text-muted-foreground text-sm">Empieza a escanear tickets para ver tu ahorro</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Savings;
