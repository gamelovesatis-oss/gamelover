"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, Check, Copy, Crown, Flag, Loader2, Maximize2, Minimize2, Music, Users, Volume2, VolumeX, Wifi, WifiOff, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "@/games/hooks";
import { raceAudio, type MusicSource } from "@/games/racing/audio";
import { YouTubeDock } from "@/games/racing/YouTubeDock";
import { CAR_TYPES, LAP_OPTIONS, MODE_NAME, TEAM_COLOR, TEAM_NAME, type CarType, type Mode, type Team } from "@/games/racing/engine";
import { enterFullscreenLandscape, exitFullscreen } from "@/games/racing/fullscreen";
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
  const [mode, setMode] = useState<Mode>("herkes");
  const [laps, setLaps] = useState(3);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<RaceResult | null>(null);
  const [race, setRace] = useState<{ id: number; roster: RosterEntry[]; laps: number; mode: Mode } | null>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [dims, setDims] = useState({ w: 1280, h: 800 });
  const [muted, setMuted] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [musicSrc, setMusicSrc] = useState<MusicSource>("phonk");
  const netRef = useRef<RaceNet | null>(null);
  const idRef = useRef(newId());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<{ stop: () => void; quit: () => void } | null>(null);
  const touch = useRef<TouchInput>({ up: false, down: false, left: false, right: false, item: false, ability: false, steer: null, hasItem: false });
  const cb = useRef({ onScore, onGameOver });
  cb.current = { onScore, onGameOver };

  // Telefonda oyun otomatik tam ekran görünümde açılır
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    setIsTouch(coarse);
    if (coarse) setImmersive(true);
    setMuted(raceAudio().muted);
    setMusicSrc(raceAudio().source);
    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("gl-immersive", immersive);
    return () => document.documentElement.classList.remove("gl-immersive");
  }, [immersive]);

  useEffect(() => {
    try {
      setName(localStorage.getItem("gl-player") || `Oyuncu${Math.floor(Math.random() * 900 + 100)}`);
      const saved = localStorage.getItem("gl-car") as CarType | null;
      if (saved && CAR_TYPES[saved]) setType(saved);
      const oda = new URLSearchParams(window.location.search).get("oda");
      if (oda) setJoinCode(oda.toUpperCase().slice(0, 6));
    } catch {}
    return () => {
      handleRef.current?.stop();
      netRef.current?.leave();
    };
  }, []);

  /** iOS 13+ hareket sensörü izni (kullanıcı dokunuşu içinde çağrılmalı). */
  function requestTilt() {
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DOE?.requestPermission === "function") DOE.requestPermission().catch(() => {});
  }

  function goImmersive() {
    setImmersive(true);
    enterFullscreenLandscape();
  }
  function exitImmersive() {
    setImmersive(false);
    exitFullscreen();
  }

  async function enter(room: string) {
    raceAudio().unlock();
    if (isTouch) {
      goImmersive();
      requestTilt();
    }
    const clean = name.trim().slice(0, 14) || "Oyuncu";
    try {
      localStorage.setItem("gl-player", clean);
      localStorage.setItem("gl-car", type);
    } catch {}
    setPhase("connecting");
    const net = new RaceNet(room, { id: idRef.current, name: clean, team, type, joinedAt: Date.now(), mode, laps });
    if (room === "solo") net.online = false; // antrenman her zaman çevrimdışı
    netRef.current = net;
    net.onPresence((list) => setPlayers([...list]));
    net.on("start", (p: { roster: RosterEntry[]; laps?: number; mode?: Mode }) => {
      if (p.roster.some((r) => r.id === idRef.current)) {
        setRace((r) => ({ id: (r?.id ?? 0) + 1, roster: p.roster, laps: p.laps ?? 3, mode: p.mode ?? "herkes" }));
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
    if (p.mode) setMode(p.mode);
    if (p.laps) setLaps(p.laps);
    await netRef.current?.update(p);
  }

  function start() {
    raceAudio().unlock();
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
    list.sort(() => Math.random() - 0.5); // ızgarayı karıştır
    net.sendAll("start", { roster: list, laps, mode });
  }

  useEffect(() => {
    touch.current.hideRank = isTouch && musicSrc === "youtube";
  }, [isTouch, musicSrc]);

  // Yarışı çalıştır. Sonuç ekranında da arkada sürer: oda sahibi botları yönetmeye devam eder.
  useEffect(() => {
    if (!race || !canvasRef.current || !glRef.current || !netRef.current) return;
    setConfirmQuit(false);
    const h = runRace({
      canvas: canvasRef.current,
      glCanvas: glRef.current,
      net: netRef.current,
      roster: race.roster,
      meId: idRef.current,
      touch,
      laps: race.laps,
      mode: race.mode,
      onEnd: (r) => {
        setResult(r);
        setPhase("results");
        const other: Team = r.myTeam === "kirmizi" ? "mavi" : "kirmizi";
        const teamWin = r.mode === "takim" && r.teamPoints[r.myTeam] > r.teamPoints[other];
        const score = (RANK_SCORE[r.myRank] ?? 50) + (teamWin ? 300 : 0) + (r.myFinishMs ? Math.max(0, Math.round(300 - r.myFinishMs / 1000)) : 0);
        cb.current.onScore(score);
        setTimeout(() => {
          exitImmersive();
          cb.current.onGameOver(score);
        }, 6500);
      },
    });
    handleRef.current = h;
    return () => {
      h.stop();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race]);

  const isHost = netRef.current?.isHost ?? true;
  const online = netRef.current?.online ?? false;
  const room = netRef.current?.room ?? "";
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?oda=${room}` : "";
  // Oda sahibinin seçtiği mod ve tur sayısı herkese görünür
  const hostPlayer = players[0];
  const shownMode: Mode = isHost ? mode : (hostPlayer?.mode ?? mode);
  const shownLaps = isHost ? laps : (hostPlayer?.laps ?? laps);

  // Telefon dik tutuluyor ve ekran dönmüyorsa oyunu 90° çevirerek yatay göster
  const forced = immersive && isTouch && dims.h > dims.w;
  const boxW = forced ? dims.h : dims.w;
  const boxH = forced ? dims.w : dims.h;
  const rootStyle: React.CSSProperties | undefined = immersive
    ? forced
      ? { position: "fixed", top: 0, left: 0, width: boxW, height: boxH, transform: "rotate(90deg) translateY(-100%)", transformOrigin: "top left" }
      : { position: "fixed", inset: 0 }
    : undefined;
  const racing = phase === "race" || phase === "results";

  return (
    <div className={cn("select-none", immersive ? "z-[100] overflow-y-auto overscroll-contain bg-ink-950" : "relative mx-auto w-full")} style={rootStyle}>
      {immersive && !racing && (
        <button onClick={exitImmersive} className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white" aria-label="Tam ekrandan çık">
          <X className="h-5 w-5" />
        </button>
      )}
      <div className={cn(immersive && !racing && "mx-auto max-w-3xl p-3 pt-14")}>
        <AnimatePresence mode="wait">
          {phase === "menu" && (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5 rounded-2xl bg-ink-800/60 p-5">
              <div>
                <label className="label">Yarışçı adın</label>
                <input value={name} onChange={(e) => setName(e.target.value.slice(0, 14))} className="input" maxLength={14} />
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
                    {online ? (room === "genel" ? "Genel oda" : "Özel oda") : room === "solo" ? "Antrenman" : "Çevrimdışı"}
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

              {/* Yarış ayarları (sadece oda sahibi değiştirir) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Oyun modu</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["herkes", "takim"] as Mode[]).map((m) => (
                      <button
                        key={m}
                        disabled={!isHost}
                        onClick={() => change({ mode: m })}
                        className={cn(
                          "rounded-xl border-2 px-3 py-2.5 text-left text-sm transition disabled:cursor-default",
                          shownMode === m ? "border-neon-cyan bg-neon-cyan/10 text-white" : "border-white/10 text-slate-400",
                        )}
                      >
                        <div className="font-bold">{m === "herkes" ? "🎯 Herkes Tek" : "🤝 Takım"}</div>
                        <div className="text-[11px] opacity-70">{m === "herkes" ? "Herkes herkese saldırır" : "Kırmızı 🆚 Mavi"}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Tur sayısı</label>
                  <div className="flex flex-wrap gap-2">
                    {LAP_OPTIONS.map((n) => (
                      <button
                        key={n}
                        disabled={!isHost}
                        onClick={() => change({ laps: n })}
                        className={cn(
                          "h-11 w-11 rounded-xl border-2 font-display font-bold transition disabled:cursor-default",
                          shownLaps === n ? "border-neon-lime bg-neon-lime/15 text-white" : "border-white/10 text-slate-400",
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Oyuncular */}
              {shownMode === "takim" ? (
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
                      <PlayerList players={players.filter((p) => p.team === t)} hostId={players[0]?.id} meId={idRef.current} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-white/10 p-3">
                  <div className="mb-2 font-display font-bold text-white">Yarışçılar ({players.length})</div>
                  <PlayerList players={players} hostId={players[0]?.id} meId={idRef.current} />
                </div>
              )}

              <CarPicker value={type} onChange={(v) => change({ type: v })} compact />

              <MusicPicker source={musicSrc} onSource={setMusicSrc} />

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
                  <button onClick={start} className="btn-primary ml-auto px-6 py-4 text-base">
                    <Flag className="h-5 w-5" /> Başlat · {MODE_NAME[mode]} · {laps} tur ({Math.min(MAX_CARS, players.length + bots)} araç)
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
      </div>

      {musicSrc === "youtube" && phase !== "menu" && phase !== "connecting" && (
        <YouTubeDock
          muted={muted}
          className={cn(
            racing ? (isTouch ? "absolute left-2 top-2" : "absolute bottom-3 left-3") : "mx-auto my-4",
          )}
        />
      )}

      {racing && (
        <div
          className={cn(immersive ? "absolute inset-0 flex items-center justify-center bg-ink-950" : "relative", "touch-none select-none")}
          style={{ WebkitTouchCallout: "none" }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="relative w-full" style={immersive ? { width: Math.min(boxW, boxH * 1.6) } : undefined}>
            <div className={cn("relative aspect-[16/10] w-full overflow-hidden bg-ink-950", !immersive && "rounded-2xl")}>
              <canvas ref={glRef} className="absolute inset-0 h-full w-full touch-none" />
              <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
            </div>
            <AnimatePresence>
              {phase === "results" && result && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 grid place-items-center overflow-auto rounded-2xl bg-ink-950/85 p-4 backdrop-blur-sm"
                >
                  <Results r={result} meId={idRef.current} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isTouch && phase === "race" && <TouchPad touch={touch} onEnableTilt={requestTilt} forced={forced} />}

          {/* Sağ kenar: ses, yarışı bitir, tam ekran */}
          <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-end gap-2">
            <button
              onClick={() => {
                raceAudio().unlock();
                raceAudio().setMuted(!muted);
                setMuted(!muted);
              }}
              className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-white backdrop-blur"
              aria-label={muted ? "Sesi aç" : "Sesi kapat"}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            {phase === "race" && (
              <button
                onClick={() => {
                  if (!confirmQuit) {
                    setConfirmQuit(true);
                    setTimeout(() => setConfirmQuit(false), 3000);
                  } else handleRef.current?.quit();
                }}
                className={cn("grid h-10 place-items-center rounded-xl px-3 text-xs font-bold text-white backdrop-blur", confirmQuit ? "bg-red-500" : "bg-white/15")}
                aria-label="Yarışı bitir"
              >
                {confirmQuit ? "🏳️ Bitir?" : "🏳️"}
              </button>
            )}
            {isTouch && (
              <button
                onClick={() => (immersive ? exitImmersive() : goImmersive())}
                className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-white backdrop-blur"
                aria-label={immersive ? "Tam ekrandan çık" : "Tam ekran"}
              >
                {immersive ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Müzik seçimi: üretilen drift phonk, YouTube'dan resmi klipler ya da oyuncunun kendi dosyası. */
function MusicPicker({ source, onSource }: { source: MusicSource; onSource: (s: MusicSource) => void }) {
  const [current, setCurrent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    raceAudio()
      .loadSaved()
      .then((n) => setCurrent(n));
  }, []);

  function choose(s: MusicSource) {
    raceAudio().setSource(s);
    onSource(s);
  }

  async function pick(file: File) {
    setBusy(true);
    await raceAudio().setCustom(file);
    setCurrent(raceAudio().customName);
    choose("custom");
    setBusy(false);
  }

  const opt = (s: MusicSource, label: string, sub: string, onClick?: () => void) => (
    <button
      onClick={onClick ?? (() => choose(s))}
      disabled={busy}
      className={cn("rounded-xl border-2 px-3 py-2 text-left text-sm transition", source === s ? "border-neon-pink bg-neon-pink/10 text-white" : "border-white/10 text-slate-400")}
    >
      <div className="truncate font-bold">{label}</div>
      <div className="truncate text-[11px] opacity-70">{sub}</div>
    </button>
  );

  return (
    <div className="rounded-2xl border-2 border-white/10 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
        <Music className="h-4 w-4 text-neon-pink" /> Yarış müziği
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {opt("youtube", "🎬 Tokyo Drift + We Own It", "YouTube resmi klipler")}
        {opt("phonk", "🔥 Drift Phonk", "Oyuna özel")}
        {opt(
          "custom",
          current ? `🎵 ${current}` : "📁 Kendi şarkın",
          current ? "Değiştirmek için tekrar dokun" : "Cihazından seç",
          () => (current && source !== "custom" ? choose("custom") : input.current?.click()),
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
          e.target.value = "";
        }}
      />
      {source === "youtube" && <p className="mt-2 text-[11px] text-slate-500">Klipler YouTube oynatıcısında çalar; oynatıcı ekranın köşesinde görünür kalır.</p>}
    </div>
  );
}

function PlayerList({ players, hostId, meId }: { players: Player[]; hostId?: string; meId: string }) {
  return (
    <ul className="space-y-1.5">
      {players.map((p) => (
        <li key={p.id} className="flex items-center gap-2 rounded-lg bg-ink-950/50 px-3 py-2 text-sm text-white">
          {hostId === p.id && <Crown className="h-3.5 w-3.5 text-neon-amber" />}
          <span className="flex-1 truncate">
            {p.name}
            {p.id === meId && <span className="text-slate-400"> (sen)</span>}
          </span>
          <span className="text-xs text-slate-400">{CAR_TYPES[p.type]?.name}</span>
        </li>
      ))}
    </ul>
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
              className={cn("rounded-xl border-2 p-3 text-left transition", value === k ? "border-neon-cyan bg-neon-cyan/10" : "border-white/10 hover:border-white/30")}
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

/**
 * Telefon eğimini direksiyona çevirir: -1 (sol) … 1 (sağ).
 * forced: ekran dönmediği için oyunu biz 90° çevirdiysek telefon yan tutuluyordur.
 */
function tiltToSteer(e: DeviceOrientationEvent, forced: boolean) {
  const angle = forced ? 90 : ((screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0) as number);
  const beta = e.beta ?? 0,
    gamma = e.gamma ?? 0;
  let deg: number;
  if (angle === 90) deg = beta;
  else if (angle === 270 || angle === -90) deg = -beta;
  else if (angle === 180) deg = -gamma;
  else deg = gamma;
  const DEAD = 3,
    FULL = 24;
  const a = Math.abs(deg);
  if (a < DEAD) return 0;
  return Math.sign(deg) * Math.min(1, (a - DEAD) / (FULL - DEAD));
}

function TouchPad({ touch, onEnableTilt, forced }: { touch: React.MutableRefObject<TouchInput>; onEnableTilt: () => void; forced: boolean }) {
  const [tilt, setTilt] = useState<"bekleniyor" | "aktif" | "yok">("bekleniyor");
  const [hasItem, setHasItem] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Eğim sensörü
  useEffect(() => {
    let got = false;
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta == null && e.gamma == null) return;
      if (!got) {
        got = true;
        setTilt("aktif");
      }
      touch.current.steer = tiltToSteer(e, forced);
    };
    window.addEventListener("deviceorientation", onTilt);
    const fallback = setTimeout(() => !got && setTilt("yok"), 1500);
    return () => {
      window.removeEventListener("deviceorientation", onTilt);
      clearTimeout(fallback);
      touch.current.steer = null;
    };
  }, [touch, forced]);

  // Direksiyon göstergesi ve eşya butonu (React yeniden çizimi olmadan)
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${(touch.current.steer ?? 0) * 90}deg)`;
      setHasItem((h) => (h === touch.current.hasItem ? h : touch.current.hasItem));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [touch]);

  const bind = (k: "up" | "down" | "left" | "right" | "item" | "ability") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      touch.current[k] = true;
    },
    onPointerUp: () => (touch.current[k] = false),
    onPointerCancel: () => (touch.current[k] = false),
    onLostPointerCapture: () => (touch.current[k] = false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const base = "touch-none select-none backdrop-blur text-white active:scale-95 transition-transform";

  return (
    <>
      {/* Sol: fren pedalı (+ eğim yoksa yön tuşları) */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-end gap-3 pb-[env(safe-area-inset-bottom)]">
        <button
          {...bind("down")}
          aria-label="Fren"
          className={cn(base, "pointer-events-auto flex h-28 w-20 flex-col items-center justify-end rounded-2xl border-2 border-red-400/60 bg-red-500/30 pb-3 text-sm font-black")}
        >
          <span className="mb-auto mt-3 grid w-12 gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 rounded bg-white/50" />
            ))}
          </span>
          FREN
        </button>
        {tilt === "yok" && (
          <div className="pointer-events-auto flex gap-2">
            <button {...bind("left")} aria-label="Sol" className={cn(base, "grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-2xl")}>
              ◀
            </button>
            <button {...bind("right")} aria-label="Sağ" className={cn(base, "grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-2xl")}>
              ▶
            </button>
          </div>
        )}
      </div>

      {/* Orta alt: direksiyon göstergesi */}
      {tilt === "aktif" && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-center">
          <div ref={wheelRef} className="mx-auto grid h-12 w-12 place-items-center rounded-full border-4 border-white/50 text-white/80">
            <span className="h-4 w-1 -translate-y-2 rounded bg-neon-cyan" />
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/60">Telefonu eğ</div>
        </div>
      )}
      {tilt === "bekleniyor" && (
        <button
          onClick={onEnableTilt}
          className="pointer-events-auto absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-xl bg-white/15 px-3 py-2 text-xs text-white backdrop-blur"
        >
          Eğerek sürüşü aç
        </button>
      )}

      {/* Sağ: yetenek, (varsa) eşya ve gaz pedalı */}
      <div className="pointer-events-none absolute bottom-3 right-16 z-10 flex items-end gap-3 pb-[env(safe-area-inset-bottom)]">
        <div className="flex flex-col gap-3">
          {hasItem && (
            <button {...bind("item")} aria-label="Eşya kullan" className={cn(base, "pointer-events-auto grid h-16 w-16 animate-pulse place-items-center rounded-full bg-neon-pink/50 text-2xl")}>
              🎁
            </button>
          )}
          <button
            {...bind("ability")}
            aria-label="Yetenek"
            className={cn(base, "pointer-events-auto grid h-16 w-16 place-items-center rounded-full border-2 border-violet-300/60 bg-neon-violet/40 text-2xl")}
          >
            ✨
          </button>
        </div>
        <button
          {...bind("up")}
          aria-label="Gaz"
          className={cn(base, "pointer-events-auto flex h-36 w-24 flex-col items-center justify-end rounded-2xl border-2 border-lime-300/70 bg-neon-lime/30 pb-3 text-base font-black")}
        >
          <span className="mb-auto mt-3 grid w-14 gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-1.5 rounded bg-white/50" />
            ))}
          </span>
          GAZ
        </button>
      </div>
    </>
  );
}

