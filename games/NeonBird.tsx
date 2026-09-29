"use client";

import { useEffect, useRef } from "react";
import { setupCanvas, type GameProps } from "@/games/hooks";

const W = 420;
const H = 620;
const GAP = 165;

export default function NeonBird({ onScore, onGameOver }: GameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const cb = useRef({ onScore, onGameOver });
  cb.current = { onScore, onGameOver };

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = setupCanvas(cv, W, H);
    const bird = { x: 110, y: H / 2, vy: 0 };
    let pipes: { x: number; top: number; passed: boolean }[] = [];
    let started = false,
      alive = true,
      score = 0,
      frame = 0,
      raf = 0;
    const city = Array.from({ length: 22 }, (_, i) => ({ x: i * 24, h: 40 + Math.random() * 110 }));

    const flap = () => {
      if (!alive) return;
      started = true;
      bird.vy = -7.4;
    };
    const kd = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    cv.addEventListener("pointerdown", flap);
    window.addEventListener("keydown", kd);

    function loop() {
      frame++;
      if (started && alive) {
        bird.vy += 0.42;
        bird.y += bird.vy;
        const speed = 2.6 + Math.min(score, 40) * 0.04;
        if (frame % 95 === 0 || pipes.length === 0) pipes.push({ x: W + 20, top: 70 + Math.random() * (H - GAP - 190), passed: false });
        pipes = pipes.filter((p) => ((p.x -= speed), p.x > -80));
        for (const p of pipes) {
          if (!p.passed && p.x + 60 < bird.x) {
            p.passed = true;
            score++;
            cb.current.onScore(score);
          }
          if (bird.x + 14 > p.x && bird.x - 14 < p.x + 60 && (bird.y - 12 < p.top || bird.y + 12 > p.top + GAP)) die();
        }
        if (bird.y > H - 40 || bird.y < -30) die();
        city.forEach((b) => {
          b.x -= speed * 0.3;
          if (b.x < -24) b.x += 22 * 24;
        });
      } else if (!started) {
        bird.y = H / 2 + Math.sin(frame / 15) * 10;
      }
      draw();
      if (alive || bird.y < H) raf = requestAnimationFrame(loop);
    }

    function die() {
      if (!alive) return;
      alive = false;
      setTimeout(() => cb.current.onGameOver(score), 500);
    }

    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#1e1b4b");
      g.addColorStop(0.6, "#3b0764");
      g.addColorStop(1, "#831843");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // güneş
      ctx.fillStyle = "rgba(251,191,36,0.25)";
      ctx.beginPath();
      ctx.arc(W / 2, H - 140, 110, 0, Math.PI * 2);
      ctx.fill();
      // şehir
      ctx.fillStyle = "#0b0720";
      city.forEach((b) => ctx.fillRect(b.x, H - 40 - b.h, 22, b.h));
      // borular
      for (const p of pipes) {
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#22d3ee";
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 3;
        ctx.fillStyle = "rgba(34,211,238,0.12)";
        ctx.fillRect(p.x, -5, 60, p.top + 5);
        ctx.strokeRect(p.x, -5, 60, p.top + 5);
        ctx.fillRect(p.x, p.top + GAP, 60, H);
        ctx.strokeRect(p.x, p.top + GAP, 60, H);
      }
      // zemin
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#05040b";
      ctx.fillRect(0, H - 40, W, 40);
      ctx.strokeStyle = "#f472b6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, H - 40);
      ctx.lineTo(W, H - 40);
      ctx.stroke();
      // kuş
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(Math.max(-0.5, Math.min(1.2, bird.vy / 10)));
      ctx.shadowBlur = 25;
      ctx.shadowColor = "#fbbf24";
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f472b6";
      ctx.beginPath();
      ctx.moveTo(12, -2);
      ctx.lineTo(22, 2);
      ctx.lineTo(12, 6);
      ctx.fill();
      ctx.fillStyle = "#05040b";
      ctx.beginPath();
      ctx.arc(6, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.ellipse(-4, 2 + (frame % 10 < 5 ? -4 : 3), 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
      // skor
      ctx.textAlign = "center";
      ctx.font = "bold 54px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(String(score), W / 2, 90);
      if (!started) {
        ctx.font = "bold 18px sans-serif";
        ctx.fillText("Başlamak için dokun / Boşluk", W / 2, H / 2 + 70);
      }
      ctx.textAlign = "left";
    }

    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      bird.y = H + 1;
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointerdown", flap);
      window.removeEventListener("keydown", kd);
    };
  }, []);

  return <canvas ref={canvas} className="mx-auto aspect-[42/62] w-full max-w-[420px] touch-none rounded-2xl" />;
}
