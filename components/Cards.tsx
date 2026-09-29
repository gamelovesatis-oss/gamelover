"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Copy, MapPin, Trophy, Users, Check, Clock } from "lucide-react";
import { useState } from "react";
import { ShareButtons } from "@/components/ShareButtons";
import { Countdown, SmartImage, TiltCard } from "@/components/ui";
import type { Campaign, GameEvent } from "@/lib/types";
import type { GameMeta } from "@/games/registry";
import { cn, trDate } from "@/lib/utils";

export function CampaignCard({ c, index = 0, large = false }: { c: Campaign; index?: number; large?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.article
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={cn("group neon-border relative overflow-hidden rounded-3xl bg-ink-800", large ? "min-h-[440px]" : "min-h-[380px]")}
    >
      <SmartImage src={c.image_url} alt={c.title} className="absolute inset-0 h-full w-full transition-transform duration-[1.5s] group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/10" />
      {c.badge && (
        <motion.div
          initial={{ rotate: -20, scale: 0 }}
          whileInView={{ rotate: -6, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", delay: 0.3 + index * 0.1 }}
          className="absolute right-5 top-5 rounded-2xl bg-gradient-to-br from-neon-pink to-rose-500 px-4 py-2 font-display text-lg font-bold text-white shadow-[0_0_30px_rgba(244,114,182,0.6)]"
        >
          {c.badge}
        </motion.div>
      )}
      <div className="relative flex h-full min-h-[inherit] flex-col justify-end p-6 sm:p-8">
        <h3 className={cn("font-display font-bold text-white", large ? "text-3xl sm:text-4xl" : "text-2xl")}>{c.title}</h3>
        <p className="mt-2 max-w-lg text-sm text-slate-300 sm:text-base">{c.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {c.code && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(c.code!);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-neon-cyan/60 bg-neon-cyan/10 px-4 py-2 font-display font-bold tracking-widest text-neon-cyan transition hover:bg-neon-cyan/20"
            >
              {c.code} {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          )}
          {c.ends_at && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Clock className="h-4 w-4 text-neon-amber" />
              <Countdown to={c.ends_at} compact />
            </div>
          )}
        </div>
        <ShareButtons url="/kampanyalar" text={`${c.title} — ${c.badge ?? ""} Game Lover Çorum`} className="mt-5" />
      </div>
    </motion.article>
  );
}

export function EventCard({ e, index = 0 }: { e: GameEvent; index?: number }) {
  const d = new Date(e.starts_at);
  return (
    <motion.article
      initial={{ opacity: 0, x: index % 2 ? 60 : -60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="group glass grid overflow-hidden rounded-3xl md:grid-cols-[280px_1fr] lg:grid-cols-[360px_1fr]"
    >
      <div className="relative h-56 overflow-hidden md:h-full">
        <SmartImage src={e.image_url} alt={e.title} className="h-full w-full transition-transform duration-1000 group-hover:scale-110" />
        <div className="absolute left-4 top-4 rounded-2xl bg-ink-950/80 px-4 py-2 text-center backdrop-blur">
          <div className="font-display text-3xl font-bold leading-none text-white">{d.toLocaleDateString("tr-TR", { day: "2-digit", timeZone: "Europe/Istanbul" })}</div>
          <div className="text-xs font-semibold uppercase tracking-wider text-neon-cyan">{d.toLocaleDateString("tr-TR", { month: "short", timeZone: "Europe/Istanbul" })}</div>
        </div>
      </div>
      <div className="flex flex-col gap-4 p-6 sm:p-8">
        <h3 className="font-display text-2xl font-bold text-white sm:text-3xl">{e.title}</h3>
        <p className="text-slate-300">{e.description}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-neon-violet" /> {trDate(e.starts_at)}
          </span>
          {e.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-neon-pink" /> {e.location}
            </span>
          )}
          {e.capacity && (
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-neon-cyan" /> {e.capacity} kişi
            </span>
          )}
        </div>
        {e.prize && (
          <div className="flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-neon-amber/20 to-transparent px-4 py-2 text-sm font-semibold text-neon-amber">
            <Trophy className="h-4 w-4" /> Ödül: {e.prize}
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4">
          <Countdown to={e.starts_at} />
          <div className="flex items-center gap-3">
            <ShareButtons url="/etkinlikler" text={`${e.title} — Game Lover Çorum`} />
            <a
              href={e.register_url || `/teklif?tur=etkinlik&etkinlik=${encodeURIComponent(e.title)}`}
              className="btn-primary"
              target={e.register_url ? "_blank" : undefined}
              rel="noopener noreferrer"
            >
              Kayıt Ol
            </a>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function GameCard({ g, index = 0 }: { g: GameMeta; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.07, type: "spring" }}
    >
      <TiltCard className="rounded-3xl">
        <Link href={`/oyunlar/${g.slug}`} className={cn("group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-gradient-to-br p-6", g.gradient)}>
          <div className="grid-bg absolute inset-0 opacity-50" />
          <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-white/20 blur-3xl transition-all duration-700 group-hover:scale-150" />
          <motion.div className="relative text-7xl drop-shadow-2xl transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-125">{g.emoji}</motion.div>
          <div className="absolute inset-x-6 bottom-6">
            <h3 className="font-display text-2xl font-bold text-white drop-shadow">{g.title}</h3>
            <p className="mt-1 text-sm text-white/85">{g.tagline}</p>
            <span className="mt-4 inline-flex translate-y-2 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink-950 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              ▶ Oyna
            </span>
          </div>
        </Link>
      </TiltCard>
    </motion.div>
  );
}
