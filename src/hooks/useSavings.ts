import { Product } from "@/types/food";

export function useSavings(products: Product[]) {
  const consumed = products.filter((p) => p.consumed);
  const expired = products.filter(
    (p) => !p.consumed && new Date(p.expiryDate) < new Date()
  );
  const active = products.filter(
    (p) => !p.consumed && new Date(p.expiryDate) >= new Date()
  );

  const totalSaved = consumed.reduce((sum, p) => sum + p.price, 0);
  const totalLost = expired.reduce((sum, p) => sum + p.price, 0);
  const totalActive = active.reduce((sum, p) => sum + p.price, 0);

  const savingsRate = consumed.length + expired.length > 0
    ? Math.round((consumed.length / (consumed.length + expired.length)) * 100)
    : 100;

  return { totalSaved, totalLost, totalActive, savingsRate, consumed, expired, active };
}
