"use client";

import { useEffect, useRef } from "react";
import { setupCanvas, toLocal, type GameProps } from "@/games/hooks";

const W = 480;
const H = 600;
const COLS = 8;
const ROW_COLORS = ["#f472b6", "#fb7185", "#fbbf24", "#a3e635", "#22d3ee", "#8b5cf6"];

export default function Breakout({ onScore, onGameOver }: GameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const cb = useRef({ onScore, onGameOver });
  cb.current = { onScore, onGameOver };

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = setupCanvas(cv, W, H);
    const paddle = { x: W / 2, w: 90, tx: W / 2 };
    let ball = { x: W / 2, y: H - 60, vx: 3.2, vy: -4.2, r: 7, stuck: true };
    let bricks: { x: number; y: number; w: number; h: number; c: string; hp: number }[] = [];
    let score = 0,
      lives = 3,
      level = 1,
      alive = true,
      raf = 0;
    const trail: { x: number; y: number }[] = [];
    const sparks: { x: number; y: number; vx: number; vy: number; life: number; c: string }[] = [];
    const keys = new Set<string>();

    function build() {
      bricks = [];
      const rows = Math.min(6, 3 + level);
      const bw = (W - 40) / COLS;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < COLS; c++)
          bricks.push({ x: 20 + c * bw + 3, y: 60 + r * 26, w: bw - 6, h: 18, c: ROW_COLORS[r % ROW_COLORS.length], hp: r < level - 1 ? 2 : 1 });
    }
    build();

    const move = (e: PointerEvent) => (paddle.tx = toLocal(cv, e.clientX, e.clientY, W, H).x);
    const launch = () => (ball.stuck = false);
    const kd = (e: KeyboardEvent) => {
      if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault();
      keys.add(e.key);
      if (e.key === " " || e.key === "ArrowUp") launch();
    };
    const ku = (e: KeyboardEvent) => keys.delete(e.key);
    cv.addEventListener("pointermove", move);
    const down = (e: PointerEvent) => {
      move(e);
      launch();
    };
    cv.addEventListener("pointerdown", down);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    function loop() {
      if (!alive) return;
      if (keys.has("ArrowLeft")) paddle.tx -= 9;
      if (keys.has("ArrowRight")) paddle.tx += 9;
      paddle.tx = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, paddle.tx));
      paddle.x += (paddle.tx - paddle.x) * 0.35;

      if (ball.stuck) {
        ball.x = paddle.x;
        ball.y = H - 48;
      } else {
        ball.x += ball.vx;
        ball.y += ball.vy;
        if (ball.x < ball.r || ball.x > W - ball.r) ball.vx *= -1;
        if (ball.y < ball.r) ball.vy = Math.abs(ball.vy);
        // raket
        if (ball.vy > 0 && ball.y > H - 44 && ball.y < H - 28 && Math.abs(ball.x - paddle.x) < paddle.w / 2 + ball.r) {
          const off = (ball.x - paddle.x) / (paddle.w / 2);
          const sp = Math.hypot(ball.vx, ball.vy);
          const ang = off * 1.05;
          ball.vx = sp * Math.sin(ang);
          ball.vy = -sp * Math.cos(ang);
        }
        // tuğlalar
        for (const b of bricks) {
          if (b.hp <= 0) continue;
          if (ball.x > b.x - ball.r && ball.x < b.x + b.w + ball.r && ball.y > b.y - ball.r && ball.y < b.y + b.h + ball.r) {
            const overlapX = Math.min(ball.x - (b.x - ball.r), b.x + b.w + ball.r - ball.x);
            const overlapY = Math.min(ball.y - (b.y - ball.r), b.y + b.h + ball.r - ball.y);
            if (overlapX < overlapY) ball.vx *= -1;
            else ball.vy *= -1;
            b.hp--;
            if (b.hp <= 0) {
              score += 20 * level;
              cb.current.onScore(score);
              for (let i = 0; i < 12; i++)
                sparks.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 1, c: b.c });
            }
            break;
          }
        }
        if (ball.y > H + 20) {
          lives--;
          if (lives <= 0) {
            alive = false;
            draw();
            setTimeout(() => cb.current.onGameOver(score), 300);
            return;
          }
          ball = { ...ball, vx: 3.2, vy: -4.2, stuck: true };
        }
        if (bricks.every((b) => b.hp <= 0)) {
          level++;
          score += 500;
          cb.current.onScore(score);
          const sp = 5.3 + level * 0.4;
          ball = { ...ball, vx: sp * 0.6, vy: -sp * 0.8, stuck: true };
          build();
        }
      }
      trail.push({ x: ball.x, y: ball.y });
      if (trail.length > 12) trail.shift();
      draw();
      raf = requestAnimationFrame(loop);
    }

    function draw() {
      ctx.fillStyle = "#07060d";
      ctx.fillRect(0, 0, W, H);
      for (const b of bricks) {
        if (b.hp <= 0) continue;
        ctx.shadowBlur = 14;
        ctx.shadowColor = b.c;
        ctx.fillStyle = b.c;
        ctx.globalAlpha = b.hp > 1 ? 1 : 0.85;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 5);
        ctx.fill();
        if (b.hp > 1) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      trail.forEach((t, i) => {
        ctx.fillStyle = `rgba(34,211,238,${(i / trail.length) * 0.4})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, ball.r * (i / trail.length), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#22d3ee";
      ctx.fillStyle = "#ecfeff";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = "#8b5cf6";
      const g = ctx.createLinearGradient(paddle.x - paddle.w / 2, 0, paddle.x + paddle.w / 2, 0);
      g.addColorStop(0, "#8b5cf6");
      g.addColorStop(1, "#22d3ee");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(paddle.x - paddle.w / 2, H - 40, paddle.w, 12, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.03;
        if (p.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, 3, 3);
      }
      ctx.globalAlpha = 1;
      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = "#f472b6";
      ctx.fillText("♥".repeat(Math.max(0, lives)), 14, 30);
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "right";
      ctx.fillText(`Seviye ${level}`, W - 14, 30);
      ctx.textAlign = "left";
      if (ball.stuck && alive) {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.textAlign = "center";
        ctx.fillText("Başlatmak için tıkla / Boşluk", W / 2, H / 2 + 60);
        ctx.textAlign = "left";
      }
    }

    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  return <canvas ref={canvas} className="mx-auto aspect-[4/5] w-full max-w-[480px] touch-none rounded-2xl" />;
}
