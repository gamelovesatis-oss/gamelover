import { dirAt, nearest, type Track } from "@/games/racing/track";

/** Yarış ayarları — tur sayısı oda sahibi tarafından yarış başında belirlenir. */
export type Mode = "herkes" | "takim" | "drift";
export const race: { laps: number; mode: Mode } = { laps: 4, mode: "herkes" };
export const LAP_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10];
export type Team = "kirmizi" | "mavi";
export type CarType = "hiz" | "tank" | "avci";
export type Item = "turbo" | "roket" | "yag" | "kalkan" | "simsek";

export const TEAM_COLOR: Record<Team, string> = { kirmizi: "#f43f5e", mavi: "#38bdf8" };
export const TEAM_NAME: Record<Team, string> = { kirmizi: "Kırmızı", mavi: "Mavi" };
/** Herkes Tek modunda her araca ayrı renk. */
export const FFA_COLORS = ["#f43f5e", "#38bdf8", "#a3e635", "#fbbf24", "#c084fc", "#fb923c", "#2dd4bf", "#f472b6"];
export const MODE_NAME: Record<Mode, string> = { herkes: "Herkes Tek", takim: "Takım", drift: "Drift" };

/** a ile b rakip mi? Herkes Tek modunda herkes herkese rakiptir. */
export const isRival = (a: { id: string; team: Team }, b: { id: string; team: Team }) =>
  race.mode !== "drift" && a.id !== b.id && (race.mode === "herkes" || a.team !== b.team);
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
  assistW: number; // sürüş yardımının devreye girme oranı (0..1)
  // Drift modu
  driftScore: number; // kasaya giren puan
  combo: number; // devam eden drift'in ham puanı
  comboTime: number; // kombonun süresi (kare)
  comboIdle: number; // drift bittikten sonra geçen süre (kare)
  lastBank: number; // son kasaya giren puan (arayüz bildirimi için)
  comboLost: boolean; // son karede kombo kırıldı mı
};

export type Missile = { id: string; owner: string; team: Team; x: number; y: number; a: number; target: string | null; until: number };
export type Oil = { id: string; owner: string; team: Team; x: number; y: number; until: number };
/** steer: -1..1 analog yön (telefonu eğerek sürüş); verilirse left/right yerine kullanılır. */
/** assist: sürüş yardımı (araç yolu kendisi takip etmeye çalışır, tutuş artar, duvarda kayar). */
export type Input = { up: boolean; down: boolean; left: boolean; right: boolean; steer?: number; assist?: boolean };

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
    assistW: 0,
    driftScore: 0,
    combo: 0,
    comboTime: 0,
    comboIdle: 0,
    lastBank: 0,
    comboLost: false,
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
    if (race.mode === "drift") return b.driftScore - a.driftScore; // drift: en çok puan kazanır
    if (a.finishMs != null && b.finishMs != null) return a.finishMs - b.finishMs;
    if (a.finishMs != null) return -1;
    if (b.finishMs != null) return 1;
    return progress(t, b) - progress(t, a);
  });
}

