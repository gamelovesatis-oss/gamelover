export type Vec = { x: number; y: number };

export const WORLD_W = 2800;
export const WORLD_H = 2100;
export const TRACK_W = 170;

// Saat yönünde kapalı pist kontrol noktaları (Catmull-Rom ile yumuşatılır).
const CONTROL: [number, number][] = [
  [400, 1400],
  [400, 700],
  [650, 330],
  [1100, 290],
  [1400, 560],
  [1720, 320],
  [2200, 320],
  [2470, 650],
  [2280, 1010],
  [1820, 1000],
  [1580, 1260],
  [1900, 1560],
  [1720, 1840],
  [920, 1840],
  [560, 1730],
];

export type Track = {
  pts: Vec[];
  cum: number[]; // noktaya kadar birikimli uzunluk
  total: number;
  boxes: Vec[];
};

function catmull(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
  const t2 = t * t,
    t3 = t2 * t;
  return {
    x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

export function buildTrack(): Track {
  const c = CONTROL.map(([x, y]) => ({ x, y }));
  const n = c.length;
  const pts: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = c[(i - 1 + n) % n],
      p1 = c[i],
      p2 = c[(i + 1) % n],
      p3 = c[(i + 2) % n];
    const seg = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(8, Math.round(seg / 16));
    for (let s = 0; s < steps; s++) pts.push(catmull(p0, p1, p2, p3, s / steps));
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = cum[cum.length - 1] + Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);

  // Soru kutuları: pist boyunca 6 sıra, her sırada 3 kutu.
  const boxes: Vec[] = [];
  for (let k = 1; k <= 6; k++) {
    const i = Math.floor((pts.length * k) / 7);
    const { nx, ny } = normalAt({ pts, cum, total, boxes }, i);
    for (const off of [-45, 0, 45]) boxes.push({ x: pts[i].x + nx * off, y: pts[i].y + ny * off });
  }
  return { pts, cum, total, boxes };
}

export function dirAt(t: Track, i: number) {
  const n = t.pts.length;
  const a = t.pts[(i - 2 + n) % n],
    b = t.pts[(i + 2) % n];
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { dx: (b.x - a.x) / d, dy: (b.y - a.y) / d };
}

export function normalAt(t: Track, i: number) {
  const { dx, dy } = dirAt(t, i);
  return { nx: -dy, ny: dx };
}

/** En yakın pist noktası. hint verilirse sadece çevresinde arar (hızlı). */
export function nearest(t: Track, x: number, y: number, hint = -1) {
  const n = t.pts.length;
  let best = 0,
    bd = Infinity;
  const scan = (i: number) => {
    const p = t.pts[i];
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  };
  if (hint < 0) for (let i = 0; i < n; i++) scan(i);
  else for (let k = -30; k <= 30; k++) scan((hint + k + n) % n);
  return { idx: best, dist: Math.sqrt(bd) };
}

/** Başlangıç çizgisinin arkasında ızgara pozisyonu. */
export function gridSlot(t: Track, slot: number) {
  const n = t.pts.length;
  const row = Math.floor(slot / 2);
  const i = (n - 3 - row * 4 + n * 4) % n;
  const { dx, dy } = dirAt(t, i);
  const side = slot % 2 === 0 ? -1 : 1;
  const p = t.pts[i];
  return { x: p.x - dy * side * 40, y: p.y + dx * side * 40, a: Math.atan2(dy, dx), idx: i };
}
