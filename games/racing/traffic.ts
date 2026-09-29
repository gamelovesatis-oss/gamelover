import type { Car, CarType } from "@/games/racing/engine";
import { pointAt, type Track } from "@/games/racing/track";

/**
 * Şehir trafiği: rota boyunca kendi şeridinde sabit hızla ilerleyen araçlar.
 * Konum sadece yarış süresinden hesaplanır → her oyuncuda aynı (ağ trafiği gerekmez).
 */
/** Tüm istemcilerde aynı olmalı (fizik ve görüntü aynı araçları kullanır). */
export const TRAFFIC_COUNT = 10;

export type TrafficCar = { id: string; s0: number; speed: number; lane: number; color: string; type: CarType };

const COLORS = ["#e5e7eb", "#111827", "#9ca3af", "#1d4ed8", "#b91c1c", "#f5f5f4", "#374151", "#ca8a04", "#065f46", "#e5e7eb"];

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeTraffic(t: Track, count: number): TrafficCar[] {
  if (t.map !== "sehir") return [];
  const r = rng(1907); // her istemcide aynı dizilim
  const types: CarType[] = ["hiz", "tank", "tank", "avci"];
  return Array.from({ length: count }, (_, i) => ({
    id: `trafik-${i}`,
    // Başlangıç ızgarasından uzakta dağıt
    s0: 500 + ((t.total - 1100) * (i + r() * 0.6)) / count,
    speed: 2.6 + r() * 1.8, // birim/kare (yarışçılardan yavaş)
    lane: (r() < 0.5 ? -1 : 1) * (38 + r() * 14),
    color: COLORS[Math.floor(r() * COLORS.length)],
    type: types[Math.floor(r() * types.length)],
  }));
}

/** Yarış başladıktan ms sonra trafik aracının konumu ve yönü. */
export function trafficPose(t: Track, tc: TrafficCar, raceMs: number) {
  const s = tc.s0 + tc.speed * Math.max(0, raceMs) / 16.667;
  const p = pointAt(t, s);
  return { x: p.x - p.dy * tc.lane, y: p.y + p.dx * tc.lane, a: Math.atan2(p.dy, p.dx), speed: raceMs > 0 ? tc.speed : 0 };
}

/** Yarışçıyı trafik aracından it (trafik etkilenmez). Araç uzun olduğu için iki daireyle yaklaşılır. */
export function bumpTraffic(c: Car, pose: { x: number; y: number; a: number }) {
  const fx = Math.cos(pose.a),
    fy = Math.sin(pose.a);
  let hit = false;
  for (const off of [-12, 12]) {
    const ox = pose.x + fx * off,
      oy = pose.y + fy * off;
    const dx = c.x - ox,
      dy = c.y - oy;
    const d = Math.hypot(dx, dy);
    const min = 26;
    if (d > 0 && d < min) {
      const nx = dx / d,
        ny = dy / d;
      c.x = ox + nx * min;
      c.y = oy + ny * min;
      const into = c.vx * nx + c.vy * ny;
      if (into < 0) {
        c.vx -= nx * into * 1.3;
        c.vy -= ny * into * 1.3;
      }
      c.vx *= 0.9;
      c.vy *= 0.9;
      hit = true;
    }
  }
  return hit;
}
