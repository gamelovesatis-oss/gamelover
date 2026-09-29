import { CAR_TYPES, ITEM_INFO, LAPS, TEAM_COLOR, type Car, type Missile, type Oil } from "@/games/racing/engine";
import { TRACK_W, WORLD_H, WORLD_W, dirAt, type Track } from "@/games/racing/track";

export const VIEW_W = 960;
export const VIEW_H = 600;

export type Particle = { x: number; y: number; vx: number; vy: number; life: number; c: string; s: number };

/** Pisti bir kez ekran dışı tuvale çizer; her karede sadece kopyalanır. */
export function renderTrack(t: Track) {
  const cv = document.createElement("canvas");
  cv.width = WORLD_W;
  cv.height = WORLD_H;
  const g = cv.getContext("2d")!;

  const bg = g.createRadialGradient(WORLD_W / 2, WORLD_H / 2, 200, WORLD_W / 2, WORLD_H / 2, WORLD_W * 0.7);
  bg.addColorStop(0, "#0f0b24");
  bg.addColorStop(1, "#05040b");
  g.fillStyle = bg;
  g.fillRect(0, 0, WORLD_W, WORLD_H);
  g.fillStyle = "rgba(139,92,246,0.18)";
  for (let x = 0; x < WORLD_W; x += 60) for (let y = 0; y < WORLD_H; y += 60) g.fillRect(x, y, 2, 2);

  const path = () => {
    g.beginPath();
    t.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.closePath();
  };
  g.lineJoin = "round";
  g.lineCap = "round";

  // Dış parıltı
  path();
  g.shadowBlur = 40;
  g.shadowColor = "#8b5cf6";
  g.strokeStyle = "#8b5cf6";
  g.lineWidth = TRACK_W + 26;
  g.stroke();
  g.shadowBlur = 0;
  // Bordür
  path();
  g.strokeStyle = "#22d3ee";
  g.lineWidth = TRACK_W + 12;
  g.stroke();
  // Asfalt
  path();
  g.strokeStyle = "#171330";
  g.lineWidth = TRACK_W;
  g.stroke();
  // Doku
  path();
  g.strokeStyle = "rgba(255,255,255,0.025)";
  g.lineWidth = TRACK_W - 40;
  g.stroke();
  // Orta çizgi
  path();
  g.setLineDash([26, 26]);
  g.strokeStyle = "rgba(255,255,255,0.18)";
  g.lineWidth = 3;
  g.stroke();
  g.setLineDash([]);

  // Bordür şeritleri (virajlarda kırmızı-beyaz)
  for (let i = 0; i < t.pts.length; i += 3) {
    const a = dirAt(t, i),
      b = dirAt(t, (i + 6) % t.pts.length);
    if (a.dx * b.dx + a.dy * b.dy > 0.985) continue;
    const p = t.pts[i];
    for (const side of [-1, 1]) {
      g.fillStyle = Math.floor(i / 3) % 2 ? "#f43f5e" : "#f8fafc";
      g.beginPath();
      g.arc(p.x - a.dy * side * (TRACK_W / 2 + 2), p.y + a.dx * side * (TRACK_W / 2 + 2), 5, 0, Math.PI * 2);
      g.fill();
    }
  }

  // Başlangıç / bitiş çizgisi (damalı)
  const p0 = t.pts[0];
  const d0 = dirAt(t, 0);
  g.save();
  g.translate(p0.x, p0.y);
  g.rotate(Math.atan2(d0.dy, d0.dx));
  const sq = 14;
  for (let r = 0; r < 2; r++)
    for (let k = -TRACK_W / 2; k < TRACK_W / 2; k += sq) {
      g.fillStyle = (Math.floor(k / sq) + r) % 2 ? "#fff" : "#111";
      g.fillRect(r * sq - sq, k, sq, sq);
    }
  g.restore();

  // Kalıcı fren izleri bu katmana çizilir
  return cv;
}

