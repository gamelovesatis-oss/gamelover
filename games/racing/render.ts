import { CAR_TYPES, ITEM_INFO, LAPS, TEAM_COLOR, type Car } from "@/games/racing/engine";
import { WORLD_H, WORLD_W, type Track } from "@/games/racing/track";

export const VIEW_W = 960;
export const VIEW_H = 600;

export type Particle = { x: number; y: number; vx: number; vy: number; life: number; c: string; s: number };

/** Pisti bir kez ekran dışı tuvale çizer; her karede sadece kopyalanır. */
export function burst(parts: Particle[], x: number, y: number, c: string, n = 24) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2,
      s = Math.random() * 6 + 1;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, c, s: 3 + Math.random() * 3 });
  }
}

export function drawMinimap(g: CanvasRenderingContext2D, t: Track, cars: Car[], meId: string, top = false) {
  const w = 180,
    h = (w * WORLD_H) / WORLD_W;
  const x0 = VIEW_W - w - 14,
    y0 = top ? 100 : VIEW_H - h - 14; // mobilde sağ üstte (dokunmatik tuşların altında kalmasın)
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