/** Tek bir aracı dt kadar ilerletir. Tur ve bitiş bilgisini günceller. */
export function stepCar(t: Track, c: Car, inp: Input, now: number, dt: number, raceMs: number) {
  const spec = CAR_TYPES[c.type];
  const { idx, dist } = nearest(t, c.x, c.y, c.idx);
  const offroad = dist > t.width / 2;
  const driftMode = race.mode === "drift";
  let steer = inp.steer ?? (inp.left ? -1 : 0) + (inp.right ? 1 : 0);
  const spinning = now < c.spinUntil;
  const oldSpeed = c.vx * Math.cos(c.a) + c.vy * Math.sin(c.a);

  // Hafif sürüş yardımı:
  //  - Oyuncu direksiyon verirken tamamen susar (çekişme/yalpalama olmaz).
  //  - Direksiyon bırakılınca yavaşça devreye girer ve sadece burnu yolun yönüne hizalar.
  //  - Yalnızca duvara çok yaklaşınca hafifçe içeri iter; yolun ortasına zorlamaz.
  let assistBrake = false;
  if (inp.assist && !spinning && driftMode && Math.abs(steer) < 0.08 && Math.hypot(c.vx, c.vy) > 2) {
    // Drift modu denge yardımı: direksiyon bırakılınca burnu gidiş yönüne ve yola çevirerek toparlar
    const n = t.pts.length;
    const tan = dirAt(t, (idx + 6) % n);
    let dv = Math.atan2(c.vy, c.vx) - c.a;
    let dt2 = Math.atan2(tan.dy, tan.dx) - c.a;
    while (dv > Math.PI) dv -= Math.PI * 2;
    while (dv < -Math.PI) dv += Math.PI * 2;
    while (dt2 > Math.PI) dt2 -= Math.PI * 2;
    while (dt2 < -Math.PI) dt2 += Math.PI * 2;
    if (Math.abs(dv) < 1.6) steer = Math.max(-0.5, Math.min(0.5, dv * 0.9 + dt2 * 0.5));
  }
  if (inp.assist && !spinning && oldSpeed > 2 && !driftMode) {
    const playerSteering = Math.abs(steer) > 0.08;
    c.assistW = playerSteering ? 0 : Math.min(1, c.assistW + 0.04 * dt);
    const n = t.pts.length;
    const tan = dirAt(t, (idx + Math.round(4 + oldSpeed * 0.8)) % n);
    let diff = Math.atan2(tan.dy, tan.dx) - c.a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    // Kenara yakınsa içeri doğru küçük bir düzeltme
    const p = t.pts[idx];
    const side = (c.x - p.x) * -tan.dy + (c.y - p.y) * tan.dx; // + : yolun sağı
    const edge = Math.max(0, Math.abs(side) - t.width * 0.32) / (t.width * 0.2);
    diff -= Math.sign(side) * Math.min(0.35, edge * 0.35);
    const auto = Math.max(-0.45, Math.min(0.45, diff * 1.1));
    if (!playerSteering) steer = auto * c.assistW;
    // Keskin viraj yaklaşıyorsa hafifçe yavaşla
    const far = dirAt(t, (idx + Math.round(6 + oldSpeed * 4)) % n);
    const dot = tan.dx * far.dx + tan.dy * far.dy;
    assistBrake = dot < 0.55 && oldSpeed > 6.5 + dot * 3;
  }

  // 1) Önce yön değişir; hız dünyada sabit kalır → yeni yöne göre yana kayma oluşur.
  const oldFwd = c.vx * Math.cos(c.a) + c.vy * Math.sin(c.a);
  if (spinning) c.a += 0.28 * dt;
  else {
    // Gerçek araçlar gibi: düşük hızda dönüş yavaş (minimum dönüş yarıçapı), yana kayarken dönüş sönümlenir.
    // Böylece tam direksiyonda yerinde fırıl fırıl dönmez.
    const speedK = Math.min(1, Math.abs(oldFwd) / 6);
    const slideK = 1 - Math.min(0.55, c.drift / 9);
    c.a += steer * spec.turn * dt * speedK * slideK * Math.sign(oldFwd || 1);
  }
  const fx = Math.cos(c.a),
    fy = Math.sin(c.a);
  let fwd = c.vx * fx + c.vy * fy;
  let lat = -c.vx * fy + c.vy * fx;

  if (spinning) {
    fwd *= Math.pow(0.93, dt);
    lat *= Math.pow(0.9, dt);
  } else {
    let max = spec.max * c.skill;
    if (now < c.boostUntil) max *= 1.5;
    if (now < c.slowUntil) max *= 0.55;
    if (offroad) max *= 0.5;
    const handbrake = driftMode && inp.down && fwd > 4; // drift modunda hızlıyken FREN = el freni
    if (inp.up && assistBrake) fwd -= 0.14 * dt;
    else if (inp.up) fwd += spec.acc * (now < c.boostUntil ? 1.8 : 1) * dt;
    else if (handbrake) fwd -= 0.08 * dt;
    else if (inp.down) fwd -= (fwd > 0 ? 0.35 : 0.12) * dt;
    else fwd *= Math.pow(0.985, dt);
    if (fwd > max) fwd = Math.max(max, fwd - 0.25 * dt); // turbo bitince yavaşça düş
    fwd = Math.max(-3, fwd);
    // 2) Lastik tutuşu yana kaymayı söndürür (drift modunda daha az)
    let grip = spec.grip - (Math.abs(steer) > 0.4 && Math.abs(fwd) > 6 ? 0.04 : 0);
    if (inp.assist) grip += 0.025; // yardımda araç biraz daha az kayar
    if (driftMode) grip = handbrake ? 0.965 : grip + 0.02;
    lat *= Math.pow(Math.min(0.98, grip), dt);
  }
  c.drift = Math.abs(lat);
  c.vx = fx * fwd - fy * lat;
  c.vy = fy * fwd + fx * lat;
  c.x += c.vx * dt;
  c.y += c.vy * dt;

  // Duvar: pistin çok dışına çıkmayı engelle
  const limit = t.wall;
  const n2 = nearest(t, c.x, c.y, idx);
  const hitWall = n2.dist > limit;
  if (hitWall) {
    const p = t.pts[n2.idx];
    const ox = (c.x - p.x) / n2.dist,
      oy = (c.y - p.y) / n2.dist;
    c.x = p.x + ox * limit;
    c.y = p.y + oy * limit;
    const out = c.vx * ox + c.vy * oy;
    // Yardım açıkken duvar boyunca kayar; kapalıyken seker
    const bounce = inp.assist ? 1.05 : 1.6;
    if (out > 0) {
      c.vx -= ox * out * bounce;
      c.vy -= oy * out * bounce;
    }
    const keep = inp.assist ? 0.95 : 0.85;
    c.vx *= keep;
    c.vy *= keep;
    if (inp.assist) {
      // Burnu yol yönüne çevir
      const { dx, dy } = dirAt(t, n2.idx);
      let dd = Math.atan2(dy, dx) - c.a;
      while (dd > Math.PI) dd -= Math.PI * 2;
      while (dd < -Math.PI) dd += Math.PI * 2;
      if (Math.abs(dd) < Math.PI / 2) c.a += dd * 0.25;
    }
  }

  updateLap(t, c, n2.idx, raceMs);
  // Duvara çarpmak komboyu kırar; pistin dışındayken (çim) puan birikmez.
  if (race.mode === "drift") scoreDrift(c, dt, now, hitWall, n2.dist > t.width / 2 + 20);
}

