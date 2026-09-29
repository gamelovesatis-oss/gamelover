export type Vec = { x: number; y: number };
export type MapId = "arena" | "sehir";

export const WORLD_W = 2800;
export const WORLD_H = 2100;
/** Neon arena pist genişliği (geriye dönük uyumluluk için). */
export const TRACK_W = 170;

export const MAP_NAME: Record<MapId, string> = { arena: "Neon Arena", sehir: "Şehir" };

// ---------- Neon Arena: saat yönünde, Catmull-Rom ile yumuşatılan kapalı pist ----------
const ARENA: [number, number][] = [
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

// ---------- Şehir: sokak ızgarası üzerinde 90° köşeli rota ----------
/** Sokaklar her 400 birimde; bloklar arası cadde genişliği CITY_STREET. */
export const CITY_GRID = 400;
export const CITY_STREET = 210;
const CITY: [number, number][] = [
  [200, 1300], // başlangıç (düzlüğün ortası)
  [200, 600],
  [1000, 600],
  [1000, 200],
  [2200, 200],
  [2200, 1000],
  [2600, 1000],
  [2600, 1800],
  [1400, 1800],
  [1400, 1400],
  [600, 1400],
  [600, 1800],
  [200, 1800],
];

export type Track = {
  map: MapId;
  width: number; // yol genişliği
  wall: number; // merkezden duvara uzaklık
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

function smoothArena(): Vec[] {
  const c = ARENA.map(([x, y]) => ({ x, y }));
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
  return pts;
}

/** Köşeleri r yarıçaplı yaylarla yuvarlatılmış kapalı çokgen, ~16 birim aralıkla örneklenir. */
function filletLoop(raw: [number, number][], r: number): Vec[] {
  const v = raw.map(([x, y]) => ({ x, y }));
  const n = v.length;
  const out: Vec[] = [];
  const push = (p: Vec) => out.push(p);
  for (let i = 0; i < n; i++) {
    const a = v[(i - 1 + n) % n],
      p = v[i],
      b = v[(i + 1) % n];
    const d1 = { x: p.x - a.x, y: p.y - a.y },
      d2 = { x: b.x - p.x, y: b.y - p.y };
    const l1 = Math.hypot(d1.x, d1.y),
      l2 = Math.hypot(d2.x, d2.y);
    const u1 = { x: d1.x / l1, y: d1.y / l1 },
      u2 = { x: d2.x / l2, y: d2.y / l2 };
    const cross = u1.x * u2.y - u1.y * u2.x;
    if (Math.abs(cross) < 1e-3) {
      push(p); // düz devam (köşe değil)
      continue;
    }
    // Yayın başı/sonu ve merkezi
    const s = { x: p.x - u1.x * r, y: p.y - u1.y * r };
    const e = { x: p.x + u2.x * r, y: p.y + u2.y * r };
    const nrm = cross > 0 ? { x: -u1.y, y: u1.x } : { x: u1.y, y: -u1.x };
    const c = { x: s.x + nrm.x * r, y: s.y + nrm.y * r };
    const a0 = Math.atan2(s.y - c.y, s.x - c.x);
    let a1 = Math.atan2(e.y - c.y, e.x - c.x);
    if (cross > 0 && a1 < a0) a1 += Math.PI * 2;
    if (cross < 0 && a1 > a0) a1 -= Math.PI * 2;
    const steps = 10;
    for (let k = 0; k <= steps; k++) {
      const ang = a0 + ((a1 - a0) * k) / steps;
      push({ x: c.x + Math.cos(ang) * r, y: c.y + Math.sin(ang) * r });
    }
  }
  // Eşit aralıklı yeniden örnekleme
  const res: Vec[] = [];
  const STEP = 16;
  let carry = 0;
  for (let i = 0; i < out.length; i++) {
    const p = out[i],
      q = out[(i + 1) % out.length];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    let d = carry;
    while (d < len) {
      res.push({ x: p.x + ((q.x - p.x) * d) / len, y: p.y + ((q.y - p.y) * d) / len });
      d += STEP;
    }
    carry = d - len;
  }
  return res;
}

const cache = new Map<MapId, Track>();

export function buildTrack(map: MapId = "arena"): Track {
  const hit = cache.get(map);
  if (hit) return hit;
  const pts = map === "sehir" ? filletLoop(CITY, 140) : smoothArena();
  const width = map === "sehir" ? CITY_STREET - 20 : TRACK_W;
  const wall = map === "sehir" ? CITY_STREET / 2 - 4 : TRACK_W / 2 + 55;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = cum[cum.length - 1] + Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);

  const t: Track = { map, width, wall, pts, cum, total, boxes: [] };
  // Soru kutuları: pist boyunca 6 sıra, her sırada 3 kutu.
  for (let k = 1; k <= 6; k++) {
    const i = Math.floor((pts.length * k) / 7);
    const { nx, ny } = normalAt(t, i);
    for (const off of [-45, 0, 45]) t.boxes.push({ x: pts[i].x + nx * off, y: pts[i].y + ny * off });
  }
  cache.set(map, t);
  return t;
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

/** Pist üzerinde s uzunluğundaki nokta ve yön (trafik araçları için). */
export function pointAt(t: Track, s: number) {
  const L = ((s % t.total) + t.total) % t.total;
  let lo = 0,
    hi = t.cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (t.cum[mid] <= L) lo = mid;
    else hi = mid - 1;
  }
  const i = lo,
    j = (lo + 1) % t.pts.length;
  const segLen = (j === 0 ? t.total : t.cum[j]) - t.cum[i] || 1;
  const f = (L - t.cum[i]) / segLen;
  const p = t.pts[i],
    q = t.pts[j];
  return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f, idx: i, ...dirAt(t, i) };
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
