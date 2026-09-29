"use client";

import { useEffect } from "react";

export type Dir = "up" | "down" | "left" | "right";

const KEYMAP: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

/** Klavye yön tuşları + dokunmatik kaydırma. */
export function useDirections(target: React.RefObject<HTMLElement | null>, onDir: (d: Dir) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const d = KEYMAP[e.key];
      if (d) {
        e.preventDefault();
        onDir(d);
      }
    };
    let sx = 0,
      sy = 0;
    const el = target.current;
    const ts = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    const te = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      onDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    };
    const tm = (e: TouchEvent) => e.preventDefault();
    window.addEventListener("keydown", onKey);
    el?.addEventListener("touchstart", ts, { passive: true });
    el?.addEventListener("touchend", te, { passive: true });
    el?.addEventListener("touchmove", tm, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKey);
      el?.removeEventListener("touchstart", ts);
      el?.removeEventListener("touchend", te);
      el?.removeEventListener("touchmove", tm);
    };
  }, [target, onDir, enabled]);
}

/** Canvas'ı kapsayıcı genişliğine göre ölçekler; mantıksal boyut sabit kalır. */
export function setupCanvas(canvas: HTMLCanvasElement, w: number, h: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** İstemci koordinatını canvas mantıksal koordinatına çevirir. */
export function toLocal(canvas: HTMLCanvasElement, clientX: number, clientY: number, w: number, h: number) {
  const r = canvas.getBoundingClientRect();
  return { x: ((clientX - r.left) / r.width) * w, y: ((clientY - r.top) / r.height) * h };
}

export type GameProps = { onScore: (s: number) => void; onGameOver: (s: number) => void; runId: number };
