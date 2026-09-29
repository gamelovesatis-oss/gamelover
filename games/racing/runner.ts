"use client";

import {
  CAR_TYPES,
  race,
  colorOf,
  isRival,
  FFA_COLORS,
  botInput,
  collideCars,
  findTarget,
  isStraight,
  makeCar,
  progress,
  ranking,
  rollItem,
  stepCar,
  stepMissile,
  uid,
  type Car,
  type CarType,
  type Input,
  type Item,
  type Missile,
  type Oil,
  type Team,
  type Mode,
} from "@/games/racing/engine";
import type { RaceNet } from "@/games/racing/net";
import { VIEW_H, VIEW_W, burst, drawHud, drawMinimap, fmtTime, type Particle } from "@/games/racing/render";
import { raceAudio } from "@/games/racing/audio";
import { Scene3D } from "@/games/racing/scene3d";
import { buildTrack, gridSlot } from "@/games/racing/track";

export type RosterEntry = { id: string; name: string; team: Team; type: CarType; bot: boolean; skill?: number };
export type RaceResult = {
  order: { id: string; name: string; team: Team; color: string; bot: boolean; finishMs: number | null; quit: boolean }[];
  teamPoints: Record<Team, number>;
  myRank: number;
  myTeam: Team;
  mode: Mode;
  myFinishMs: number | null;
};
/** steer: telefon eğimi (-1..1), null ise eğim yok. hasItem: arayüzün eşya butonunu göstermesi için. */
export type TouchInput = Omit<Input, "steer"> & { item: boolean; ability: boolean; steer: number | null; hasItem: boolean };

export const POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
const ITEMS: Item[] = ["turbo", "roket", "yag", "kalkan", "simsek"];
const track = buildTrack();