export function drawSkid(track: HTMLCanvasElement, c: Car) {
  const g = track.getContext("2d")!;
  g.fillStyle = "rgba(0,0,0,0.35)";
  const bx = Math.cos(c.a),
    by = Math.sin(c.a);
  for (const s of [-1, 1]) g.fillRect(c.x - bx * 14 - by * 9 * s - 1.5, c.y - by * 14 + bx * 9 * s - 1.5, 3, 3);
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

export function drawCar(g: CanvasRenderingContext2D, c: Car, now: number, isMe: boolean) {
  const col = TEAM_COLOR[c.team];
  g.save();
  g.translate(c.x, c.y);

  if (now < c.shieldUntil) {
    g.strokeStyle = `rgba(34,211,238,${0.6 + Math.sin(now / 80) * 0.3})`;
    g.lineWidth = 3;
    g.shadowBlur = 20;
    g.shadowColor = "#22d3ee";
    g.beginPath();
    g.arc(0, 0, 30, 0, Math.PI * 2);
    g.stroke();
  }
  g.rotate(c.a);

  if (now < c.boostUntil) {
    for (let i = 0; i < 3; i++) {
      g.fillStyle = i % 2 ? "#fbbf24" : "#f472b6";
      g.globalAlpha = 0.7;
      g.beginPath();
      g.moveTo(-18, -6);
      g.lineTo(-30 - Math.random() * 22, 0);
      g.lineTo(-18, 6);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  g.shadowBlur = isMe ? 26 : 16;
  g.shadowColor = col;
  // Tekerlekler
  g.fillStyle = "#0b0a12";
  for (const [x, y] of [
    [-12, -12],
    [8, -12],
    [-12, 8],
    [8, 8],
  ])
    g.fillRect(x, y, 9, 4);
  // Gövde
  const body = g.createLinearGradient(-18, 0, 20, 0);
  body.addColorStop(0, col);
  body.addColorStop(1, "#ffffff");
  g.fillStyle = body;
  if (c.type === "tank") roundRect(g, -19, -11, 38, 22, 5);
  else if (c.type === "avci") {
    g.beginPath();
    g.moveTo(21, 0);
    g.lineTo(6, -10);
    g.lineTo(-18, -10);
    g.lineTo(-18, 10);
    g.lineTo(6, 10);
    g.closePath();
  } else roundRect(g, -18, -9, 38, 18, 8);
  g.fill();
  g.shadowBlur = 0;
  // Cam
  g.fillStyle = "rgba(5,4,11,0.75)";
  roundRect(g, 0, -6, 9, 12, 3);
  g.fill();
  // Spoiler
  g.fillStyle = col;
  g.fillRect(-20, -10, 4, 20);
  g.restore();

  if (now < c.spinUntil) {
    g.fillStyle = "#fbbf24";
    g.font = "bold 18px sans-serif";
    g.textAlign = "center";
    g.fillText("💫", c.x, c.y - 30);
  }
  // İsim
  g.font = `${isMe ? "bold " : ""}12px sans-serif`;
  g.textAlign = "center";
  g.fillStyle = "rgba(0,0,0,0.6)";
  const w = g.measureText(c.name).width + 10;
  g.fillRect(c.x - w / 2, c.y - 44, w, 16);
  g.fillStyle = isMe ? "#fff" : col;
  g.fillText(c.name, c.x, c.y - 32);
  g.textAlign = "left";
}

export function drawWorldObjects(
  g: CanvasRenderingContext2D,
  t: Track,
  boxesAt: number[],
  missiles: Missile[],
  oils: Oil[],
  parts: Particle[],
  now: number,
) {
  // Soru kutuları
  t.boxes.forEach((b, i) => {
    if (now < boxesAt[i]) return;
    g.save();
    g.translate(b.x, b.y + Math.sin(now / 300 + i) * 3);
    g.rotate(now / 600 + i);
    g.shadowBlur = 18;
    g.shadowColor = "#f472b6";
    const grd = g.createLinearGradient(-12, -12, 12, 12);
    grd.addColorStop(0, "#f472b6");
    grd.addColorStop(1, "#8b5cf6");
    g.fillStyle = grd;
    g.fillRect(-12, -12, 24, 24);
    g.rotate(-(now / 600 + i));
    g.shadowBlur = 0;
    g.fillStyle = "#fff";
    g.font = "bold 16px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("?", 0, 1);
    g.restore();
  });
  g.textAlign = "left";
  g.textBaseline = "alphabetic";

  for (const o of oils) {
    g.fillStyle = "rgba(8,8,12,0.9)";
    g.beginPath();
    g.ellipse(o.x, o.y, 26, 18, 0.4, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = `hsla(${(now / 8) % 360},90%,60%,0.45)`;
    g.lineWidth = 2;
    g.stroke();
  }

  for (const m of missiles) {
    parts.push({ x: m.x, y: m.y, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, life: 1, c: "#fbbf24", s: 4 });
    g.save();
    g.translate(m.x, m.y);
    g.rotate(m.a);
    g.shadowBlur = 20;
    g.shadowColor = TEAM_COLOR[m.team];
    g.fillStyle = "#fff";
    g.beginPath();
    g.moveTo(14, 0);
    g.lineTo(-8, -6);
    g.lineTo(-8, 6);
    g.closePath();
    g.fill();
    g.restore();
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.035;
    if (p.life <= 0) {
      parts.splice(i, 1);
      continue;
    }
    g.globalAlpha = p.life;
    g.fillStyle = p.c;
    g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
  }
  g.globalAlpha = 1;
}

export function burst(parts: Particle[], x: number, y: number, c: string, n = 24) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2,
      s = Math.random() * 6 + 1;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, c, s: 3 + Math.random() * 3 });
  }
}

