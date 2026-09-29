"use client";

import { useCallback, useEffect, useRef } from "react";
import { setupCanvas, useDirections, type Dir, type GameProps } from "@/games/hooks";

const N = 20;
const S = 400;
const C = S / N;

export default function Snake({ onScore, onGameOver }: GameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const dirQueue = useRef<Dir[]>([]);
  const cb = useRef({ onScore, onGameOver });
  cb.current = { onScore, onGameOver };

  const onDir = useCallback((d: Dir) => {
    if (dirQueue.current.length < 3) dirQueue.current.push(d);
  }, []);
  useDirections(wrap, onDir);

  useEffect(() => {
    const ctx = setupCanvas(canvas.current!, S, S);
    let snake = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
    ];
    let dir: Dir = "right";
    let food = spawn();
    let score = 0;
    let speed = 130;
    let alive = true;
    let last = 0;
    let raf = 0;
    const particles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

    function spawn() {
      let f: { x: number; y: number };
      do f = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) };
      while (snake?.some((s) => s.x === f.x && s.y === f.y));
      return f;
    }

    const opposite: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

    function step() {
      const next = dirQueue.current.shift();
      if (next && next !== opposite[dir]) dir = next;
      const head = { ...snake[0] };
      if (dir === "up") head.y--;
      if (dir === "down") head.y++;
      if (dir === "left") head.x--;
      if (dir === "right") head.x++;
      if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || snake.some((s) => s.x === head.x && s.y === head.y)) {
        alive = false;
        cb.current.onGameOver(score);
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        speed = Math.max(55, speed - 3);
        cb.current.onScore(score);
        for (let i = 0; i < 14; i++)
          particles.push({ x: food.x * C + C / 2, y: food.y * C + C / 2, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 1 });
        food = spawn();
      } else snake.pop();
    }

    function draw(t: number) {
      ctx.fillStyle = "#07060d";
      ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = "rgba(139,92,246,0.08)";
      for (let i = 0; i <= N; i++) {
        ctx.beginPath();
        ctx.moveTo(i * C, 0);
        ctx.lineTo(i * C, S);
        ctx.moveTo(0, i * C);
        ctx.lineTo(S, i * C);
        ctx.stroke();
      }
      // yem
      const pulse = 3 + Math.sin(t / 150) * 2;
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#f472b6";
      ctx.fillStyle = "#f472b6";
      ctx.beginPath();
      ctx.arc(food.x * C + C / 2, food.y * C + C / 2, C / 2 - 4 + pulse / 2, 0, Math.PI * 2);
      ctx.fill();
      // yılan
      snake.forEach((s, i) => {
        const k = 1 - i / (snake.length + 4);
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = i === 0 ? 25 : 10;
        ctx.fillStyle = i === 0 ? "#a5f3fc" : `rgba(34,211,238,${0.35 + k * 0.65})`;
        const pad = i === 0 ? 1 : 2;
        ctx.beginPath();
        ctx.roundRect(s.x * C + pad, s.y * C + pad, C - pad * 2, C - pad * 2, 6);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        if (p.life <= 0) particles.splice(i, 1);
        else {
          ctx.fillStyle = `rgba(244,114,182,${p.life})`;
          ctx.fillRect(p.x, p.y, 3, 3);
        }
      }
    }

    function loop(t: number) {
      if (!alive) return;
      if (t - last > speed) {
        last = t;
        step();
      }
      draw(t);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={wrap} className="mx-auto w-full max-w-[480px] touch-none">
      <canvas ref={canvas} className="aspect-square w-full rounded-2xl" />
      <div className="mt-4 grid grid-cols-3 gap-2 sm:hidden">
        <span />
        <PadBtn onClick={() => onDir("up")}>▲</PadBtn>
        <span />
        <PadBtn onClick={() => onDir("left")}>◀</PadBtn>
        <PadBtn onClick={() => onDir("down")}>▼</PadBtn>
        <PadBtn onClick={() => onDir("right")}>▶</PadBtn>
      </div>
    </div>
  );
}

function PadBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onPointerDown={onClick} className="glass rounded-xl py-4 text-xl text-white active:bg-neon-cyan/30">
      {children}
    </button>
  );
}
