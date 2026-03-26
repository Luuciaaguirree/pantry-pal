export interface Offer {
  id: string;
  name: string;
  store: string;
  price: number;
  oldPrice?: number;
  discount?: number; // percent
  expiresAt?: string; // ISO date
  emoji?: string;
}

// Mock offers — replace with real API integration later
export const mockOffers: Offer[] = [
  {
    id: "o1",
    name: "Leche entera 1L",
    store: "Mercadona",
    price: 0.89,
    oldPrice: 1.25,
    discount: 29,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    emoji: "🥛",
  },
  {
    id: "o2",
    name: "Pasta integral 500g",
    store: "Carrefour",
    price: 0.99,
    oldPrice: 1.49,
    discount: 33,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
    emoji: "🍝",
  },
  {
    id: "o3",
    name: "Manzanas (kg)",
    store: "Lidl",
    price: 1.29,
    oldPrice: 1.99,
    discount: 35,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    emoji: "🍎",
  },
  {
    id: "o4",
    name: "Queso fresco 250g",
    store: "Dia",
    price: 1.49,
    oldPrice: 2.29,
    discount: 35,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    emoji: "🧀",
  },
];

export async function fetchOffers(): Promise<Offer[]> {
  // Simulate small delay as if calling a remote API
  await new Promise((res) => setTimeout(res, 200));
  return mockOffers;
}
