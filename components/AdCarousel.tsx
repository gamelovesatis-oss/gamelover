"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { SmartImage } from "@/components/ui";
import type { Ad } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Yönetim panelinden eklenen reklam/banner'ları sinematik slayt olarak gösterir. */
export function AdCarousel({ ads, className }: { ads: Ad[]; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (ads.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % ads.length), 6000);
    return () => clearInterval(t);
  }, [ads.length]);
  if (!ads.length) return null;
  const ad = ads[i];
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    ad.link_url ? (
      <Link href={ad.link_url} className="block h-full">
        {children}
      </Link>
    ) : (
      <>{children}</>
    );

  return (
    <div className={cn("neon-border relative h-[340px] overflow-hidden rounded-[2rem] sm:h-[420px]", className)}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={ad.id}
          initial={{ opacity: 0, scale: 1.12 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <Wrapper>
            <SmartImage src={ad.image_url} alt={ad.title} className="h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/60 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-xl px-8 sm:px-14">
                <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="chip bg-neon-pink/90 text-white">
                  Reklam
                </motion.span>
                <motion.h3
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.7 }}
                  className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:text-5xl"
                >
                  {ad.title}
                </motion.h3>
                {ad.subtitle && (
                  <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-3 text-slate-300 sm:text-lg">
                    {ad.subtitle}
                  </motion.p>
                )}
                {ad.link_url && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="btn-primary mt-6">
                    İncele <ArrowRight className="h-4 w-4" />
                  </motion.span>
                )}
              </div>
            </div>
          </Wrapper>
        </motion.div>
      </AnimatePresence>
      {ads.length > 1 && (
        <div className="absolute bottom-5 left-8 z-10 flex gap-2 sm:left-14">
          {ads.map((a, k) => (
            <button
              key={a.id}
              onClick={() => setI(k)}
              aria-label={`Reklam ${k + 1}`}
              className={cn("h-1.5 rounded-full transition-all duration-500", k === i ? "w-10 bg-neon-cyan" : "w-4 bg-white/30 hover:bg-white/60")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="relative -rotate-2 overflow-hidden border-y border-white/10 bg-gradient-to-r from-neon-violet/20 via-neon-pink/20 to-neon-cyan/20 py-4">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-10 font-display text-xl font-bold uppercase tracking-wider text-white sm:text-2xl">
            {t}
            <span className="text-neon-cyan">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
