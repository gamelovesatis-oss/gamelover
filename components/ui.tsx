"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Gamepad2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Görsel yüklenemezse neon gradyan yer tutucu gösterir. */
export function SmartImage({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // Görsel hidrasyondan önce yüklendiyse onLoad tetiklenmez; burada yakalıyoruz.
  useEffect(() => {
    const el = img.current;
    if (el?.complete) {
      if (el.naturalWidth > 0) setLoaded(true);
      else setFailed(true);
    }
  }, [src]);
  if (failed)
    return (
      <div className={cn("flex items-center justify-center bg-gradient-to-br from-neon-violet/40 via-ink-800 to-neon-cyan/30", className)}>
        <Gamepad2 className="h-1/3 w-1/3 max-h-24 max-w-24 text-white/40" />
      </div>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={img}
      src={src!}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={cn("object-cover transition-all duration-700", loaded ? "scale-100 opacity-100 blur-0" : "scale-105 opacity-0 blur-md", className)}
    />
  );
}

/** Kaydırınca yumuşakça beliren blok. */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 40,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Fareyi takip eden 3B eğim + parıltı efekti. */
export function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [10, -10]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-10, 10]), { stiffness: 200, damping: 18 });
  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);
  const shine = useTransform([gx, gy], ([x, y]) => `radial-gradient(400px circle at ${x} ${y}, rgba(255,255,255,0.13), transparent 45%)`);
  const [hover, setHover] = useState(false);

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        mx.set(0.5);
        my.set(0.5);
      }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={cn("relative", className)}
    >
      {children}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{ opacity: hover ? 1 : 0, background: shine }}
      />
    </motion.div>
  );
}

/** Geri sayım sayacı. */
export function Countdown({ to, compact = false }: { to: string; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return <div className={compact ? "h-6" : "h-16"} />;
  const diff = Math.max(0, new Date(to).getTime() - now);
  const parts = [
    { v: Math.floor(diff / 864e5), l: "Gün" },
    { v: Math.floor((diff / 36e5) % 24), l: "Saat" },
    { v: Math.floor((diff / 6e4) % 60), l: "Dk" },
    { v: Math.floor((diff / 1e3) % 60), l: "Sn" },
  ];
  if (compact)
    return (
      <span className="font-display tabular-nums tracking-wider">
        {parts.map((p) => String(p.v).padStart(2, "0")).join(" : ")}
      </span>
    );
  return (
    <div className="flex gap-2">
      {parts.map((p) => (
        <div key={p.l} className="glass min-w-[58px] rounded-xl px-2 py-2 text-center">
          <motion.div
            key={p.v}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="font-display text-xl font-bold tabular-nums text-white"
          >
            {String(p.v).padStart(2, "0")}
          </motion.div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400">{p.l}</div>
        </div>
      ))}
    </div>
  );
}

export function SectionTitle({ kicker, title, sub, center }: { kicker: string; title: React.ReactNode; sub?: string; center?: boolean }) {
  return (
    <Reveal className={cn("mb-10", center && "text-center")}>
      <div className={cn("mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-neon-cyan", center && "justify-center")}>
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-neon-cyan" />
        {kicker}
      </div>
      <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-5xl">{title}</h2>
      {sub && <p className={cn("mt-4 max-w-2xl text-slate-400", center && "mx-auto")}>{sub}</p>}
    </Reveal>
  );
}

/** Tüm sayfanın arkasında yavaşça süzülen neon bulutlar. */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-40 -top-40 h-[520px] w-[520px] animate-blob rounded-full bg-neon-violet/25 blur-[120px]" />
      <div className="absolute -right-40 top-1/3 h-[480px] w-[480px] animate-blob rounded-full bg-neon-cyan/15 blur-[120px] [animation-delay:-6s]" />
      <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] animate-blob rounded-full bg-neon-pink/15 blur-[120px] [animation-delay:-12s]" />
      <div className="grid-bg absolute inset-0" />
    </div>
  );
}

/** Fareyi takip eden yumuşak ışık halkası (sadece masaüstü). */
export function CursorGlow() {
  const x = useMotionValue(-500);
  const y = useMotionValue(-500);
  const sx = useSpring(x, { stiffness: 120, damping: 20 });
  const sy = useSpring(y, { stiffness: 120, damping: 20 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX - 200);
      y.set(e.clientY - 200);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [x, y]);
  return (
    <motion.div
      aria-hidden
      style={{ x: sx, y: sy }}
      className="pointer-events-none fixed left-0 top-0 z-0 hidden h-[400px] w-[400px] rounded-full bg-neon-violet/10 blur-3xl md:block"
    />
  );
}
