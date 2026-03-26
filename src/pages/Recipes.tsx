import { useState } from "react";
import { useInventory } from "@/hooks/useInventory";
import { getDaysLeft } from "@/types/food";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, Heart, ChefHat } from "lucide-react";

interface Recipe {
  id: string;
  name: string;
  prepTime: number;
  ingredients: string[];
  emoji: string;
  steps: string[];
  category: "urgent" | "quick" | "healthy";
}

const DEMO_RECIPES: Recipe[] = [
  {
    id: "1", name: "Pollo salteado con verduras", prepTime: 20, emoji: "🍗",
    ingredients: ["Pollo", "Pimiento", "Cebolla", "Ajo", "Salsa de soja"],
    steps: ["Cortar el pollo en tiras", "Saltear las verduras", "Añadir el pollo", "Servir caliente"],
    category: "urgent",
  },
  {
    id: "2", name: "Ensalada mediterránea", prepTime: 10, emoji: "🥗",
    ingredients: ["Lechuga", "Tomate", "Aguacate", "Aceite de oliva"],
    steps: ["Lavar y cortar verduras", "Mezclar todo", "Aliñar"],
    category: "quick",
  },
  {
    id: "3", name: "Salmón al horno con limón", prepTime: 25, emoji: "🐟",
    ingredients: ["Salmón", "Limón", "Ajo", "Aceite de oliva"],
    steps: ["Precalentar horno a 200°", "Preparar salmón con limón y ajo", "Hornear 20 min"],
    category: "urgent",
  },
  {
    id: "4", name: "Tostadas con aguacate y huevo", prepTime: 10, emoji: "🥑",
    ingredients: ["Pan", "Aguacate", "Huevo"],
    steps: ["Tostar el pan", "Preparar el aguacate", "Freír el huevo", "Montar"],
    category: "quick",
  },
  {
    id: "5", name: "Bowl de yogur con frutas", prepTime: 5, emoji: "🥣",
    ingredients: ["Yogur", "Fresa", "Plátano", "Miel"],
    steps: ["Servir yogur en bowl", "Cortar frutas", "Decorar con miel"],
    category: "healthy",
  },
  {
    id: "6", name: "Crema de verduras", prepTime: 30, emoji: "🥬",
    ingredients: ["Zanahoria", "Patata", "Cebolla", "Calabacín"],
    steps: ["Pelar y trocear", "Hervir 20 min", "Triturar", "Servir con aceite"],
    category: "healthy",
  },
];

const Recipes = () => {
  const { activeProducts } = useInventory();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const urgentRecipes = DEMO_RECIPES.filter((r) => r.category === "urgent");
  const quickRecipes = DEMO_RECIPES.filter((r) => r.category === "quick");
  const healthyRecipes = DEMO_RECIPES.filter((r) => r.category === "healthy");

  const inventoryNames = activeProducts.map((p) => p.name.toLowerCase());
  const matchCount = (recipe: Recipe) =>
    recipe.ingredients.filter((ing) =>
      inventoryNames.some((n) => n.includes(ing.toLowerCase()) || ing.toLowerCase().includes(n))
    ).length;

  if (selectedRecipe) {
    return (
      <div className="min-h-screen bg-background pb-24 animate-fade-in">
        <div className="bg-primary/5 border-b px-4 pt-6 pb-4">
          <button onClick={() => setSelectedRecipe(null)} className="text-sm text-primary mb-2">← Volver</button>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{selectedRecipe.emoji}</span>
            <div>
              <h1 className="font-display font-bold text-xl">{selectedRecipe.name}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {selectedRecipe.prepTime} minutos
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-5">
          <div>
            <h3 className="font-display font-bold mb-2">Ingredientes</h3>
            <ul className="space-y-1">
              {selectedRecipe.ingredients.map((ing, i) => {
                const inInventory = inventoryNames.some(
                  (n) => n.includes(ing.toLowerCase()) || ing.toLowerCase().includes(n)
                );
                return (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className={inInventory ? "text-success" : "text-muted-foreground"}>
                      {inInventory ? "✅" : "⬜"}
                    </span>
                    {ing}
                    {inInventory && <span className="text-xs text-success">(lo tienes)</span>}
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h3 className="font-display font-bold mb-2">Pasos</h3>
            <ol className="space-y-2">
              {selectedRecipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const RecipeList = ({ recipes }: { recipes: Recipe[] }) => (
    <div className="space-y-3">
      {recipes.map((recipe) => {
        const matches = matchCount(recipe);
        return (
          <button
            key={recipe.id}
            onClick={() => setSelectedRecipe(recipe)}
            className="w-full text-left rounded-xl border bg-card p-4 flex items-center gap-3 hover:shadow-md transition-all"
          >
            <span className="text-3xl">{recipe.emoji}</span>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{recipe.name}</h4>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" /> {recipe.prepTime} min
                {matches > 0 && (
                  <span className="text-success font-medium">· {matches} ingredientes disponibles</span>
                )}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary/5 border-b px-4 pt-6 pb-4">
        <h1 className="font-display font-bold text-xl flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-primary" /> Recetas
        </h1>
        <p className="text-sm text-muted-foreground">Adaptadas a tu inventario</p>
      </div>

      <div className="p-4">
        <Tabs defaultValue="urgent">
          <TabsList className="w-full">
            <TabsTrigger value="urgent" className="flex-1 gap-1 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" /> Urgentes
            </TabsTrigger>
            <TabsTrigger value="quick" className="flex-1 gap-1 text-xs">
              <Clock className="h-3.5 w-3.5" /> Rápidas
            </TabsTrigger>
            <TabsTrigger value="healthy" className="flex-1 gap-1 text-xs">
              <Heart className="h-3.5 w-3.5" /> Saludables
            </TabsTrigger>
          </TabsList>
          <TabsContent value="urgent"><RecipeList recipes={urgentRecipes} /></TabsContent>
          <TabsContent value="quick"><RecipeList recipes={quickRecipes} /></TabsContent>
          <TabsContent value="healthy"><RecipeList recipes={healthyRecipes} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Recipes;
