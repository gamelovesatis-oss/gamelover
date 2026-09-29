"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const SORTS = {
  yeni: "En yeni",
  artan: "Fiyat: düşükten yükseğe",
  azalan: "Fiyat: yüksekten düşüğe",
  indirim: "En çok indirim",
} as const;

export function ProductGrid({ products }: { products: Product[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tümü");
  const [plat, setPlat] = useState("Tümü");
  const [sort, setSort] = useState<keyof typeof SORTS>("yeni");

  const cats = ["Tümü", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
  const plats = ["Tümü", ...Array.from(new Set(products.map((p) => p.platform).filter(Boolean) as string[]))];

  const list = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr");
    const out = products.filter(
      (p) =>
        (cat === "Tümü" || p.category === cat) &&
        (plat === "Tümü" || p.platform === plat) &&
        (!term || `${p.name} ${p.description}`.toLocaleLowerCase("tr").includes(term)),
    );
    const disc = (p: Product) => (p.old_price ? (p.old_price - p.price) / p.old_price : 0);
    if (sort === "artan") out.sort((a, b) => a.price - b.price);
    if (sort === "azalan") out.sort((a, b) => b.price - a.price);
    if (sort === "indirim") out.sort((a, b) => disc(b) - disc(a));
    return out;
  }, [products, q, cat, plat, sort]);

  return (
    <>
      <div className="glass sticky top-24 z-30 mb-10 flex flex-col gap-4 rounded-2xl p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün ara… (PS5, kulaklık, kol)" className="input pl-11" />
        </div>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn("relative rounded-xl px-4 py-2 text-sm font-medium transition", cat === c ? "text-white" : "text-slate-400 hover:text-white")}
            >
              {cat === c && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-xl bg-gradient-to-r from-neon-violet to-neon-cyan" />}
              <span className="relative">{c}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select value={plat} onChange={(e) => setPlat(e.target.value)} className="input w-auto py-2" aria-label="Platform">
            {plats.map((p) => (
              <option key={p} value={p} className="bg-ink-900">
                {p === "Tümü" ? "Tüm platformlar" : p}
              </option>
            ))}
          </select>
          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <select value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)} className="input w-auto py-2 pl-9" aria-label="Sırala">
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k} className="bg-ink-900">
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {list.map((p, i) => (
            <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <ProductCard product={p} index={i} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {list.length === 0 && <p className="py-20 text-center text-slate-400">Aramana uygun ürün bulunamadı.</p>}
    </>
  );
}
