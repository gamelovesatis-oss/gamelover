import { TRACK_W, dirAt, nearest, type Track } from "@/games/racing/track";

/** Yarış ayarları — tur sayısı oda sahibi tarafından yarış başında belirlenir. */
export type Mode = "herkes" | "takim";
export const race: { laps: number; mode: Mode } = { laps: 4, mode: "herkes" };
export const LAP_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10];
export type Team = "kirmizi" | "mavi";
export type CarType = "hiz" | "tank" | "avci";
export type Item = "turbo" | "roket" | "yag" | "kalkan" | "simsek";

export const TEAM_COLOR: Record<Team, string> = { kirmizi: "#f43f5e", mavi: "#38bdf8" };
export const TEAM_NAME: Record<Team, string> = { kirmizi: "Kırmızı", mavi: "Mavi" };
/** Herkes Tek modunda her araca ayrı renk. */
export const FFA_COLORS = ["#f43f5e", "#38bdf8", "#a3e635", "#fbbf24", "#c084fc", "#fb923c", "#2dd4bf", "#f472b6"];
export const MODE_NAME: Record<Mode, string> = { herkes: "Herkes Tek", takim: "Takım" };

/** a ile b rakip mi? Herkes Tek modunda herkes herkese rakiptir. */
export const isRival = (a: { id: string; team: Team }, b: { id: string; team: Team }) =>
  a.id !== b.id && (race.mode === "herkes" || a.team !== b.team);
export const colorOf = (c: { team: Team; color?: string }) => c.color ?? TEAM_COLOR[c.team];

export const CAR_TYPES: Record<CarType, { name: string; ability: string; desc: string; max: number; acc: number; turn: number; grip: number; cd: number }> = {
  hiz: { name: "Yıldırım", ability: "Nitro", desc: "En hızlı araç. Yeteneği: anlık nitro.", max: 9.6, acc: 0.21, turn: 0.052, grip: 0.9, cd: 7000 },
  tank: { name: "Tank", ability: "Kalkan", desc: "Dayanıklı ve dengeli. Yeteneği: koruyucu kalkan.", max: 8.9, acc: 0.19, turn: 0.05, grip: 0.94, cd: 9000 },
  avci: { name: "Avcı", ability: "Roket", desc: "Çevik avcı. Yeteneği: güdümlü roket.", max: 9.1, acc: 0.2, turn: 0.06, grip: 0.88, cd: 9000 },
};

export const ITEM_INFO: Record<Item, { icon: string; name: string }> = {
  turbo: { icon: "🔥", name: "Turbo" },
  roket: { icon: "🚀", name: "Roket" },
  yag: { icon: "🛢️", name: "Yağ" },
  kalkan: { icon: "🛡️", name: "Kalkan" },
  simsek: { icon: "⚡", name: "Şimşek" },
};

export type Car = {
  id: string;
  name: string;
  team: Team;
  color?: string; // Herkes Tek modunda araca özel renk
  type: CarType;
  bot: boolean;
  skill: number; // botlar için 0.85–0.98
  lane: number; // botların şerit tercihi
  x: number;
  y: number;
  a: number;
  vx: number;
  vy: number;
  idx: number;
  lap: number;
  passedHalf: boolean;
  item: Item | null;
  boostUntil: number;
  shieldUntil: number;
  spinUntil: number;
  slowUntil: number;
  abilityAt: number; // yeteneğin tekrar hazır olacağı zaman
  finishMs: number | null;
  quitAt: number | null; // "Yarışı Bitir"e basış zamanı
  botUseAt: number;
  drift: number;
};

export type Missile = { id: string; owner: string; team: Team; x: number; y: number; a: number; target: string | null; until: number };
export type Oil = { id: string; owner: string; team: Team; x: number; y: number; until: number };
/** steer: -1..1 analog yön (telefonu eğerek sürüş); verilirse left/right yerine kullanılır. */
export type Input = { up: boolean; down: boolean; left: boolean; right: boolean; steer?: number };

export const uid = () => Math.random().toString(36).slice(2, 10);

