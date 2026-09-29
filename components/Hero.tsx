"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Gamepad2, Joystick, Sparkles, Trophy, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Fareye tepki veren bağlantılı parçacık ağı. */
function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let w = 0,
      h = 0,
      raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    const colors = ["#8b5cf6", "#22d3ee", "#f472b6"];
    type P = { x: number; y: number; vx: number; vy: number; r: number; c: string };
    let pts: P[] = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(110, Math.floor((w * h) / 12000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.8 + 0.6,
        c: colors[Math.floor(Math.random() * colors.length)],
      }));
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        const dx = p.x - mouse.x,
          dy = p.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < 140) {
          p.vx += (dx / d) * 0.06;
          p.vy += (dy / d) * 0.06;
        }
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.vx += (Math.random() - 0.5) * 0.02;
        p.vy += (Math.random() - 0.5) * 0.02;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.c;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i],
            b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 120) {
            ctx.strokeStyle = `rgba(139,92,246,${(1 - d / 120) * 0.35})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    resize();
    tick();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

/** Harfleri "şifre çözme" efektiyle yazan başlık. */
function Scramble({ text, className }: { text: string; className?: string }) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    const chars = "!<>-_\\/[]{}—=+*^?#01";
    let frame = 0;
    const total = text.length * 3 + 12;
    const t = setInterval(() => {
      frame++;
      setOut(
        text
          .split("")
          .map((c, i) => (c === " " || frame > i * 3 + 12 ? c : chars[Math.floor(Math.random() * chars.length)]))
          .join(""),
      );
      if (frame >= total) clearInterval(t);
    }, 35);
    return () => clearInterval(t);
  }, [text]);
  return <span className={className}>{out}</span>;
}

const floaters = [
  { Icon: Gamepad2, cls: "left-[8%] top-[22%] text-neon-violet", d: 0 },
  { Icon: Trophy, cls: "right-[10%] top-[18%] text-neon-amber", d: 1.2 },
  { Icon: Joystick, cls: "left-[14%] bottom-[18%] text-neon-cyan", d: 2.1 },
  { Icon: Zap, cls: "right-[16%] bottom-[24%] text-neon-pink", d: 0.6 },
];

export function Hero({ stats }: { stats: { products: number; events: number; campaigns: number } }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  return (
    <section ref={ref} className="relative -mt-24 flex min-h-[100svh] items-center overflow-hidden pt-24">
      <ParticleField />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#05040b_75%)]" />

      {floaters.map(({ Icon, cls, d }, i) => (
        <motion.div
          key={i}
          className={`pointer-events-none absolute hidden md:block ${cls}`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.8, scale: 1, y: [0, -20, 0], rotate: [0, 8, -8, 0] }}
          transition={{ opacity: { delay: 0.8 + d * 0.2 }, scale: { delay: 0.8 + d * 0.2, type: "spring" }, y: { duration: 5 + d, repeat: Infinity }, rotate: { duration: 7 + d, repeat: Infinity } }}
        >
          <div className="glass rounded-2xl p-4 shadow-[0_0_40px_-5px_currentColor]">
            <Icon className="h-8 w-8" />
          </div>
        </motion.div>
      ))}

      <motion.div style={{ y, opacity, scale }} className="container-x relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass mx-auto mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-slate-200 sm:text-sm"
        >
          <Sparkles className="h-4 w-4 text-neon-amber" />
          Çorum&apos;un en büyük oyun mağazası & oyun topluluğu
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-lime opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-lime" />
          </span>
        </motion.div>

        <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-[8.5rem]">
          <motion.span initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="block">
            <Scramble text="OYUNA" />
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="text-gradient block drop-shadow-[0_0_40px_rgba(139,92,246,0.5)]"
          >
            <Scramble text="AŞIK OL" />
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mx-auto mt-8 max-w-2xl text-base text-slate-300 sm:text-lg"
        >
          En yeni konsollar, efsane oyunlar, pro aksesuarlar ve Çorum&apos;un en heyecanlı turnuvaları. Üstelik sitemizde oyun oyna, rekor kır, <span className="font-semibold text-neon-cyan">indirim kazan</span>.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/urunler" className="btn-primary group px-8 py-4 text-base">
            Mağazayı Keşfet <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
          </Link>
          <Link href="/oyunlar" className="btn-ghost px-8 py-4 text-base">
            <Gamepad2 className="h-5 w-5 text-neon-cyan" /> Hemen Oyna
          </Link>
        </motion.div>

        <motion.div
          initial="h"
          animate="s"
          variants={{ s: { transition: { staggerChildren: 0.12, delayChildren: 1.1 } } }}
          className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-3"
        >
          {[
            { n: stats.products, l: "Ürün" },
            { n: stats.campaigns, l: "Aktif Kampanya" },
            { n: stats.events, l: "Yaklaşan Etkinlik" },
          ].map((s) => (
            <motion.div key={s.l} variants={{ h: { opacity: 0, y: 20 }, s: { opacity: 1, y: 0 } }} className="glass rounded-2xl px-3 py-4">
              <div className="font-display text-3xl font-bold text-white">{s.n}+</div>
              <div className="text-xs uppercase tracking-wider text-slate-400">{s.l}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 z-10 flex h-10 w-6 -translate-x-1/2 justify-center rounded-full border-2 border-white/30 pt-2"
      >
        <div className="h-2 w-1 rounded-full bg-white/70" />
      </motion.div>
    </section>
  );
}
