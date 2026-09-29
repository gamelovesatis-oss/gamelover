"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { SmartImage, TiltCard } from "@/components/ui";
import type { Product } from "@/lib/types";
import { cn, discountPct, tl } from "@/lib/utils";

export function AddToCartButton({ product, className, big }: { product: Product; className?: string; big?: boolean }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const out = product.stock <= 0;
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      disabled={out}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add({ id: product.id, name: product.name, price: product.price, image_url: product.image_url });
        setAdded(true);
        setTimeout(() => setAdded(false), 1400);
      }}
      className={cn(
        big ? "btn-primary w-full py-4 text-base" : "grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan text-white shadow-lg transition hover:shadow-[0_0_25px_rgba(34,211,238,0.7)]",
        added && "from-neon-lime to-emerald-500",
        className,
      )}
      aria-label="Sepete ekle"
    >
      {added ? <Check className="h-5 w-5" /> : big ? null : <Plus className="h-5 w-5" />}
      {big && (out ? "Stokta yok" : added ? "Sepete eklendi!" : "Sepete Ekle")}
    </motion.button>
  );
}

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const pct = discountPct(product.price, product.old_price);
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <TiltCard className="group rounded-3xl">
        <Link href={`/urunler/${product.slug}`} className="neon-border block overflow-hidden rounded-3xl bg-ink-800/80">
          <div className="relative aspect-[4/3] overflow-hidden">
            <SmartImage src={product.image_url} alt={product.name} className="h-full w-full transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-800 via-transparent to-transparent" />
            <div className="absolute left-3 top-3 flex gap-2">
              {pct > 0 && <span className="chip bg-neon-pink text-white shadow-[0_0_15px_#f472b6]">-%{pct}</span>}
              {product.platform && <span className="chip glass text-white">{product.platform}</span>}
            </div>
            {product.stock > 0 && product.stock <= 5 && (
              <span className="chip absolute right-3 top-3 animate-glow bg-neon-amber/90 text-ink-950">Son {product.stock}</span>
            )}
          </div>
          <div className="flex items-end justify-between gap-3 p-5">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-neon-cyan/80">{product.category}</div>
              <h3 className="mt-1 truncate font-display text-lg font-semibold text-white">{product.name}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-xl font-bold text-white">{tl(product.price)}</span>
                {pct > 0 && <span className="text-sm text-slate-500 line-through">{tl(product.old_price!)}</span>}
              </div>
            </div>
            <AddToCartButton product={product} />
          </div>
        </Link>
      </TiltCard>
    </motion.div>
  );
}