export function makeCar(p: { id: string; name: string; team: Team; type: CarType; bot: boolean; skill?: number }, slot: { x: number; y: number; a: number; idx: number }): Car {
  return {
    ...p,
    skill: p.skill ?? 1,
    lane: (Math.random() - 0.5) * 70,
    x: slot.x,
    y: slot.y,
    a: slot.a,
    vx: 0,
    vy: 0,
    idx: slot.idx,
    lap: 0,
    passedHalf: true,
    item: null,
    boostUntil: 0,
    shieldUntil: 0,
    spinUntil: 0,
    slowUntil: 0,
    abilityAt: 0,
    finishMs: null,
    quitAt: null,
    botUseAt: 0,
    drift: 0,
  };
}

/** Yarıştaki ilerleme (sıralama için). */
export const progress = (t: Track, c: Car) => c.lap * t.total + t.cum[c.idx];

export function ranking(t: Track, cars: Car[]) {
  return [...cars].sort((a, b) => {
    if (a.quitAt != null || b.quitAt != null) {
      if (a.quitAt == null) return -1;
      if (b.quitAt == null) return 1;
      return b.quitAt - a.quitAt; // sonra bitiren, önce bitirenin önünde
    }
    if (a.finishMs != null && b.finishMs != null) return a.finishMs - b.finishMs;
    if (a.finishMs != null) return -1;
    if (b.finishMs != null) return 1;
    return progress(t, b) - progress(t, a);
  });
}

/** Tek bir aracı dt kadar ilerletir. Tur ve bitiş bilgisini günceller. */
export function stepCar(t: Track, c: Car, inp: Input, now: number, dt: number, raceMs: number) {
  const spec = CAR_TYPES[c.type];
  const fx = Math.cos(c.a),
    fy = Math.sin(c.a);
  let fwd = c.vx * fx + c.vy * fy;
  let lat = -c.vx * fy + c.vy * fx;

  const { idx, dist } = nearest(t, c.x, c.y, c.idx);
  const offroad = dist > TRACK_W / 2;

  if (now < c.spinUntil) {
    c.a += 0.28 * dt;
    fwd *= Math.pow(0.93, dt);
    lat *= Math.pow(0.9, dt);
  } else {
    const steer = inp.steer ?? (inp.left ? -1 : 0) + (inp.right ? 1 : 0);
    c.a += steer * spec.turn * dt * Math.min(1, Math.abs(fwd) / 2.5) * Math.sign(fwd || 1);
    let max = spec.max * c.skill;
    if (now < c.boostUntil) max *= 1.5;
    if (now < c.slowUntil) max *= 0.55;
    if (offroad) max *= 0.5;
    if (inp.up) fwd += spec.acc * (now < c.boostUntil ? 1.8 : 1) * dt;
    else if (inp.down) fwd -= (fwd > 0 ? 0.35 : 0.12) * dt;
    else fwd *= Math.pow(0.985, dt);
    if (fwd > max) fwd = Math.max(max, fwd - 0.25 * dt); // turbo bitince yavaşça düş
    fwd = Math.max(-3, fwd);
    lat *= Math.pow(spec.grip - (Math.abs(steer) > 0.4 && Math.abs(fwd) > 6 ? 0.06 : 0), dt);
  }
  c.drift = Math.abs(lat);
  const nfx = Math.cos(c.a),
    nfy = Math.sin(c.a);
  c.vx = nfx * fwd - nfy * lat;
  c.vy = nfy * fwd + nfx * lat;
  c.x += c.vx * dt;
  c.y += c.vy * dt;

  // Duvar: pistin çok dışına çıkmayı engelle
  const limit = TRACK_W / 2 + 55;
  const n2 = nearest(t, c.x, c.y, idx);
  if (n2.dist > limit) {
    const p = t.pts[n2.idx];
    const ox = (c.x - p.x) / n2.dist,
      oy = (c.y - p.y) / n2.dist;
    c.x = p.x + ox * limit;
    c.y = p.y + oy * limit;
    const out = c.vx * ox + c.vy * oy;
    if (out > 0) {
      c.vx -= ox * out * 1.6;
      c.vy -= oy * out * 1.6;
    }
    c.vx *= 0.85;
    c.vy *= 0.85;
  }

  updateLap(t, c, n2.idx, raceMs);
}

