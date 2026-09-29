"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Gamepad2, Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/urunler", label: "Mağaza" },
  { href: "/kampanyalar", label: "Kampanyalar" },
  { href: "/etkinlikler", label: "Etkinlikler" },
  { href: "/oyunlar", label: "Oyun Salonu" },
  { href: "/teklif", label: "Teklif Ver" },
];

export function Navbar({ announcement }: { announcement?: string | null }) {
  const path = usePathname();
  const { count, bump } = useCart();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY, scrollYProgress } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 30));

  return (
    <>
      {announcement && (
        <div className="relative z-50 overflow-hidden bg-gradient-to-r from-neon-violet via-fuchsia-600 to-neon-cyan py-2 text-center text-xs font-semibold text-white sm:text-sm">
          <div className="container-x">{announcement}</div>
        </div>
      )}
      <header className={cn("sticky top-0 z-50 transition-all duration-500", scrolled ? "py-2" : "py-4")}>
        <div className="container-x">
          <nav
            className={cn(
              "flex items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-500",
              scrolled ? "glass bg-ink-900/70 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)]" : "bg-transparent",
            )}
          >
            <Link href="/" className="group flex items-center gap-2.5">
              <motion.div
                whileHover={{ rotate: [0, -15, 15, 0], scale: 1.1 }}
                className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan shadow-[0_0_25px_rgba(139,92,246,0.6)]"
              >
                <Gamepad2 className="h-5 w-5 text-white" />
              </motion.div>
              <div className="leading-none">
                <div className="font-display text-lg font-bold tracking-wider text-white">
                  GAME<span className="text-neon-cyan">LOVER</span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Çorum</div>
              </div>
            </Link>

            <div className="hidden items-center gap-1 lg:flex">
              {NAV.map((n) => {
                const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
                return (
                  <Link key={n.href} href={n.href} className="relative px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:text-white">
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-lg bg-white/10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative">{n.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <Link href="/sepet" className="relative grid h-10 w-10 place-items-center rounded-xl glass hover:bg-white/10" aria-label="Sepet">
                <motion.div key={bump} animate={bump ? { scale: [1, 1.4, 1], rotate: [0, -12, 12, 0] } : {}} transition={{ duration: 0.5 }}>
                  <ShoppingBag className="h-5 w-5 text-white" />
                </motion.div>
                <AnimatePresence>
                  {count > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-neon-pink px-1 text-[10px] font-bold text-white shadow-[0_0_12px_#f472b6]"
                    >
                      {count}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
              <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl glass lg:hidden" aria-label="Menü">
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </nav>
        </div>
        <motion.div style={{ scaleX: scrollYProgress }} className="fixed left-0 right-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-neon-violet via-neon-cyan to-neon-pink" />
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] bg-ink-950/95 backdrop-blur-xl lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button onClick={() => setOpen(false)} className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-xl glass" aria-label="Kapat">
              <X />
            </button>
            <div className="flex h-full flex-col items-center justify-center gap-3">
              {NAV.map((n, i) => (
                <motion.div key={n.href} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Link href={n.href} onClick={() => setOpen(false)} className="font-display text-3xl font-bold text-white transition hover:text-neon-cyan">
                    {n.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
