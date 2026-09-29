"use client";

/**
 * Tarayıcıda üretilen "drift phonk" müziği + drift ses efektleri (Web Audio API).
 * Tüm sesler burada sentezlenir: dosya indirmez, telifli parça içermez.
 */
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

const BPM = 140; // yarım tempo hissi: trampet her ölçünün 3. vuruşunda

// F# minör — 808 bas kökleri (her biri 1 ölçü)
const BASS = [30, 26, 33, 28]; // F#1, D1, A1, E1
const PAD = [
  [54, 57, 61],
  [50, 54, 57],
  [57, 61, 64],
  [52, 56, 59],
];
// Cowbell melodisi: [adım, nota] — 4 ölçülük özgün motif
const COWBELL: [number, number][][] = [
  [[0, 78], [3, 81], [6, 78], [8, 85], [10, 83], [12, 81], [14, 80]],
  [[0, 78], [3, 81], [6, 78], [8, 76], [10, 78], [13, 73], [14, 76]],
  [[0, 78], [3, 81], [6, 78], [8, 86], [10, 85], [12, 83], [14, 81]],
  [[0, 85], [2, 83], [4, 81], [6, 80], [8, 78], [11, 76], [12, 78]],
];
const KICKS = [
  [0, 6, 10],
  [0, 7, 10, 14],
  [0, 6, 10],
  [0, 3, 6, 10, 13],
];

// ---------- Oyuncunun kendi şarkısı (cihazda IndexedDB'de saklanır, siteye yüklenmez) ----------
export type MusicSource = "phonk" | "custom" | "youtube";
const DB = "gl-racing";
function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  return new Promise((resolve) => {
    try {
      const open = indexedDB.open(DB, 1);
      open.onupgradeneeded = () => open.result.createObjectStore("music");
      open.onerror = () => resolve(undefined);
      open.onsuccess = () => {
        const tx = open.result.transaction("music", mode);
        const req = fn(tx.objectStore("music"));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => resolve(undefined);
      };
    } catch {
      resolve(undefined);
    }
  });
}
export const saveCustomTrack = (file: File) => idb("readwrite", (s) => s.put(file, "track"));
export const clearCustomTrack = () => idb("readwrite", (s) => s.delete("track"));
export const loadCustomTrack = () => idb<File>("readonly", (s) => s.get("track"));

function distortionCurve(amount: number) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

class RaceAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private noise!: AudioBuffer;
  private bassDrive!: WaveShaperNode;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  // Motor
  private engineOsc: OscillatorNode[] = [];
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  // Lastik ötmesi
  private skidSrc: AudioBufferSourceNode | null = null;
  private skidGain: GainNode | null = null;
  private skidLfo: OscillatorNode | null = null;
  private wasBoost = false;
  private custom: HTMLAudioElement | null = null;
  private customUrl: string | null = null;
  customName: string | null = null;
  /** Müzik kaynağı: üretilen phonk, oyuncunun kendi dosyası ya da YouTube (oynatıcı ayrı bileşende). */
  source: MusicSource = "phonk";
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem("gl-muted") === "1";
      const s = localStorage.getItem("gl-music-src") as MusicSource | null;
      if (s === "phonk" || s === "custom" || s === "youtube") this.source = s;
    } catch {}
  }

  setSource(s: MusicSource) {
    const playing = this.timer !== null || (this.custom != null && !this.custom.paused);
    this.stopMusic();
    this.source = s;
    try {
      localStorage.setItem("gl-music-src", s);
    } catch {}
    if (playing) this.startMusic();
  }

  /** Kullanıcı dokunuşu içinde çağrılmalı (tarayıcı kuralı). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const c = new AC();
      this.ctx = c;
      this.master = c.createGain();
      this.master.gain.value = this.muted ? 0 : 0.85;
      this.master.connect(c.destination);

      // Müzik veriyolu: kompresörle "pompalanan" phonk sesi
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.12;
      comp.connect(this.master);
      this.music = c.createGain();
      this.music.gain.value = 0.42;
      this.music.connect(comp);

      this.sfx = c.createGain();
      this.sfx.gain.value = 0.7;
      this.sfx.connect(this.master);

      // 808 için distorsiyon zinciri
      this.bassDrive = c.createWaveShaper();
      this.bassDrive.curve = distortionCurve(6);
      this.bassDrive.oversample = "2x";
      const bassLp = c.createBiquadFilter();
      bassLp.type = "lowpass";
      bassLp.frequency.value = 1100;
      this.bassDrive.connect(bassLp);
      bassLp.connect(this.music);

      const len = c.sampleRate * 2;
      this.noise = c.createBuffer(1, len, c.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  /** Cihazda kayıtlı kendi şarkısını yükler (varsa). */
  async loadSaved() {
    if (this.custom) return this.customName;
    const f = await loadCustomTrack();
    if (f) this.useFile(f);
    return this.customName;
  }

  /** Oyuncunun seçtiği ses dosyasını müzik olarak kullan ve cihazda sakla. */
  async setCustom(file: File | null) {
    const playing = this.timer !== null || (this.custom != null && !this.custom.paused);
    this.stopMusic();
    if (this.customUrl) URL.revokeObjectURL(this.customUrl);
    this.custom = null;
    this.customUrl = null;
    this.customName = null;
    if (file) {
      this.useFile(file);
      await saveCustomTrack(file);
    } else await clearCustomTrack();
    if (playing) this.startMusic();
  }

  private useFile(f: File) {
    this.customUrl = URL.createObjectURL(f);
    this.custom = new Audio(this.customUrl);
    this.custom.loop = true;
    this.custom.volume = 0.6;
    this.custom.muted = this.muted;
    this.customName = f.name.replace(/\.[^.]+$/, "");
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem("gl-muted", m ? "1" : "0");
    } catch {}
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.05);
    if (this.custom) this.custom.muted = m;
  }

  // ---------- Yardımcılar ----------
  private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, dest: AudioNode, opts: { to?: number; cutoff?: number; attack?: number; glideFrom?: number } = {}) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    if (opts.glideFrom) {
      o.frequency.setValueAtTime(opts.glideFrom, t);
      o.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
    } else o.frequency.setValueAtTime(freq, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    const a = opts.attack ?? 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out: AudioNode = g;
    if (opts.cutoff) {
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = opts.cutoff;
      g.connect(f);
      out = f;
    }
    o.connect(g);
    out.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseHit(t: number, dur: number, vol: number, dest: AudioNode, type: BiquadFilterType, freq: number, toFreq?: number, q = 1) {
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (toFreq) f.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  /** Phonk cowbell: iki kare dalga + bant geçiren filtre, kısa sönüm. */
  private cowbell(note: number, t: number, vol: number) {
    const c = this.ctx!;
    const f = midi(note);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = f * 1.25;
    bp.Q.value = 2.5;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    bp.connect(g);
    g.connect(this.music);
    for (const mul of [1, 1.4836]) {
      const o = c.createOscillator();
      o.type = "square";
      o.frequency.value = f * mul;
      o.connect(bp);
      o.start(t);
      o.stop(t + 0.35);
    }
  }

  private kick(t: number) {
    this.tone(170, t, 0.32, "sine", 1, this.music, { to: 42 });
    this.noiseHit(t, 0.015, 0.4, this.music, "highpass", 3000);
  }

  private clap(t: number) {
    for (let i = 0; i < 3; i++) this.noiseHit(t + i * 0.012, 0.03, 0.35, this.music, "bandpass", 1400, undefined, 1.5);
    this.noiseHit(t + 0.036, 0.22, 0.4, this.music, "bandpass", 1600, 900, 1.2);
  }

  private hat(t: number, vol: number) {
    this.noiseHit(t, 0.035, vol, this.music, "highpass", 8500);
  }

  private bass808(note: number, t: number, dur: number) {
    this.tone(midi(note), t, dur, "sine", 0.9, this.bassDrive, { glideFrom: midi(note + 5) });
  }

  // ---------- Müzik ----------
  startMusic() {
    if (this.source === "youtube") return; // YouTube oynatıcısı kendisi çalar
    if (this.source === "custom" && this.custom) {
      this.custom.currentTime = 0;
      void this.custom.play().catch(() => {});
      return;
    }
    if (!this.ctx || this.timer) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stopMusic() {
    this.custom?.pause();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule() {
    const c = this.ctx!;
    const sixteenth = 60 / BPM / 4;
    while (this.nextTime < c.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime, sixteenth);
      this.nextTime += sixteenth;
      this.step = (this.step + 1) % 64;
    }
  }

  private playStep(step: number, t: number, len: number) {
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;

    // Davul
    if (KICKS[bar].includes(s)) {
      this.kick(t);
      this.bass808(BASS[bar], t, s === 0 ? len * 6 : len * 3.5);
    }
    if (s === 8) this.clap(t);
    // Hi-hat: 8'likler, son ölçüde trap tarzı hızlı rulolar
    if (bar === 3 && s >= 12) {
      this.hat(t, 0.1);
      this.hat(t + len / 2, 0.07);
    } else if (s % 2 === 0) this.hat(t, s % 4 === 2 ? 0.12 : 0.07);

    // Cowbell melodisi
    for (const [st, note] of COWBELL[bar]) if (st === s) this.cowbell(note, t, 0.16);

    // Karanlık pad
    if (s === 0) for (const n of PAD[bar]) this.tone(midi(n), t, len * 16, "sawtooth", 0.022, this.music, { cutoff: 700, attack: 0.3 });
  }

  // ---------- Motor ----------
  startEngine() {
    if (!this.ctx || this.engineGain) return;
    const c = this.ctx;
    this.engineGain = c.createGain();
    this.engineGain.gain.value = 0;
    const drive = c.createWaveShaper();
    drive.curve = distortionCurve(3);
    this.engineFilter = c.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.value = 500;
    drive.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfx);
    for (const [type, det] of [
      ["sawtooth", 0],
      ["sawtooth", 12],
      ["square", -1200],
    ] as [OscillatorType, number][]) {
      const o = c.createOscillator();
      o.type = type;
      o.detune.value = det;
      o.frequency.value = 50;
      o.connect(drive);
      o.start();
      this.engineOsc.push(o);
    }

    // Lastik ötmesi: sürekli gürültü → dar bant filtre (titreşimli) → ses seviyesi drift'e bağlı
    this.skidGain = c.createGain();
    this.skidGain.gain.value = 0;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2900;
    bp.Q.value = 9;
    const bp2 = c.createBiquadFilter();
    bp2.type = "bandpass";
    bp2.frequency.value = 4100;
    bp2.Q.value = 12;
    this.skidLfo = c.createOscillator();
    this.skidLfo.frequency.value = 9;
    const lfoAmt = c.createGain();
    lfoAmt.gain.value = 350;
    this.skidLfo.connect(lfoAmt);
    lfoAmt.connect(bp.frequency);
    lfoAmt.connect(bp2.frequency);
    this.skidSrc = c.createBufferSource();
    this.skidSrc.buffer = this.noise;
    this.skidSrc.loop = true;
    this.skidSrc.connect(bp);
    this.skidSrc.connect(bp2);
    bp.connect(this.skidGain);
    bp2.connect(this.skidGain);
    this.skidGain.connect(this.sfx);
    this.skidSrc.start();
    this.skidLfo.start();
  }

  /** speed: 0..1, boost: turbo aktif mi. Sanal vites: devir her viteste yükselip düşer. */
  setEngine(speed: number, boost: boolean) {
    if (!this.ctx || !this.engineGain) return;
    const t = this.ctx.currentTime;
    const gears = 4;
    const g = Math.min(gears - 1, Math.floor(speed * gears));
    const rev = speed * gears - g; // vites içindeki devir 0..1
    const f = 38 + g * 7 + rev * 70 + (boost ? 25 : 0);
    for (const o of this.engineOsc) o.frequency.setTargetAtTime(f, t, 0.05);
    this.engineFilter!.frequency.setTargetAtTime(500 + rev * 900 + speed * 700 + (boost ? 900 : 0), t, 0.06);
    this.engineGain.gain.setTargetAtTime(0.04 + speed * 0.06, t, 0.1);
    // Turbo bitince "pşşt" (blow-off)
    if (this.wasBoost && !boost) this.noiseHit(t, 0.4, 0.35, this.sfx, "highpass", 2500, 6000);
    this.wasBoost = boost;
  }

  /** amount: 0..1 — yan kayma miktarı */
  setDrift(amount: number) {
    if (!this.ctx || !this.skidGain) return;
    this.skidGain.gain.setTargetAtTime(amount * 0.22, this.ctx.currentTime, amount > 0 ? 0.03 : 0.08);
  }

  stopEngine() {
    this.engineOsc.forEach((o) => o.stop());
    this.engineOsc = [];
    this.engineGain?.disconnect();
    this.engineGain = null;
    this.skidSrc?.stop();
    this.skidLfo?.stop();
    this.skidGain?.disconnect();
    this.skidSrc = null;
    this.skidLfo = null;
    this.skidGain = null;
  }

  // ---------- Efektler ----------
  private get now() {
    return this.ctx?.currentTime ?? 0;
  }
  beep(high = false) {
    if (!this.ctx) return;
    // Geri sayım: cowbell ile
    this.cowbell(high ? 85 : 78, this.now, 0.35);
    if (high) this.kick(this.now);
  }
  pickup() {
    if (!this.ctx) return;
    const t = this.now;
    [78, 81, 85].forEach((n, i) => this.cowbell(n, t + i * 0.06, 0.25));
  }
  turbo() {
    if (!this.ctx) return;
    const t = this.now;
    this.noiseHit(t, 0.8, 0.45, this.sfx, "bandpass", 300, 3500, 2);
    this.tone(90, t, 0.6, "sawtooth", 0.2, this.sfx, { to: 220, cutoff: 1500 });
  }
  missile() {
    if (!this.ctx) return;
    this.tone(900, this.now, 0.5, "sawtooth", 0.18, this.sfx, { to: 180, cutoff: 2500 });
    this.noiseHit(this.now, 0.5, 0.2, this.sfx, "bandpass", 1200, 400);
  }
  explosion(vol = 1) {
    if (!this.ctx) return;
    const t = this.now;
    this.noiseHit(t, 0.7, 0.7 * vol, this.sfx, "lowpass", 3000, 100);
    this.tone(110, t, 0.5, "sine", 0.7 * vol, this.sfx, { to: 30 });
  }
  shield() {
    if (!this.ctx) return;
    const t = this.now;
    [66, 70, 73].forEach((n) => this.tone(midi(n), t, 0.7, "triangle", 0.12, this.sfx, { attack: 0.05 }));
  }
  zap() {
    if (!this.ctx) return;
    this.tone(1400, this.now, 0.35, "square", 0.12, this.sfx, { to: 90, cutoff: 5000 });
    this.noiseHit(this.now, 0.3, 0.25, this.sfx, "highpass", 4000);
  }
  lap() {
    if (!this.ctx) return;
    const t = this.now;
    this.cowbell(81, t, 0.3);
    this.cowbell(85, t + 0.12, 0.3);
  }
  finish() {
    if (!this.ctx) return;
    const t = this.now;
    [78, 81, 85, 90, 85, 90].forEach((n, i) => this.cowbell(n, t + i * 0.11, 0.3));
    this.kick(t + 0.66);
  }

  stopAll() {
    this.stopMusic();
    this.stopEngine();
  }
}

let instance: RaceAudio | null = null;
export const raceAudio = () => (instance ??= new RaceAudio());