function updateLap(t: Track, c: Car, idx: number, raceMs: number) {
  const n = t.pts.length;
  const prev = c.idx;
  if (idx > n * 0.4 && idx < n * 0.6) c.passedHalf = true;
  if (prev > n * 0.8 && idx < n * 0.2 && c.passedHalf) {
    c.lap++;
    c.passedHalf = false;
    if (c.lap > race.laps && c.finishMs == null && c.quitAt == null) c.finishMs = raceMs;
  } else if (prev < n * 0.2 && idx > n * 0.8 && c.lap > 0 && c.finishMs == null) {
    c.lap--;
    c.passedHalf = true;
  }
  c.idx = idx;
}

/** Araçlar arası çarpışma — sadece kendi aracımızı iteriz. */
export function collideCars(c: Car, others: Car[]) {
  for (const o of others) {
    if (o === c) continue;
    const dx = c.x - o.x,
      dy = c.y - o.y;
    const d = Math.hypot(dx, dy);
    const min = c.type === "tank" ? 30 : 28;
    if (d > 0 && d < min) {
      const push = (min - d) / d;
      c.x += dx * push * 0.6;
      c.y += dy * push * 0.6;
      const heavy = c.type === "tank" ? 0.2 : 0.45;
      c.vx += (dx / d) * heavy;
      c.vy += (dy / d) * heavy;
    }
  }
}

/** Sıralamaya göre eşya — geridekilere daha güçlü eşyalar. */
export function rollItem(rank: number, total: number): Item {
  const back = total > 1 ? rank / (total - 1) : 0; // 0 = lider, 1 = sonuncu
  const bag: [Item, number][] = [
    ["turbo", 3 + back * 3],
    ["roket", 2 + back * 3],
    ["yag", 3 - back * 2],
    ["kalkan", 2.5 - back],
    ["simsek", back > 0.6 ? 1.5 * back : 0],
  ];
  let r = Math.random() * bag.reduce((s, [, w]) => s + w, 0);
  for (const [it, w] of bag) if ((r -= w) <= 0) return it;
  return "turbo";
}

/** Önündeki en yakın rakibi bulur (roket hedefi). */
export function findTarget(t: Track, c: Car, cars: Car[]) {
  const me = progress(t, c);
  let best: Car | null = null,
    bd = Infinity;
  for (const o of cars) {
    if (!isRival(c, o) || o.finishMs != null) continue;
    let d = progress(t, o) - me;
    if (d < -200) continue;
    if (d < 0) d = 50;
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  if (!best) {
    for (const o of cars) {
      if (!isRival(c, o)) continue;
      const d = Math.hypot(o.x - c.x, o.y - c.y);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
  }
  return best;
}

export function stepMissile(m: Missile, cars: Car[], dt: number) {
  const tg = m.target ? cars.find((c) => c.id === m.target) : null;
  if (tg) {
    const want = Math.atan2(tg.y - m.y, tg.x - m.x);
    let diff = want - m.a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    m.a += Math.max(-0.09, Math.min(0.09, diff)) * dt;
  }
  m.x += Math.cos(m.a) * 15 * dt;
  m.y += Math.sin(m.a) * 15 * dt;
}

/** Bot sürüşü: ileriye bakıp hedef noktaya yönelir. */
export function botInput(t: Track, c: Car): Input {
  const n = t.pts.length;
  const speed = Math.hypot(c.vx, c.vy);
  const look = Math.round(10 + speed * 1.6);
  const i = (c.idx + look) % n;
  const p = t.pts[i];
  const { dx, dy } = dirAt(t, i);
  const tx = p.x - dy * c.lane * 0.6,
    ty = p.y + dx * c.lane * 0.6;
  let diff = Math.atan2(ty - c.y, tx - c.x) - c.a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return { up: Math.abs(diff) < 1.1 || speed < 3, down: Math.abs(diff) > 1.1 && speed > 5, left: diff < -0.06, right: diff > 0.06 };
}

export const isStraight = (t: Track, c: Car) => {
  const n = t.pts.length;
  const a = dirAt(t, c.idx),
    b = dirAt(t, (c.idx + 25) % n);
  return a.dx * b.dx + a.dy * b.dy > 0.95;
};