/** Drift puanlama: kayma × hız biriktirilir, süre uzadıkça çarpan artar; duvar/çim/savrulma komboyu kırar. */
export const comboMult = (c: Car) => 1 + Math.min(4, Math.floor(c.comboTime / 90));
function scoreDrift(c: Car, dt: number, now: number, crash: boolean, onGrass: boolean) {
  c.comboLost = false;
  if (c.finishMs != null || c.quitAt != null) return;
  if (c.combo > 0 && (crash || now < c.spinUntil)) {
    c.combo = 0;
    c.comboTime = 0;
    c.comboIdle = 0;
    c.comboLost = true;
    return;
  }
  const speed = Math.hypot(c.vx, c.vy);
  if (c.drift > 1.2 && speed > 4 && !onGrass) {
    c.combo += c.drift * speed * 0.18 * dt;
    c.comboTime += dt;
    c.comboIdle = 0;
  } else if (c.combo > 0) {
    c.comboIdle += dt;
    if (c.comboIdle > 36) {
      const pts = Math.round(c.combo * comboMult(c));
      c.driftScore += pts;
      c.lastBank = pts;
      c.combo = 0;
      c.comboTime = 0;
      c.comboIdle = 0;
    }
  }
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
  if (race.mode === "drift" && Math.abs(diff) > 0.3 && speed > 6.5)
    // Drift modunda botlar virajlara el freniyle kayarak girer
    return { up: false, down: true, left: diff < -0.06, right: diff > 0.06 };
  // İleride keskin viraj varsa önceden yavaşla
  const cur = dirAt(t, c.idx),
    ahead = dirAt(t, (c.idx + Math.round(6 + speed * 4)) % n);
  const dot = cur.dx * ahead.dx + cur.dy * ahead.dy;
  const sharp = (Math.abs(diff) > 0.55 && speed > 7) || (dot < 0.6 && speed > 6 + dot * 4);
  return { up: !sharp || speed < 3, down: sharp, left: diff < -0.06, right: diff > 0.06 };
}

export const isStraight = (t: Track, c: Car) => {
  const n = t.pts.length;
  const a = dirAt(t, c.idx),
    b = dirAt(t, (c.idx + 25) % n);
  return a.dx * b.dx + a.dy * b.dy > 0.95;
};
