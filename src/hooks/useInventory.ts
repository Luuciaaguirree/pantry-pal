import { useState, useEffect, useCallback } from "react";
import { Product } from "@/types/food";

const STORAGE_KEY = "foodsaver_inventory";

function loadInventory(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useInventory() {
  const [products, setProducts] = useState<Product[]>(loadInventory);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  const addProducts = useCallback((newProducts: Product[]) => {
    setProducts((prev) => [...prev, ...newProducts]);
  }, []);

  const consumeProduct = useCallback((id: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, consumed: true, consumedDate: new Date().toISOString() } : p
      )
    );
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const activeProducts = products.filter((p) => !p.consumed);
  const consumedProducts = products.filter((p) => p.consumed);

  return { products, activeProducts, consumedProducts, addProducts, consumeProduct, removeProduct };
}
