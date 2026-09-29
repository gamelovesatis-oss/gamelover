"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { OrderItem } from "@/lib/types";

type Cart = {
  items: OrderItem[];
  count: number;
  total: number;
  add: (item: Omit<OrderItem, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  bump: number; // sepet ikonunu zıplatmak için
};

const CartCtx = createContext<Cart | null>(null);
const KEY = "gl-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const add = useCallback((item: Omit<OrderItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((p) => p.id === item.id);
      if (found) return prev.map((p) => (p.id === item.id ? { ...p, qty: Math.min(p.qty + qty, 20) } : p));
      return [...prev, { ...item, qty }];
    });
    setBump((b) => b + 1);
  }, []);

  const setQty = useCallback(
    (id: string, qty: number) =>
      setItems((prev) => (qty <= 0 ? prev.filter((p) => p.id !== id) : prev.map((p) => (p.id === id ? { ...p, qty: Math.min(qty, 20) } : p)))),
    [],
  );
  const remove = useCallback((id: string) => setItems((prev) => prev.filter((p) => p.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<Cart>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      total: items.reduce((s, i) => s + i.qty * i.price, 0),
      add,
      setQty,
      remove,
      clear,
      bump,
    }),
    [items, add, setQty, remove, clear, bump],
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart CartProvider dışında kullanıldı");
  return ctx;
}