export function runRace(opts: {
  canvas: HTMLCanvasElement; // HUD katmanı (2D)
  glCanvas: HTMLCanvasElement; // 3D sahne
  net: RaceNet;
  roster: RosterEntry[];
  meId: string;
  touch: { current: TouchInput };
  laps: number;
  mode: Mode;
  onEnd: (r: RaceResult) => void;
}) {
  const { canvas, glCanvas, net, roster, meId, touch, onEnd } = opts;
  race.laps = opts.laps;
  race.mode = opts.mode;
  const sfx = raceAudio();
  sfx.startMusic();
  sfx.startEngine();
  let lastCount = 99;
  const near = (x: number, y: number) => Math.max(0, 1 - Math.hypot(x - me.x, y - me.y) / 700);
  const hq = !window.matchMedia("(pointer: coarse)").matches;
  const dpr = hq ? Math.min(window.devicePixelRatio || 1, 2) : 1.25;
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  const g = canvas.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cars: Car[] = roster.map((r, i) => makeCar(r, gridSlot(track, i)));
  if (race.mode === "herkes") cars.forEach((c, i) => (c.color = FFA_COLORS[i % FFA_COLORS.length]));
  const byId = new Map(cars.map((c) => [c.id, c]));
  const me = byId.get(meId)!;
  const targets = new Map<string, { x: number; y: number; a: number; vx: number; vy: number }>();
  const boxesAt = track.boxes.map(() => 0);
  let missiles: (Missile & { until: number })[] = [];
  let oils: Oil[] = [];
  const parts: Particle[] = [];
  const keys = new Set<string>();
  const owned = (c: Car) => c.id === meId || (c.bot && net.isHost);

  const startAt = performance.now() + 3600;
  let last = performance.now();
  let lastSend = 0;
  let raf = 0;
  let ended = false;
  let reported = false;
  let firstFinishAt: number | null = null;
  const scene = new Scene3D(glCanvas, track, cars, meId, hq);
  const ro = new ResizeObserver(() => scene.resize());
  ro.observe(glCanvas);
  let pressedItem = false,
    pressedAbility = false;
  let toast: { text: string; until: number } | null = null;
  const say = (text: string, ms = 1600) => (toast = { text, until: performance.now() + ms });

  // ---------- Ağ olayları ----------
  net.on("s", (p: { c: (string | number)[][] }) => {
    const now = performance.now();
    for (const e of p.c) {
      const c = byId.get(e[0] as string);
      if (!c || owned(c)) continue;
      const [, x, y, a, vx, vy, lap, idx, fin, sh, sp, bo, sl] = e as number[];
      targets.set(c.id, { x, y, a, vx, vy });
      c.lap = lap;
      c.idx = idx;
      c.finishMs = fin >= 0 ? fin : null;
      c.shieldUntil = now + sh;
      c.spinUntil = now + sp;
      c.boostUntil = now + bo;
      c.slowUntil = now + sl;
    }
  });
  net.on("box", (p: { i: number; ttl: number }) => (boxesAt[p.i] = performance.now() + p.ttl));
  net.on("m", (m: Missile & { ttl: number }) => missiles.push({ ...m, until: performance.now() + m.ttl }));
  net.on("mx", (p: { id: string; x: number; y: number; shield: boolean }) => {
    missiles = missiles.filter((m) => m.id !== p.id);
    burst(parts, p.x, p.y, p.shield ? "#22d3ee" : "#fbbf24", 34);
    const v = near(p.x, p.y);
    if (v > 0) sfx.explosion(v);
  });
  net.on("oil", (o: Oil & { ttl: number }) => oils.push({ ...o, until: performance.now() + o.ttl }));
  net.on("ox", (p: { id: string }) => (oils = oils.filter((o) => o.id !== p.id)));
  net.on("zap", (p: { owner: string; team: Team; ttl: number }) => {
    const now = performance.now();
    const src = { id: p.owner, team: p.team };
    for (const c of cars) if (isRival(src, c) && now > c.shieldUntil) c.slowUntil = now + p.ttl;
    sfx.zap();
    if (isRival(src, me)) say("⚡ Şimşek çarptı! Yavaşladın", 2000);
    else say("⚡ Rakipler yavaşladı!", 1500);
  });
  net.on("end", (r: { order: string[] }) => finish(r.order));
  net.on("quit", (p: { id: string; at: number }) => {
    const c = byId.get(p.id);
    if (!c || c.quitAt != null) return;
    c.quitAt = p.at;
    if (c !== me) say(`🏳️ ${c.name} yarışı bitirdi`);
  });

  // ---------- Eşya ve yetenekler ----------
  const now0 = () => performance.now();
  function fire(c: Car) {
    const t = findTarget(track, c, cars);
    const m = { id: uid(), owner: c.id, team: c.team, x: c.x + Math.cos(c.a) * 30, y: c.y + Math.sin(c.a) * 30, a: c.a, target: t?.id ?? null, ttl: 3500 };
    net.sendAll("m", m);
    if (c === me && t) say(`🚀 Hedef: ${t.name}`);
  }
  function useItem(c: Car) {
    const it = c.item;
    if (!it) return;
    c.item = null;
    const now = now0();
    if (c === me) {
      if (it === "turbo") sfx.turbo();
      else if (it === "kalkan") sfx.shield();
      else if (it === "roket") sfx.missile();
      else if (it === "yag") sfx.explosion(0.25);
    }
    if (it === "turbo") c.boostUntil = now + 1600;
    else if (it === "kalkan") c.shieldUntil = now + 4500;
    else if (it === "roket") fire(c);
    else if (it === "yag") net.sendAll("oil", { id: uid(), owner: c.id, team: c.team, x: c.x - Math.cos(c.a) * 42, y: c.y - Math.sin(c.a) * 42, ttl: 20000 });
    else if (it === "simsek") net.sendAll("zap", { owner: c.id, team: c.team, ttl: 2600 });
  }
  function useAbility(c: Car) {
    const now = now0();
    if (now < c.abilityAt || now < c.spinUntil) return;
    c.abilityAt = now + CAR_TYPES[c.type].cd;
    if (c === me) (c.type === "hiz" ? sfx.turbo() : c.type === "tank" ? sfx.shield() : sfx.missile());
    if (c.type === "hiz") {
      c.boostUntil = now + 1100;
      burst(parts, c.x, c.y, "#fbbf24", 16);
    } else if (c.type === "tank") c.shieldUntil = now + 3200;
    else fire(c);
  }
  function hit(c: Car, x: number, y: number) {
    const now = now0();
    if (now < c.shieldUntil) {
      c.shieldUntil = 0;
      return true;
    }
    c.spinUntil = now + 1300;
    c.vx *= 0.2;
    c.vy *= 0.2;
    burst(parts, x, y, colorOf(c), 20);
    if (c === me) say("💥 Vuruldun!");
    return false;
  }

  function botThink(c: Car, now: number) {
    if (c.item && now > c.botUseAt) {
      c.botUseAt = now + 1200 + Math.random() * 2500;
      const behind = cars.some((o) => isRival(c, o) && progress(track, c) - progress(track, o) > 0 && progress(track, c) - progress(track, o) < 350);
      const ahead = findTarget(track, c, cars);
      if (
        c.item === "simsek" ||
        (c.item === "roket" && ahead && progress(track, ahead) - progress(track, c) < 1400) ||
        (c.item === "yag" && behind) ||
        (c.item === "turbo" && isStraight(track, c)) ||
        (c.item === "kalkan" && (missiles.some((m) => m.target === c.id) || Math.random() < 0.3))
      )
        useItem(c);
    }
    if (now >= c.abilityAt && Math.random() < 0.01) {
      if (c.type === "hiz" && !isStraight(track, c)) return;
      if (c.type === "tank" && !missiles.some((m) => m.target === c.id) && Math.random() < 0.7) return;
      useAbility(c);
    }
  }

  // ---------- Klavye ----------
  const kd = (e: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    keys.add(e.key.toLowerCase());
  };
  const ku = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);

  function myInput(): Input {
    const k = (...n: string[]) => n.some((x) => keys.has(x));
    const t = touch.current;
    const keySteer = (k("arrowleft", "a") || t.left ? -1 : 0) + (k("arrowright", "d") || t.right ? 1 : 0);
    const down = k("arrowdown", "s") || t.down;
    return {
      up: (k("arrowup", "w") || t.up) && !down,
      down,
      left: false,
      right: false,
      steer: Math.max(-1, Math.min(1, keySteer + (t.steer ?? 0))),
    };
  }

  // ---------- Bitiş ----------
  function finish(orderIds?: string[]) {
    if (ended) return;
    ended = true;
    report(orderIds ? orderIds.map((id) => byId.get(id)!).filter(Boolean) : ranking(track, cars), 1200);
  }

  /** Sonucu arayüze bir kez bildirir. */
  function report(order: Car[], delay: number) {
    if (reported) return;
    reported = true;
    const teamPoints: Record<Team, number> = { kirmizi: 0, mavi: 0 };
    order.forEach((c, i) => (teamPoints[c.team] += POINTS[i] ?? 0));
    setTimeout(
      () =>
        onEnd({
          order: order.map((c) => ({ id: c.id, name: c.name, team: c.team, color: colorOf(c), bot: c.bot, finishMs: c.finishMs, quit: c.quitAt != null })),
          teamPoints,
          myRank: order.findIndex((c) => c.id === meId),
          myTeam: me.team,
          mode: race.mode,
          myFinishMs: me.finishMs,
        }),
      delay,
    );
  }

  /** "Yarışı Bitir": ilk basan en sona, sonraki basan onun bir önüne yerleşir. */
  function quit() {
    if (ended || reported || me.quitAt != null || me.finishMs != null) return;
    net.sendAll("quit", { id: meId, at: Date.now() });
    report(ranking(track, cars), 300);
  }

  // ---------- Ana döngü ----------
  function loop(t: number) {
    const dt = Math.min(3, (t - last) / 16.667);
    last = t;
    const now = t;
    const started = now >= startAt;
    const raceMs = started ? now - startAt : 0;
    const rank = ranking(track, cars);

    if (started && !ended) {
      for (const c of cars) {
        if (!owned(c)) continue;
        const auto = c.bot || c.finishMs != null;
        const inp = c.quitAt != null ? { up: false, down: true, left: false, right: false } : auto ? botInput(track, c) : myInput();
        const lapBefore = c.lap;
        stepCar(track, c, inp, now, dt, raceMs);
        collideCars(c, cars);
        if (c.bot) botThink(c, now);
        if (c === me && c.lap > lapBefore && c.lap > 1 && c.finishMs == null) {
          say(c.lap === race.laps ? "🏁 SON TUR!" : `Tur ${c.lap}`);
          sfx.lap();
        }
        if (c === me && c.finishMs != null && lapBefore <= race.laps && c.lap > race.laps) {
          say(`🏆 Bitirdin! ${rank.indexOf(c) + 1}. sıra`, 4000);
          sfx.finish();
        }

        // Soru kutuları
        track.boxes.forEach((b, i) => {
          if (now < boxesAt[i] || Math.hypot(b.x - c.x, b.y - c.y) > 34) return;
          boxesAt[i] = now + 5000;
          net.send("box", { i, ttl: 5000 });
          burst(parts, b.x, b.y, "#f472b6", 14);
          if (!c.item) c.item = rollItem(rank.indexOf(c), cars.length);
          if (c === me) sfx.pickup();
        });
        // Yağ
        for (const o of oils)
          if (isRival({ id: o.owner, team: o.team }, c) && Math.hypot(o.x - c.x, o.y - c.y) < 30 && now > c.spinUntil) {
            if (now > c.shieldUntil) {
              c.spinUntil = now + 1000;
              if (c === me) say("🛢️ Kaydın!");
            }
            net.sendAll("ox", { id: o.id });
            break;
          }
        // Roket
        for (const m of missiles)
          if (isRival({ id: m.owner, team: m.team }, c) && Math.hypot(m.x - c.x, m.y - c.y) < 26) {
            const shield = hit(c, m.x, m.y);
            if (c === me) (shield ? sfx.shield() : sfx.explosion(1));
            net.sendAll("mx", { id: m.id, x: c.x, y: c.y, shield });
            break;
          }
      }

      touch.current.hasItem = !!me.item;
      // Oyuncunun eşya/yetenek tuşları
      const wantItem = keys.has(" ") || touch.current.item;
      const wantAbility = keys.has("e") || keys.has("shift") || touch.current.ability;
      const racing = me.finishMs == null && me.quitAt == null;
      if (wantItem && !pressedItem && racing) useItem(me);
      if (wantAbility && !pressedAbility && racing) useAbility(me);
      pressedItem = wantItem;
      pressedAbility = wantAbility;

      // Diğer oyuncuların araçları: tahmin + yumuşatma
      for (const c of cars) {
        if (owned(c)) continue;
        const tg = targets.get(c.id);
        if (!tg) continue;
        tg.x += tg.vx * dt;
        tg.y += tg.vy * dt;
        c.x += (tg.x - c.x) * 0.3;
        c.y += (tg.y - c.y) * 0.3;
        let da = tg.a - c.a;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        c.a += da * 0.35;
        c.vx = tg.vx;
        c.vy = tg.vy;
      }

      for (const m of missiles) stepMissile(m, cars, dt);
      missiles = missiles.filter((m) => {
        if (now < m.until) return true;
        burst(parts, m.x, m.y, "#94a3b8", 10);
        return false;
      });
      oils = oils.filter((o) => now < o.until);

      // Durum gönder (10 Hz)
      if (now - lastSend > 100) {
        lastSend = now;
        const r = (v: number) => Math.round(v * 10) / 10;
        const rem = (u: number) => Math.max(0, Math.round(u - now));
        net.send("s", {
          c: cars
            .filter(owned)
            .map((c) => [c.id, r(c.x), r(c.y), Math.round(c.a * 100) / 100, r(c.vx), r(c.vy), c.lap, c.idx, c.finishMs ?? -1, rem(c.shieldUntil), rem(c.spinUntil), rem(c.boostUntil), rem(c.slowUntil), c.item ? ITEMS.indexOf(c.item) : -1]),
        });
      }

      // Yarış sonu (oda sahibi karar verir)
      if (firstFinishAt == null && cars.some((c) => c.finishMs != null)) firstFinishAt = now;
      if (net.isHost) {
        const done = (c: Car) => c.finishMs != null || c.quitAt != null;
        const humansDone = cars.filter((c) => !c.bot).every(done);
        const allDone = cars.every(done);
        const timeout = firstFinishAt != null && now - firstFinishAt > 25000;
        if (humansDone || allDone || timeout || raceMs > 6 * 60000) {
          const order = ranking(track, cars).map((c) => c.id);
          net.sendAll("end", { order });
        }
      } else if (raceMs > 7 * 60000) finish();
    }

    // ---------- Ses ----------
    if (!started) {
      const n = Math.ceil((startAt - now) / 1000);
      if (n !== lastCount && n <= 3 && n >= 1) sfx.beep();
      lastCount = n;
    } else if (lastCount !== 0) {
      lastCount = 0;
      sfx.beep(true);
    }
    const mySpeed = Math.hypot(me.vx, me.vy);
    sfx.setEngine(me.quitAt != null ? 0 : Math.min(1, mySpeed / 11), now < me.boostUntil);
    // Lastik ötmesi: yan kayarken veya savrulurken
    const skid = now < me.spinUntil ? 1 : mySpeed > 3.5 ? Math.min(1, Math.max(0, (me.drift - 1.1) / 2.5)) : 0;
    sfx.setDrift(started && !ended ? skid : 0);

    // ---------- Çizim ----------
    scene.update({ now, dt, cars, boxesAt, missiles, oils, parts, countdownMs: Math.max(0, startAt - now) });
    g.clearRect(0, 0, VIEW_W, VIEW_H);

    drawMinimap(g, track, cars, meId, !hq);
    drawHud(g, me, rank.indexOf(me), cars.length, me.finishMs ?? raceMs, now);

    // Canlı sıralama listesi
    g.font = "12px sans-serif";
    rank.slice(0, 8).forEach((c, i) => {
      const y = 104 + i * 20;
      g.fillStyle = c === me ? "rgba(255,255,255,0.18)" : "rgba(5,4,11,0.55)";
      g.fillRect(14, y - 14, 170, 18);
      g.fillStyle = colorOf(c);
      g.fillRect(14, y - 14, 4, 18);
      g.fillStyle = "#fff";
      g.fillText(`${i + 1}. ${c.name}${c.finishMs != null ? " 🏁" : ""}`, 24, y);
    });

    if (!started) {
      const n = Math.ceil((startAt - now) / 1000);
      const frac = ((startAt - now) % 1000) / 1000;
      g.textAlign = "center";
      g.font = `bold ${90 + frac * 60}px sans-serif`;
      g.fillStyle = n > 1 ? "#f43f5e" : "#fbbf24";
      g.shadowBlur = 30;
      g.shadowColor = g.fillStyle;
      g.fillText(n > 3 ? "HAZIR" : String(n), VIEW_W / 2, VIEW_H / 2 + 30);
      g.shadowBlur = 0;
      g.font = "14px sans-serif";
      g.fillStyle = "#cbd5e1";
      g.fillText("W/↑ gaz · A/D yön · BOŞLUK eşya · E yetenek", VIEW_W / 2, VIEW_H / 2 + 90);
      g.textAlign = "left";
    } else if (raceMs < 900) {
      g.textAlign = "center";
      g.font = "bold 110px sans-serif";
      g.fillStyle = "#a3e635";
      g.shadowBlur = 40;
      g.shadowColor = "#a3e635";
      g.fillText("BAŞLA!", VIEW_W / 2, VIEW_H / 2 + 30);
      g.shadowBlur = 0;
      g.textAlign = "left";
    }
    if (toast && now < toast.until) {
      g.textAlign = "center";
      g.font = "bold 26px sans-serif";
      g.fillStyle = "#fff";
      g.shadowBlur = 16;
      g.shadowColor = "#8b5cf6";
      g.fillText(toast.text, VIEW_W / 2, 150);
      g.shadowBlur = 0;
      g.textAlign = "left";
    }
    if (me.finishMs != null && !ended) {
      g.textAlign = "center";
      g.font = "bold 16px sans-serif";
      g.fillStyle = "#e2e8f0";
      g.fillText(`Süren: ${fmtTime(me.finishMs)} · Diğerleri bekleniyor…`, VIEW_W / 2, VIEW_H - 24);
      g.textAlign = "left";
    }

    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  const stop = () => {
    cancelAnimationFrame(raf);
    sfx.stopAll();
    ro.disconnect();
    scene.dispose();
    window.removeEventListener("keydown", kd);
    window.removeEventListener("keyup", ku);
  };
  return { stop, quit };
}
