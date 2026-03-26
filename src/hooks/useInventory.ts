import { useState, useEffect, useCallback } from "react";
import { Product, getExpiryStatus } from "@/types/food";
import { useToast } from "@/hooks/use-toast";

const NOTIFIED_KEY = "foodsaver_notified";

function loadNotified(): string[] {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotified(list: string[]) {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(list));
  } catch {}
}

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
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  // Notify once when a product enters 'attention' (expiring or urgent)
  useEffect(() => {
    const notified = new Set(loadNotified());

    products.forEach((p) => {
      if (p.consumed) return;
      const status = getExpiryStatus(p.expiryDate);
      const isAttention = status === "expiring" || status === "urgent";
      if (isAttention && !notified.has(p.id)) {
        // show toast notification
        toast({
          title: `⚠️ ${p.name} cerca de caducar`,
          description: `${p.name} en ${p.quantity} ${p.unit} está a punto de caducarse. Compruébalo.`,
        });
        notified.add(p.id);
      }
    });

    saveNotified(Array.from(notified));
    // only run when products change
  }, [products, toast]);

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