export function drawMinimap(g: CanvasRenderingContext2D, t: Track, cars: Car[], meId: string) {
  const w = 180,
    h = (w * WORLD_H) / WORLD_W;
  const x0 = VIEW_W - w - 14,
    y0 = VIEW_H - h - 14;
  const sx = w / WORLD_W,
    sy = h / WORLD_H;
  g.fillStyle = "rgba(5,4,11,0.7)";
  g.beginPath();
  g.roundRect(x0 - 6, y0 - 6, w + 12, h + 12, 10);
  g.fill();
  g.beginPath();
  t.pts.forEach((p, i) => (i ? g.lineTo(x0 + p.x * sx, y0 + p.y * sy) : g.moveTo(x0 + p.x * sx, y0 + p.y * sy)));
  g.closePath();
  g.strokeStyle = "rgba(139,92,246,0.8)";
  g.lineWidth = 5;
  g.stroke();
  for (const c of cars) {
    g.fillStyle = TEAM_COLOR[c.team];
    g.beginPath();
    g.arc(x0 + c.x * sx, y0 + c.y * sy, c.id === meId ? 5 : 3.5, 0, Math.PI * 2);
    g.fill();
    if (c.id === meId) {
      g.strokeStyle = "#fff";
      g.lineWidth = 2;
      g.stroke();
    }
  }
}

export function drawHud(g: CanvasRenderingContext2D, me: Car, rank: number, total: number, raceMs: number, now: number) {
  const panel = (x: number, y: number, w: number, h: number) => {
    g.fillStyle = "rgba(5,4,11,0.72)";
    g.beginPath();
    g.roundRect(x, y, w, h, 12);
    g.fill();
  };
  // Sıra
  panel(14, 14, 128, 70);
  g.fillStyle = rank === 0 ? "#fbbf24" : "#fff";
  g.font = "bold 40px sans-serif";
  const rw = g.measureText(`${rank + 1}`).width;
  g.fillText(`${rank + 1}`, 26, 62);
  g.font = "bold 16px sans-serif";
  g.fillStyle = "#94a3b8";
  g.fillText(`/ ${total}`, 26 + rw + 6, 62);
  // Tur ve zaman
  panel(150, 14, 150, 70);
  g.fillStyle = "#94a3b8";
  g.font = "11px sans-serif";
  g.fillText("TUR", 162, 34);
  g.fillText("SÜRE", 230, 34);
  g.fillStyle = "#fff";
  g.font = "bold 22px sans-serif";
  g.fillText(`${Math.min(Math.max(me.lap, 1), LAPS)}/${LAPS}`, 162, 64);
  g.font = "bold 16px monospace";
  g.fillText(fmtTime(raceMs), 230, 62);

  // Eşya kutusu
  panel(VIEW_W / 2 - 38, 14, 76, 76);
  g.strokeStyle = me.item ? "#f472b6" : "rgba(255,255,255,0.15)";
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(VIEW_W / 2 - 38, 14, 76, 76, 12);
  g.stroke();
  g.font = "38px sans-serif";
  g.textAlign = "center";
  if (me.item) g.fillText(ITEM_INFO[me.item].icon, VIEW_W / 2, 66);
  g.font = "10px sans-serif";
  g.fillStyle = "#94a3b8";
  g.fillText(me.item ? "BOŞLUK" : "EŞYA", VIEW_W / 2, 104);

  // Yetenek
  const spec = CAR_TYPES[me.type];
  const left = Math.max(0, me.abilityAt - now);
  const pct = 1 - left / spec.cd;
  panel(VIEW_W - 164, 14, 150, 70);
  g.textAlign = "left";
  g.fillStyle = "#94a3b8";
  g.font = "11px sans-serif";
  g.fillText(`YETENEK · ${spec.ability.toUpperCase()}`, VIEW_W - 152, 34);
  g.fillStyle = "rgba(255,255,255,0.1)";
  g.fillRect(VIEW_W - 152, 46, 126, 12);
  g.fillStyle = left ? "#8b5cf6" : "#a3e635";
  g.fillRect(VIEW_W - 152, 46, 126 * Math.min(1, pct), 12);
  g.fillStyle = "#fff";
  g.font = "bold 11px sans-serif";
  g.fillText(left ? `${(left / 1000).toFixed(1)} sn` : "HAZIR · E / Shift", VIEW_W - 152, 76);
  g.textAlign = "left";
}

export const fmtTime = (ms: number) => {
  const s = Math.max(0, ms) / 1000;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
};
