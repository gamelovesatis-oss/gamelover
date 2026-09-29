"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Crown, Gift, Loader2, Play, RotateCcw, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { GameMeta } from "@/games/registry";
import type { GameProps } from "@/games/hooks";
import { raceAudio } from "@/games/racing/audio";
import { enterFullscreenLandscape } from "@/games/racing/fullscreen";
import type { Score } from "@/lib/types";
import { cn } from "@/lib/utils";

const Loading = () => (
  <div className="grid aspect-square w-full place-items-center">
    <Loader2 className="h-8 w-8 animate-spin text-neon-cyan" />
  </div>
);

const COMPONENTS: Record<string, React.ComponentType<GameProps>> = {
  "neon-yaris": dynamic(() => import("@/games/NeonRacing"), { ssr: false, loading: Loading }),
  "neon-yilan": dynamic(() => import("@/games/Snake"), { ssr: false, loading: Loading }),
  "2048": dynamic(() => import("@/games/Game2048"), { ssr: false, loading: Loading }),
  "uzay-savasi": dynamic(() => import("@/games/SpaceShooter"), { ssr: false, loading: Loading }),
  "tugla-kirici": dynamic(() => import("@/games/Breakout"), { ssr: false, loading: Loading }),
  "neon-kus": dynamic(() => import("@/games/NeonBird"), { ssr: false, loading: Loading }),
  hafiza: dynamic(() => import("@/games/Memory"), { ssr: false, loading: Loading }),
};

const BEST_KEY = (slug: string) => `gl-best-${slug}`;

