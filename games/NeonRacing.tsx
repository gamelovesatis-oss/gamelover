"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, Check, Copy, Crown, Flag, Loader2, Users, Wifi, WifiOff, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/games/hooks";
import { CAR_TYPES, TEAM_COLOR, TEAM_NAME, type CarType, type Team } from "@/games/racing/engine";
import { RaceNet, type Player } from "@/games/racing/net";
import { fmtTime } from "@/games/racing/render";
import { POINTS, runRace, type RaceResult, type RosterEntry, type TouchInput } from "@/games/racing/runner";
import { cn } from "@/lib/utils";

const MAX_CARS = 8;
const BOT_NAMES = ["Leblebi", "Hitit", "Alacahöyük", "Osmancık", "Sungurlu", "İskilip", "Kargı", "Mecitözü"];
const RANK_SCORE = [1000, 750, 600, 450, 350, 250, 150, 100];

const newId = () => Math.random().toString(36).slice(2, 10);
const roomCode = () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPRSTUVYZ"[Math.floor(Math.random() * 21)]).join("");

type Phase = "menu" | "connecting" | "lobby" | "race" | "results";

export default function NeonRacing({ onScore, onGameOver }: GameProps) {
  const [phase, setPhase] = useState<Phase>("menu");
  const [name, setName] = useState("");
  const [type, setType] = useState<CarType>("hiz");
  const [team, setTeam] = useState<Team>("kirmizi");
  const [joinCode, setJoinCode] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [bots, setBots] = useState(5);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<RaceResult | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const netRef = useRef<RaceNet | null>(null);
  const idRef = useRef(newId());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touch = useRef<TouchInput>({ up: false, down: false, left: false, right: false, item: false, ability: false });
  const cb = useRef({ onScore, onGameOver });
  cb.current = { onScore, onGameOver };

  useEffect(() => {
    try {
      setName(localStorage.getItem("gl-player") || `Oyuncu${Math.floor(Math.random() * 900 + 100)}`);
      const saved = localStorage.getItem("gl-car") as CarType | null;
      if (saved && CAR_TYPES[saved]) setType(saved);
      const oda = new URLSearchParams(window.location.search).get("oda");
      if (oda) setJoinCode(oda.toUpperCase().slice(0, 6));
    } catch {}
    return () => netRef.current?.leave();
  }, []);

  async function enter(room: string) {
    const clean = name.trim().slice(0, 14) || "Oyuncu";
    try {
      localStorage.setItem("gl-player", clean);
      localStorage.setItem("gl-car", type);
    } catch {}
    setPhase("connecting");
    const net = new RaceNet(room, { id: idRef.current, name: clean, team, type, joinedAt: Date.now() });
    if (room === "solo") net.online = false; // antrenman her zaman çevrimdışı
    netRef.current = net;
    net.onPresence((list) => setPlayers([...list]));
    net.on("start", (p: { roster: RosterEntry[] }) => {
      if (p.roster.some((r) => r.id === idRef.current)) {
        setRoster(p.roster);
        setPhase("race");
      } else setNotice("Bu odada yarış başladı. Bitince bir sonraki yarışa katılabilirsin.");
    });
    const ok = await net.join();
    if (!ok && room !== "solo") setNotice("Çok oyunculu sunucuya bağlanılamadı — botlarla oynuyorsun.");
    setPhase("lobby");
  }

  async function change(p: Partial<Player>) {
    if (p.team) setTeam(p.team);
    if (p.type) setType(p.type);
    await netRef.current?.update(p);
  }

  function start() {
    const net = netRef.current!;
    const humans = net.players.slice(0, MAX_CARS);
    const list: RosterEntry[] = humans.map((p) => ({ id: p.id, name: p.name, team: p.team, type: p.type, bot: false }));
    const slots = Math.min(bots, MAX_CARS - list.length);
    const types: CarType[] = ["hiz", "tank", "avci"];
    for (let i = 0; i < slots; i++) {
      const red = list.filter((r) => r.team === "kirmizi").length;
      const blue = list.length - red;
      list.push({
        id: `bot-${newId()}`,
        name: `🤖 ${BOT_NAMES[i % BOT_NAMES.length]}`,
        team: red <= blue ? "kirmizi" : "mavi",
        type: types[Math.floor(Math.random() * 3)],
        bot: true,
        skill: 0.86 + Math.random() * 0.1,
      });
    }
    // Izgarayı karıştır
    list.sort(() => Math.random() - 0.5);
    net.sendAll("start", { roster: list });
  }

  // Yarışı çalıştır
  useEffect(() => {
    if (phase !== "race" || !canvasRef.current || !netRef.current) return;
    return runRace({
      canvas: canvasRef.current,
      net: netRef.current,
      roster,
      meId: idRef.current,
      touch,
      onEnd: (r) => {
        setResult(r);
        setPhase("results");
        const score =
          (RANK_SCORE[r.myRank] ?? 50) +
          (r.teamPoints[r.myTeam] > r.teamPoints[r.myTeam === "kirmizi" ? "mavi" : "kirmizi"] ? 300 : 0) +
          (r.myFinishMs ? Math.max(0, Math.round(300 - r.myFinishMs / 1000)) : 0);
        cb.current.onScore(score);
        setTimeout(() => cb.current.onGameOver(score), 6500);
      },
    });
  }, [phase, roster]);

  const isHost = netRef.current?.isHost ?? true;
  const online = netRef.current?.online ?? false;
  const room = netRef.current?.room ?? "";
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?oda=${room}` : "";

  return (
    <div className="relative mx-auto w-full select-none">
      <AnimatePresence mode="wait">
        {phase === "menu" && (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5 rounded-2xl bg-ink-800/60 p-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="label">Yarışçı adın</label>
                <input value={name} onChange={(e) => setName(e.target.value.slice(0, 14))} className="input" maxLength={14} />
              </div>
              <div>
                <label className="label">Takım</label>
                <div className="flex gap-2">
                  {(["kirmizi", "mavi"] as Team[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTeam(t)}
                      className={cn("rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition", team === t ? "text-white" : "border-white/10 text-slate-400")}
                      style={team === t ? { borderColor: TEAM_COLOR[t], background: `${TEAM_COLOR[t]}33` } : undefined}
                    >
                      {TEAM_NAME[t]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <CarPicker value={type} onChange={setType} />
            <div className="grid gap-3 sm:grid-cols-3">
              <button onClick={() => enter("genel")} className="btn-primary py-4">
                <Zap className="h-4 w-4" /> Hızlı Oyna
              </button>
              <button onClick={() => enter(roomCode())} className="btn-ghost py-4">
                <Users className="h-4 w-4" /> Arkadaşlarla Oda Kur
              </button>
              <div className="flex gap-2">
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="KOD" className="input text-center font-display tracking-widest" />
                <button onClick={() => joinCode && enter(joinCode)} disabled={!joinCode} className="btn-ghost px-4">
                  Katıl
                </button>
              </div>
            </div>
            <button onClick={() => enter("solo")} className="w-full text-center text-xs text-slate-400 hover:text-white">
              <Bot className="mr-1 inline h-3.5 w-3.5" /> Sadece botlarla antrenman
            </button>
          </motion.div>
        )}

        {phase === "connecting" && (
          <motion.div key="conn" className="grid aspect-[16/10] place-items-center rounded-2xl bg-ink-800/60">
            <div className="text-center text-slate-300">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-neon-cyan" /> Odaya bağlanılıyor…
            </div>
          </motion.div>
        )}

        {phase === "lobby" && (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 rounded-2xl bg-ink-800/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
                  {online ? <Wifi className="h-3.5 w-3.5 text-neon-lime" /> : <WifiOff className="h-3.5 w-3.5 text-neon-amber" />}
                  {online ? (room === "genel" ? "Genel oda" : room === "solo" ? "Antrenman" : "Özel oda") : "Çevrimdışı"}
                </div>
                {online && room !== "genel" && room !== "solo" && <div className="font-display text-3xl font-bold tracking-[0.3em] text-white">{room}</div>}
              </div>
              {online && room !== "solo" && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="btn-ghost"
                >
                  {copied ? <Check className="h-4 w-4 text-neon-lime" /> : <Copy className="h-4 w-4" />} Davet linki
                </button>
              )}
            </div>

            {notice && <p className="rounded-xl bg-neon-amber/10 px-4 py-2 text-sm text-amber-200">{notice}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              {(["kirmizi", "mavi"] as Team[]).map((t) => (
                <div key={t} className="rounded-2xl border-2 p-3" style={{ borderColor: `${TEAM_COLOR[t]}66`, background: `${TEAM_COLOR[t]}12` }}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-display font-bold" style={{ color: TEAM_COLOR[t] }}>
                      {TEAM_NAME[t]} Takım
                    </span>
                    {team !== t && (
                      <button onClick={() => change({ team: t })} className="text-xs text-slate-300 underline">
                        Bu takıma geç
                      </button>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {players
                      .filter((p) => p.team === t)
                      .map((p) => (
                        <li key={p.id} className="flex items-center gap-2 rounded-lg bg-ink-950/50 px-3 py-2 text-sm text-white">
                          {players[0]?.id === p.id && <Crown className="h-3.5 w-3.5 text-neon-amber" />}
                          <span className="flex-1 truncate">
                            {p.name}
                            {p.id === idRef.current && <span className="text-slate-400"> (sen)</span>}
                          </span>
                          <span className="text-xs text-slate-400">{CAR_TYPES[p.type]?.name}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>

            <CarPicker value={type} onChange={(v) => change({ type: v })} compact />

            {isHost ? (
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <Bot className="h-4 w-4" /> Bot sayısı
                  <select value={bots} onChange={(e) => setBots(Number(e.target.value))} className="input w-20 py-2">
                    {Array.from({ length: MAX_CARS }, (_, i) => (
                      <option key={i} value={i} className="bg-ink-900">
                        {i}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={start} className="btn-primary ml-auto px-8 py-4 text-base">
                  <Flag className="h-5 w-5" /> Yarışı Başlat ({Math.min(MAX_CARS, players.length + bots)} araç)
                </button>
              </div>
            ) : (
              <p className="text-center text-sm text-slate-400">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Oda sahibinin ({players[0]?.name}) yarışı başlatması bekleniyor…
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {(phase === "race" || phase === "results") && (
        <div className="relative">
          <canvas ref={canvasRef} className="aspect-[16/10] w-full touch-none rounded-2xl bg-ink-950" />
          <TouchPad touch={touch} />
          <AnimatePresence>
            {phase === "results" && result && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 grid place-items-center rounded-2xl bg-ink-950/85 p-4 backdrop-blur-sm">
                <Results r={result} meId={idRef.current} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function CarPicker({ value, onChange, compact }: { value: CarType; onChange: (v: CarType) => void; compact?: boolean }) {
  return (
    <div>
      <label className="label">Araç sınıfı</label>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(CAR_TYPES) as CarType[]).map((k) => {
          const c = CAR_TYPES[k];
          return (
            <button
              key={k}
              onClick={() => onChange(k)}
              className={cn(
                "rounded-xl border-2 p-3 text-left transition",
                value === k ? "border-neon-cyan bg-neon-cyan/10" : "border-white/10 hover:border-white/30",
              )}
            >
              <div className="text-2xl">{k === "hiz" ? "⚡" : k === "tank" ? "🛡️" : "🎯"}</div>
              <div className="font-display font-bold text-white">{c.name}</div>
              {!compact && <div className="mt-1 text-xs text-slate-400">{c.desc}</div>}
              <div className="mt-2 space-y-1">
                <Stat label="Hız" v={(c.max - 8.5) / 1.2} />
                <Stat label="Yol tutuş" v={(c.grip - 0.86) / 0.09} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-slate-400">
      <span className="w-14">{label}</span>
      <div className="h-1.5 flex-1 rounded bg-white/10">
        <div className="h-full rounded bg-gradient-to-r from-neon-violet to-neon-cyan" style={{ width: `${Math.max(15, Math.min(100, v * 100))}%` }} />
      </div>
    </div>
  );
}

function TouchPad({ touch }: { touch: React.MutableRefObject<TouchInput> }) {
  const bind = (k: keyof TouchInput) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      touch.current[k] = true;
    },
    onPointerUp: () => (touch.current[k] = false),
    onPointerLeave: () => (touch.current[k] = false),
    onPointerCancel: () => (touch.current[k] = false),
  });
  const btn = "grid h-14 w-14 place-items-center rounded-2xl bg-white/15 text-xl text-white backdrop-blur active:bg-neon-cyan/40";
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-between px-3 md:hidden">
      <div className="pointer-events-auto flex gap-2">
        <button className={btn} {...bind("left")}>◀</button>
        <button className={btn} {...bind("right")}>▶</button>
      </div>
      <div className="pointer-events-auto flex gap-2">
        <button className={cn(btn, "bg-neon-pink/40")} {...bind("item")}>🎁</button>
        <button className={cn(btn, "bg-neon-violet/40")} {...bind("ability")}>✨</button>
        <button className={btn} {...bind("down")}>▼</button>
        <button className={cn(btn, "bg-neon-lime/40")} {...bind("up")}>▲</button>
      </div>
    </div>
  );
}

function Results({ r, meId }: { r: RaceResult; meId: string }) {
  const winner: Team | null = r.teamPoints.kirmizi === r.teamPoints.mavi ? null : r.teamPoints.kirmizi > r.teamPoints.mavi ? "kirmizi" : "mavi";
  return (
    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-lg">
      <div className="mb-4 text-center">
        <div className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">Yarış bitti</div>
        <div className="font-display text-3xl font-bold" style={{ color: winner ? TEAM_COLOR[winner] : "#fff" }}>
          {winner ? `${TEAM_NAME[winner]} Takım kazandı!` : "Berabere!"}
        </div>
        <div className="mt-1 text-sm text-slate-300">
          <span style={{ color: TEAM_COLOR.kirmizi }}>{r.teamPoints.kirmizi}</span> – <span style={{ color: TEAM_COLOR.mavi }}>{r.teamPoints.mavi}</span> puan
        </div>
      </div>
      <ol className="space-y-1.5">
        {r.order.map((c, i) => (
          <li key={c.id} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm", c.id === meId ? "bg-white/15" : "bg-white/5")}>
            <span className="w-6 font-display font-bold text-white">{i + 1}.</span>
            <span className="h-3 w-3 rounded-full" style={{ background: TEAM_COLOR[c.team] }} />
            <span className="flex-1 truncate text-white">{c.name}</span>
            <span className="font-mono text-xs text-slate-400">{c.finishMs != null ? fmtTime(c.finishMs) : "—"}</span>
            <span className="w-10 text-right font-bold text-neon-cyan">+{POINTS[i] ?? 0}</span>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}
