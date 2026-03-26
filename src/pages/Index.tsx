import { useState } from "react";
import { Product, getExpiryStatus, getDaysLeft } from "@/types/food";
import { useInventory } from "@/hooks/useInventory";
import { useSavings } from "@/hooks/useSavings";
import { ProductCard } from "@/components/ProductCard";
import { ExpiryAlerts } from "@/components/ExpiryAlerts";
import { ProductDetail } from "@/components/ProductDetail";
import { Button } from "@/components/ui/button";
import { ChefHat, Leaf, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const { products, activeProducts, consumeProduct, removeProduct } = useInventory();
  const { totalSaved } = useSavings(products);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  if (selectedProduct) {
    return (
      <ProductDetail
        product={selectedProduct}
        onBack={() => setSelectedProduct(null)}
        onConsume={(id) => {
          consumeProduct(id);
          setSelectedProduct(null);
        }}
        onRemove={(id) => {
          removeProduct(id);
          setSelectedProduct(null);
        }}
      />
    );
  }

  const sortedProducts = [...activeProducts].sort(
    (a, b) => getDaysLeft(a.expiryDate) - getDaysLeft(b.expiryDate)
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary/5 border-b px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" />
            <h1 className="font-display font-bold text-xl text-foreground">FoodSaver</h1>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-bold text-primary">{totalSaved.toFixed(0)}€</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">¿Qué tengo y qué debería hacer hoy?</p>
      </div>

      <div className="p-4 space-y-5">
        {/* Expiry alerts */}
        <ExpiryAlerts products={activeProducts} onProductClick={setSelectedProduct} />

        {/* Cook button */}
        <Link to="/recipes">
          <Button className="w-full gap-2 h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/20">
            <ChefHat className="h-5 w-5" />
            ¿Qué puedo cocinar hoy?
          </Button>
        </Link>

        {/* Inventory */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg">Mi inventario</h2>
            <span className="text-sm text-muted-foreground">{activeProducts.length} productos</span>
          </div>

          {activeProducts.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <span className="text-5xl">🛒</span>
              <p className="text-muted-foreground">Tu inventario está vacío</p>
              <Link to="/scanner">
                <Button variant="outline" className="mt-2">
                  Escanear primer ticket
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onConsume={consumeProduct}
                  onRemove={removeProduct}
                  onClick={setSelectedProduct}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
