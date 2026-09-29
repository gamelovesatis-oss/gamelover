"use client";

import { useEffect, useRef } from "react";

export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const colors = ["#8b5cf6", "#22d3ee", "#f472b6", "#a3e635", "#fbbf24"];
    const ps = Array.from({ length: 180 }, () => ({
      x: c.width / 2,
      y: c.height / 2.5,
      vx: (Math.random() - 0.5) * 18,
      vy: Math.random() * -18 - 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      w: Math.random() * 8 + 4,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let raf = 0,
      t = 0;
    const tick = () => {
      t++;
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of ps) {
        p.vy += 0.4;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - t / 220);
        ctx.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2);
        ctx.restore();
      }
      if (t < 220) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-50" />;
}
