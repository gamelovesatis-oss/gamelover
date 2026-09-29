"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDirections, type Dir, type GameProps } from "@/games/hooks";

type Tile = { id: number; v: number; r: number; c: number; merged?: boolean };
let uid = 1;

const COLORS: Record<number, string> = {
  2: "from-slate-600 to-slate-700 text-white",
  4: "from-slate-500 to-slate-600 text-white",
  8: "from-amber-500 to-orange-500 text-white",
  16: "from-orange-500 to-rose-500 text-white",
  32: "from-rose-500 to-pink-500 text-white",
  64: "from-pink-500 to-fuchsia-600 text-white",
  128: "from-violet-500 to-indigo-500 text-white shadow-[0_0_20px_#8b5cf6]",
  256: "from-indigo-500 to-cyan-500 text-white shadow-[0_0_25px_#22d3ee]",
  512: "from-cyan-400 to-teal-400 text-ink-950 shadow-[0_0_30px_#22d3ee]",
  1024: "from-lime-400 to-emerald-400 text-ink-950 shadow-[0_0_35px_#a3e635]",
  2048: "from-yellow-300 to-amber-400 text-ink-950 shadow-[0_0_45px_#fbbf24]",
};

function addRandom(tiles: Tile[]): Tile[] {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!tiles.some((t) => t.r === r && t.c === c)) empty.push([r, c]);
  if (!empty.length) return tiles;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  return [...tiles, { id: uid++, v: Math.random() < 0.9 ? 2 : 4, r, c }];
}

function move(tiles: Tile[], dir: Dir): { tiles: Tile[]; gained: number; moved: boolean } {
  let gained = 0;
  let moved = false;
  const out: Tile[] = [];
  for (let line = 0; line < 4; line++) {
    const cells = tiles
      .filter((t) => (dir === "left" || dir === "right" ? t.r === line : t.c === line))
      .sort((a, b) => {
        const ka = dir === "left" || dir === "right" ? a.c : a.r;
        const kb = dir === "left" || dir === "right" ? b.c : b.r;
        return dir === "left" || dir === "up" ? ka - kb : kb - ka;
      });
    let pos = 0;
    let prev: Tile | null = null;
    for (const t of cells) {
      if (prev && prev.v === t.v && !prev.merged) {
        prev.v *= 2;
        prev.merged = true;
        gained += prev.v;
        moved = true;
        continue;
      }
      const idx = dir === "left" || dir === "up" ? pos : 3 - pos;
      const nt: Tile = { ...t, merged: false, r: dir === "left" || dir === "right" ? line : idx, c: dir === "left" || dir === "right" ? idx : line };
      if (nt.r !== t.r || nt.c !== t.c) moved = true;
      out.push(nt);
      prev = nt;
      pos++;
    }
  }
  return { tiles: out.map((t) => ({ ...t, merged: false, id: t.merged ? uid++ : t.id })), gained, moved };
}

function canMove(tiles: Tile[]) {
  if (tiles.length < 16) return true;
  return tiles.some((t) => tiles.some((o) => o.v === t.v && Math.abs(o.r - t.r) + Math.abs(o.c - t.c) === 1));
}

export default function Game2048({ onScore, onGameOver }: GameProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const tilesRef = useRef<Tile[]>([]);
  const score = useRef(0);
  const over = useRef(false);
  const cb = useRef({ onScore, onGameOver });
  cb.current = { onScore, onGameOver };

  useEffect(() => {
    tilesRef.current = addRandom(addRandom([]));
    setTiles(tilesRef.current);
  }, []);

  const onDir = useCallback((d: Dir) => {
    if (over.current) return;
    const { tiles: moved, gained, moved: did } = move(tilesRef.current, d);
    if (!did) return;
    score.current += gained;
    const next = addRandom(moved);
    tilesRef.current = next;
    setTiles(next);
    cb.current.onScore(score.current);
    if (!canMove(next)) {
      over.current = true;
      setTimeout(() => cb.current.onGameOver(score.current), 600);
    }
  }, []);
  useDirections(wrap, onDir);

  return (
    <div ref={wrap} className="mx-auto w-full max-w-[440px] touch-none select-none">
      <div className="relative aspect-square w-full rounded-2xl bg-ink-800 p-2 shadow-inner">
        <div className="grid h-full grid-cols-4 grid-rows-4 gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white/[0.04]" />
          ))}
        </div>
        <div className="absolute inset-2">
          <AnimatePresence>
            {tiles.map((t) => (
              <motion.div
                key={t.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1, left: `${t.c * 25}%`, top: `${t.r * 25}%` }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="absolute h-1/4 w-1/4 p-1"
              >
                <div
                  className={`grid h-full w-full place-items-center rounded-xl bg-gradient-to-br font-display font-bold ${COLORS[t.v] ?? COLORS[2048]} ${t.v >= 1024 ? "text-xl sm:text-2xl" : t.v >= 128 ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"}`}
                >
                  {t.v}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
