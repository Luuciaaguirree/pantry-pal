export interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  expiryDate: string; // ISO date
  addedDate: string; // ISO date
  ticketId: string;
  emoji: string;
  consumed: boolean;
  consumedDate?: string;
}

export interface Ticket {
  id: string;
  storeName: string;
  date: string; // ISO date
  totalAmount: number;
  products: Product[];
  imageUrl?: string;
}

export interface Recipe {
  id: string;
  name: string;
  prepTime: number; // minutes
  ingredients: string[];
  steps: string[];
  category: "urgent" | "quick" | "healthy";
  emoji: string;
}

export type ExpiryStatus = "fresh" | "expiring" | "urgent" | "expired";

export function getExpiryStatus(expiryDate: string): ExpiryStatus {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return "expired";
  if (daysLeft <= 1) return "urgent";
  if (daysLeft <= 3) return "expiring";
  return "fresh";
}

export function getDaysLeft(expiryDate: string): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getProductEmoji(name: string): string {
  const lower = name.toLowerCase();
  const emojiMap: Record<string, string> = {
    pollo: "🍗", chicken: "🍗",
    leche: "🥛", milk: "🥛",
    pan: "🍞", bread: "🍞",
    huevo: "🥚", egg: "🥚",
    tomate: "🍅", tomato: "🍅",
    manzana: "🍎", apple: "🍎",
    plátano: "🍌", banana: "🍌",
    queso: "🧀", cheese: "🧀",
    yogur: "🥛", yogurt: "🥛",
    arroz: "🍚", rice: "🍚",
    pasta: "🍝",
    carne: "🥩", meat: "🥩",
    pescado: "🐟", fish: "🐟",
    salmón: "🐟", salmon: "🐟",
    lechuga: "🥬", lettuce: "🥬",
    zanahoria: "🥕", carrot: "🥕",
    cebolla: "🧅", onion: "🧅",
    ajo: "🧄", garlic: "🧄",
    patata: "🥔", potato: "🥔",
    pimiento: "🫑", pepper: "🫑",
    aguacate: "🥑", avocado: "🥑",
    naranja: "🍊", orange: "🍊",
    limón: "🍋", lemon: "🍋",
    fresa: "🍓", strawberry: "🍓",
    uva: "🍇", grape: "🍇",
    jamón: "🥓", ham: "🥓",
    mantequilla: "🧈", butter: "🧈",
    aceite: "🫒", oil: "🫒",
  };

  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (lower.includes(key)) return emoji;
  }
  return "🛒";
}
