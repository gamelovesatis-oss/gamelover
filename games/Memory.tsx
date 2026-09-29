"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/games/hooks";

const ICONS = ["🎮", "🕹️", "👾", "🏆", "🚀", "🎧", "⚔️", "🐉"];

type Card = { id: number; icon: string; open: boolean; done: boolean };

const shuffle = () =>
  [...ICONS, ...ICONS]
    .map((icon, i) => ({ id: i, icon, open: false, done: false, k: Math.random() }))
    .sort((a, b) => a.k - b.k)
    .map(({ k: _k, ...c }) => c);

export default function Memory({ onScore, onGameOver }: GameProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const start = useRef(0);
  const cb = useRef({ onScore, onGameOver });
  cb.current = { onScore, onGameOver };

  useEffect(() => {
    setCards(shuffle());
    start.current = Date.now();
  }, []);

  function flip(idx: number) {
    if (lock || cards[idx].open || cards[idx].done) return;
    const next = cards.map((c, i) => (i === idx ? { ...c, open: true } : c));
    const opened = next.filter((c) => c.open && !c.done);
    setCards(next);
    if (opened.length < 2) return;

    const m = moves + 1;
    setMoves(m);
    const [a, b] = opened;
    if (a.icon === b.icon) {
      const done = next.map((c) => (c.icon === a.icon ? { ...c, done: true, open: false } : c));
      setCards(done);
      const pairs = done.filter((c) => c.done).length / 2;
      const secs = (Date.now() - start.current) / 1000;
      const score = Math.max(0, Math.round(pairs * 250 - m * 12 - secs * 2));
      cb.current.onScore(score);
      if (pairs === ICONS.length) setTimeout(() => cb.current.onGameOver(Math.max(score, 100)), 700);
    } else {
      setLock(true);
      setTimeout(() => {
        setCards((cs) => cs.map((c) => (c.done ? c : { ...c, open: false })));
        setLock(false);
      }, 750);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[460px]">
      <div className="mb-3 text-center text-sm text-slate-400">
        Hamle: <span className="font-bold text-white">{moves}</span>
      </div>
      <div className="grid grid-cols-4 gap-3" style={{ perspective: 900 }}>
        {cards.map((c, i) => (
          <motion.button
            key={c.id}
            onClick={() => flip(i)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{ rotateY: c.open || c.done ? 180 : 0 }}
            transition={{ duration: 0.45 }}
            className="relative aspect-square [transform-style:preserve-3d]"
          >
            <div className="absolute inset-0 grid place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-neon-violet/60 to-neon-cyan/40 text-2xl text-white/70 [backface-visibility:hidden]">
              ?
            </div>
            <div
              className={`absolute inset-0 grid place-items-center rounded-2xl text-4xl [backface-visibility:hidden] [transform:rotateY(180deg)] ${c.done ? "bg-neon-lime/20 shadow-[0_0_25px_rgba(163,230,53,0.5)]" : "bg-ink-700"}`}
            >
              {c.icon}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
