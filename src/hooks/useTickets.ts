import { useState, useEffect, useCallback } from "react";
import { Ticket } from "@/types/food";

const STORAGE_KEY = "foodsaver_tickets";

function loadTickets(): Ticket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>(loadTickets);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  }, [tickets]);

  const addTicket = useCallback((ticket: Ticket) => {
    setTickets((prev) => [ticket, ...prev]);
  }, []);

  return { tickets, addTicket };
}