export function GameShell({
  game,
  rewardCode,
  rewardScore,
  initialScores,
}: {
  game: GameMeta;
  rewardCode: string | null;
  rewardScore: number;
  initialScores: Score[];
}) {
  const Game = COMPONENTS[game.slug];
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [scores, setScores] = useState(initialScores);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  // Ödül eşiği oyunun puan ölçeğine göre ayarlanır.
  const threshold = Math.max(1, Math.round(rewardScore * game.rewardFactor));

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(BEST_KEY(game.slug)) ?? 0));
      setName(localStorage.getItem("gl-player") ?? "");
    } catch {}
  }, [game.slug]);

  const onScore = useCallback((s: number) => setScore(s), []);
  const onGameOver = useCallback(
    (s: number) => {
      setScore(s);
      setPhase("over");
      setSaved(false);
      setBest((b) => {
        const nb = Math.max(b, s);
        try {
          localStorage.setItem(BEST_KEY(game.slug), String(nb));
        } catch {}
        return nb;
      });
    },
    [game.slug],
  );

  function start() {
    // Yarış oyunu: "OYNA" dokunuşuyla telefonda tam ekran + yatay, ses kilidini aç
    if (game.slug === "neon-yaris") {
      raceAudio().unlock();
      if (window.matchMedia("(pointer: coarse)").matches) enterFullscreenLandscape();
    }
    setScore(0);
    setRun((r) => r + 1);
    setPhase("playing");
  }

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      localStorage.setItem("gl-player", name.trim());
    } catch {}
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: game.slug, player: name.trim(), score }),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setScores(data.scores ?? scores);
      setSaved(true);
    }
    setSaving(false);
  }

  const won = rewardCode && score >= threshold;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="neon-border relative overflow-hidden rounded-3xl bg-ink-900/80 p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="glass rounded-xl px-4 py-2">
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Skor</div>
              <motion.div key={score} initial={{ scale: 1.3, color: "#22d3ee" }} animate={{ scale: 1, color: "#ffffff" }} className="font-display text-2xl font-bold tabular-nums">
                {score}
              </motion.div>
            </div>
            <div className="glass rounded-xl px-4 py-2">
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Rekorun</div>
              <div className="font-display text-2xl font-bold tabular-nums text-neon-amber">{best}</div>
            </div>
          </div>
          {phase === "playing" && (
            <button onClick={start} className="btn-ghost px-3 py-2" aria-label="Yeniden başlat">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative">
          {phase !== "ready" ? (
            <Game key={run} runId={run} onScore={onScore} onGameOver={onGameOver} />
          ) : (
            <div className={cn("relative mx-auto grid aspect-square w-full max-w-[480px] place-items-center overflow-hidden rounded-2xl bg-gradient-to-br", game.gradient)}>
              <div className="grid-bg absolute inset-0 opacity-60" />
              <div className="relative text-center">
                <motion.div animate={{ y: [0, -12, 0], rotate: [0, 6, -6, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-8xl drop-shadow-2xl">
                  {game.emoji}
                </motion.div>
                <button onClick={start} className="btn mt-8 bg-white px-10 py-4 text-lg text-ink-950 shadow-2xl hover:scale-105">
                  <Play className="h-5 w-5 fill-current" /> OYNA
                </button>
                <p className="mt-4 px-6 text-sm text-white/80">{game.controls}</p>
              </div>
            </div>
          )}

          <AnimatePresence>
            {phase === "over" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-ink-950/85 p-4 backdrop-blur-md"
              >
                <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 18 }} className="w-full max-w-sm text-center">
                  <div className="font-display text-sm uppercase tracking-[0.3em] text-neon-pink">Oyun Bitti</div>
                  <div className="my-2 font-display text-6xl font-bold text-white">{score}</div>
                  {score >= best && score > 0 && <div className="chip mx-auto mb-3 bg-neon-amber text-ink-950">🎉 Yeni rekor!</div>}

                  {won && (
                    <motion.div
                      initial={{ rotateX: 90 }}
                      animate={{ rotateX: 0 }}
                      transition={{ delay: 0.3 }}
                      className="my-4 rounded-2xl border border-neon-lime/40 bg-neon-lime/10 p-4"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-neon-lime">
                        <Gift className="h-4 w-4" /> İndirim kazandın!
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(rewardCode!);
                          setCopied(true);
                        }}
                        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-ink-950 px-4 py-2 font-display text-xl font-bold tracking-widest text-white"
                      >
                        {rewardCode} <Copy className="h-4 w-4 text-slate-400" />
                      </button>
                      <div className="mt-1 text-xs text-slate-400">{copied ? "Kopyalandı! Sepette kullan." : "Mağazada veya siparişinde kullan."}</div>
                    </motion.div>
                  )}
                  {!won && rewardCode && (
                    <p className="mb-4 text-sm text-slate-400">
                      <span className="text-neon-cyan">{threshold}</span> puana ulaş, indirim kodunu kazan!
                    </p>
                  )}

                  {!saved ? (
                    <div className="mt-2 flex gap-2">
                      <input value={name} onChange={(e) => setName(e.target.value.slice(0, 20))} placeholder="Oyuncu adın" className="input" maxLength={20} />
                      <button onClick={submit} disabled={saving || !name.trim() || score <= 0} className="btn-primary px-4">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-neon-lime">Skorun liderlik tablosuna kaydedildi!</p>
                  )}
                  <button onClick={start} className="btn-ghost mt-4 w-full">
                    <RotateCcw className="h-4 w-4" /> Tekrar Oyna
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <aside className="glass h-fit rounded-3xl p-6">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
          <Crown className="h-5 w-5 text-neon-amber" /> Çorum Liderleri
        </h3>
        {scores.length === 0 ? (
          <p className="text-sm text-slate-400">Henüz skor yok. İlk sen ol!</p>
        ) : (
          <ol className="space-y-2">
            {scores.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn("flex items-center gap-3 rounded-xl px-3 py-2", i === 0 ? "bg-neon-amber/15" : i < 3 ? "bg-white/5" : "")}
              >
                <span className={cn("grid h-7 w-7 place-items-center rounded-lg text-xs font-bold", i === 0 ? "bg-neon-amber text-ink-950" : i === 1 ? "bg-slate-300 text-ink-950" : i === 2 ? "bg-amber-700 text-white" : "bg-white/10 text-slate-300")}>
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm text-white">{s.player}</span>
                <span className="font-display text-sm font-bold tabular-nums text-neon-cyan">{s.score}</span>
              </motion.li>
            ))}
          </ol>
        )}
        {rewardCode && (
          <div className="mt-6 rounded-2xl border border-dashed border-neon-pink/40 p-4 text-sm text-slate-300">
            <Gift className="mb-2 h-5 w-5 text-neon-pink" />
            Bu oyunda <b className="text-white">{threshold}</b> puanı geçenler mağazada geçerli indirim kodu kazanır!
          </div>
        )}
      </aside>
    </div>
  );
}
