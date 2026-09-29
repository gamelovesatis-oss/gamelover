"use client";

import { useEffect, useRef } from "react";
import { setupCanvas, toLocal, type GameProps } from "@/games/hooks";

const W = 480;
const H = 640;

type Bullet = { x: number; y: number; vx?: number; vy: number; enemy?: boolean };
type Enemy = { x: number; y: number; vx: number; vy: number; hp: number; r: number; kind: number; cd: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; c: string };

export default function SpaceShooter({ onScore, onGameOver }: GameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const cb = useRef({ onScore, onGameOver });
  cb.current = { onScore, onGameOver };

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = setupCanvas(cv, W, H);
    const ship = { x: W / 2, y: H - 80, tx: W / 2, ty: H - 80, lives: 3, inv: 0 };
    const keys = new Set<string>();
    let bullets: Bullet[] = [];
    let enemies: Enemy[] = [];
    const sparks: Spark[] = [];
    const stars = Array.from({ length: 120 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 2 + 0.3 }));
    let score = 0,
      frame = 0,
      alive = true,
      raf = 0,
      power = 1;
    const colors = ["#f472b6", "#fbbf24", "#a3e635"];

    const boom = (x: number, y: number, c: string, n = 18) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2,
          s = Math.random() * 5 + 1;
        sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, c });
      }
    };

    const move = (e: PointerEvent) => {
      const p = toLocal(cv, e.clientX, e.clientY, W, H);
      ship.tx = p.x;
      ship.ty = Math.max(H * 0.45, p.y - 40);
    };
    const kd = (e: KeyboardEvent) => {
      if (e.key.startsWith("Arrow")) e.preventDefault();
      keys.add(e.key);
    };
    const ku = (e: KeyboardEvent) => keys.delete(e.key);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerdown", move);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    function loop() {
      if (!alive) return;
      frame++;
      const level = 1 + Math.floor(score / 1500);

      // hareket
      if (keys.has("ArrowLeft") || keys.has("a")) ship.tx -= 7;
      if (keys.has("ArrowRight") || keys.has("d")) ship.tx += 7;
      if (keys.has("ArrowUp") || keys.has("w")) ship.ty -= 7;
      if (keys.has("ArrowDown") || keys.has("s")) ship.ty += 7;
      ship.tx = Math.max(20, Math.min(W - 20, ship.tx));
      ship.ty = Math.max(H * 0.45, Math.min(H - 30, ship.ty));
      ship.x += (ship.tx - ship.x) * 0.2;
      ship.y += (ship.ty - ship.y) * 0.2;
      if (ship.inv > 0) ship.inv--;

      // ateş
      if (frame % 9 === 0) {
        bullets.push({ x: ship.x, y: ship.y - 20, vy: -10 });
        if (power > 1) {
          bullets.push({ x: ship.x - 14, y: ship.y - 8, vy: -10 });
          bullets.push({ x: ship.x + 14, y: ship.y - 8, vy: -10 });
        }
      }
      // düşman üret
      if (frame % Math.max(18, 55 - level * 5) === 0) {
        const kind = Math.random() < 0.2 + level * 0.04 ? 1 : 0;
        enemies.push({
          x: Math.random() * (W - 60) + 30,
          y: -30,
          vx: (Math.random() - 0.5) * (1 + level * 0.3),
          vy: 1.2 + Math.random() * 1.2 + level * 0.25,
          hp: kind ? 4 : 1,
          r: kind ? 24 : 15,
          kind,
          cd: 60 + Math.random() * 60,
        });
      }

      bullets = bullets.filter((b) => ((b.x += b.vx ?? 0), (b.y += b.vy), b.y > -20 && b.y < H + 20));
      for (const e of enemies) {
        // Gemiye doğru hafifçe yönel — yerinde durmak güvenli değil.
        e.vx += Math.sign(ship.x - e.x) * 0.025 * Math.min(level, 4);
        e.vx = Math.max(-3.5, Math.min(3.5, e.vx));
        e.x += e.vx;
        e.y += e.vy;
        if (e.x < e.r || e.x > W - e.r) e.vx *= -1;
        if (e.kind && --e.cd <= 0) {
          e.cd = 90;
          const dx = ship.x - e.x,
            dy = ship.y - e.y,
            d = Math.hypot(dx, dy) || 1;
          bullets.push({ x: e.x, y: e.y + e.r, vx: (dx / d) * 5, vy: Math.max(2, (dy / d) * 5), enemy: true });
        }
      }
      // çarpışmalar
      for (const b of bullets) {
        if (b.enemy) {
          if (ship.inv === 0 && Math.hypot(b.x - ship.x, b.y - ship.y) < 16) {
            b.y = 9999;
            hit();
          }
          continue;
        }
        for (const e of enemies) {
          if (e.hp > 0 && Math.hypot(b.x - e.x, b.y - e.y) < e.r) {
            b.y = -9999;
            e.hp--;
            boom(b.x, b.y, "#22d3ee", 3);
            if (e.hp <= 0) {
              score += e.kind ? 250 : 50;
              cb.current.onScore(score);
              boom(e.x, e.y, colors[e.kind], 26);
              if (e.kind && Math.random() < 0.5) power = 2;
            }
            break;
          }
        }
      }
      for (const e of enemies) {
        if (e.hp > 0 && ship.inv === 0 && Math.hypot(e.x - ship.x, e.y - ship.y) < e.r + 14) {
          e.hp = 0;
          boom(e.x, e.y, "#f472b6", 30);
          hit();
        }
      }
      enemies = enemies.filter((e) => e.hp > 0 && e.y < H + 40);

      draw();
      raf = requestAnimationFrame(loop);
    }

    function hit() {
      ship.lives--;
      ship.inv = 90;
      power = 1;
      boom(ship.x, ship.y, "#ffffff", 40);
      if (ship.lives <= 0) {
        alive = false;
        draw();
        setTimeout(() => cb.current.onGameOver(score), 400);
      }
    }

    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0b0720");
      g.addColorStop(1, "#05040b");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      for (const s of stars) {
        s.y += s.s * 1.5;
        if (s.y > H) (s.y = 0), (s.x = Math.random() * W);
        ctx.fillStyle = `rgba(255,255,255,${s.s / 2.5})`;
        ctx.fillRect(s.x, s.y, s.s, s.s * 2);
      }
      // mermiler
      for (const b of bullets) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = b.enemy ? "#f472b6" : "#22d3ee";
        ctx.fillStyle = b.enemy ? "#f472b6" : "#a5f3fc";
        ctx.fillRect(b.x - 2, b.y - 8, 4, 14);
      }
      // düşmanlar
      for (const e of enemies) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = colors[e.kind];
        ctx.fillStyle = colors[e.kind];
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(frame / 30);
        ctx.beginPath();
        const sides = e.kind ? 6 : 4;
        for (let i = 0; i < sides; i++) {
          const a = (i / sides) * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r);
        }
        ctx.closePath();
        ctx.globalAlpha = 0.25;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = colors[e.kind];
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }
      // gemi
      if (alive && (ship.inv === 0 || frame % 8 < 4)) {
        ctx.shadowBlur = 25;
        ctx.shadowColor = "#8b5cf6";
        ctx.fillStyle = "#c4b5fd";
        ctx.beginPath();
        ctx.moveTo(ship.x, ship.y - 22);
        ctx.lineTo(ship.x + 18, ship.y + 16);
        ctx.lineTo(ship.x, ship.y + 8);
        ctx.lineTo(ship.x - 18, ship.y + 16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = frame % 4 < 2 ? "#22d3ee" : "#f472b6";
        ctx.fillRect(ship.x - 4, ship.y + 10, 8, 8 + Math.random() * 8);
      }
      ctx.shadowBlur = 0;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= 0.025;
        if (p.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, 3, 3);
      }
      ctx.globalAlpha = 1;
      // can
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#f472b6";
      ctx.fillText("♥".repeat(Math.max(0, ship.lives)), 14, 28);
    }

    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerdown", move);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  return <canvas ref={canvas} className="mx-auto aspect-[3/4] w-full max-w-[480px] cursor-none touch-none rounded-2xl" />;
}