function Results({ r, meId }: { r: RaceResult; meId: string }) {
  const teamWinner: Team | null = r.teamPoints.kirmizi === r.teamPoints.mavi ? null : r.teamPoints.kirmizi > r.teamPoints.mavi ? "kirmizi" : "mavi";
  const first = r.order[0];
  const iQuit = r.order.find((c) => c.id === meId)?.quit;
  return (
    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-lg">
      <div className="mb-4 text-center">
        <div className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
          {iQuit ? "Yarışı bitirdin" : "Yarış bitti"} · {r.myRank + 1}. oldun
        </div>
        {r.mode === "takim" ? (
          <>
            <div className="font-display text-3xl font-bold" style={{ color: teamWinner ? TEAM_COLOR[teamWinner] : "#fff" }}>
              {teamWinner ? `${TEAM_NAME[teamWinner]} Takım kazandı!` : "Berabere!"}
            </div>
            <div className="mt-1 text-sm text-slate-300">
              <span style={{ color: TEAM_COLOR.kirmizi }}>{r.teamPoints.kirmizi}</span> – <span style={{ color: TEAM_COLOR.mavi }}>{r.teamPoints.mavi}</span> puan
            </div>
          </>
        ) : (
          <div className="font-display text-3xl font-bold" style={{ color: first?.color }}>
            {iQuit ? "Sıralama şimdilik böyle" : `🏆 ${first?.name} kazandı!`}
          </div>
        )}
      </div>
      <ol className="space-y-1.5">
        {r.order.map((c, i) => (
          <li key={c.id} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm", c.id === meId ? "bg-white/15" : "bg-white/5")}>
            <span className="w-6 font-display font-bold text-white">{i + 1}.</span>
            <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
            <span className="flex-1 truncate text-white">{c.name}</span>
            <span className="font-mono text-xs text-slate-400">{c.quit ? "🏳️ bitirdi" : c.finishMs != null ? fmtTime(c.finishMs) : "—"}</span>
            <span className="w-10 text-right font-bold text-neon-cyan">+{POINTS[i] ?? 0}</span>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}
