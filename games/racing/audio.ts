"use client";

/**
 * Tarayıcıda üretilen synthwave müziği + ses efektleri (Web Audio API).
 * Dosya indirmez, telif sorunu yoktur.
 */
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// Am – F – C – G (her biri 1 ölçü)
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [55, 60, 64],
  [55, 59, 62],
];
const ROOTS = [45, 41, 48, 43];
const BPM = 118;

class RaceAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private noise!: AudioBuffer;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private engineOsc: OscillatorNode[] = [];
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem("gl-muted") === "1";
    } catch {}
  }

  /** Kullanıcı dokunuşu içinde çağrılmalı (tarayıcı kuralı). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.music.gain.value = 0.32;
      this.music.connect(this.master);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.7;
      this.sfx.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem("gl-muted", m ? "1" : "0");
    } catch {}
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  // ---------- Yardımcılar ----------
  private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, dest: AudioNode, opts: { to?: number; cutoff?: number; attack?: number } = {}) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    const a = opts.attack ?? 0.005;
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

  private noiseHit(t: number, dur: number, vol: number, dest: AudioNode, type: BiquadFilterType, freq: number, toFreq?: number) {
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (toFreq) f.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // ---------- Müzik ----------
  startMusic() {
    if (!this.ctx || this.timer) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule() {
    const c = this.ctx!;
    const sixteenth = 60 / BPM / 4;
    while (this.nextTime < c.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += sixteenth;
      this.step = (this.step + 1) % 64;
    }
  }

  private playStep(step: number, t: number) {
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    const m = this.music;
    const chord = CHORDS[bar];
    // Davul
    if (s % 4 === 0) this.tone(150, t, 0.28, "sine", 0.9, m, { to: 40 });
    if (s === 4 || s === 12) {
      this.noiseHit(t, 0.16, 0.35, m, "bandpass", 1800);
      this.tone(190, t, 0.1, "triangle", 0.25, m);
    }
    if (s % 2 === 1) this.noiseHit(t, s % 4 === 3 ? 0.06 : 0.03, s % 4 === 3 ? 0.12 : 0.06, m, "highpass", 8000);
    // Bas
    if (s % 2 === 0) this.tone(midi(ROOTS[bar] - 12 + (s % 4 === 2 ? 12 : 0)), t, 0.22, "sawtooth", 0.28, m, { cutoff: 700 });
    // Arpej
    const arp = [0, 1, 2, 1][s % 4];
    this.tone(midi(chord[arp] + 12), t, 0.12, "square", 0.05, m, { cutoff: 2600 });
    // Pad
    if (s === 0) for (const n of chord) this.tone(midi(n), t, (60 / BPM) * 4, "sawtooth", 0.04, m, { cutoff: 1200, attack: 0.4 });
  }

  // ---------- Motor ----------
  startEngine() {
    if (!this.ctx || this.engineGain) return;
    const c = this.ctx;
    this.engineGain = c.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter = c.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.value = 500;
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfx);
    for (const [type, det] of [
      ["sawtooth", 0],
      ["square", 7],
    ] as [OscillatorType, number][]) {
      const o = c.createOscillator();
      o.type = type;
      o.detune.value = det;
      o.frequency.value = 50;
      o.connect(this.engineFilter);
      o.start();
      this.engineOsc.push(o);
    }
  }

  /** speed: 0..1, boost: turbo aktif mi */
  setEngine(speed: number, boost: boolean) {
    if (!this.ctx || !this.engineGain) return;
    const t = this.ctx.currentTime;
    const f = 45 + speed * 95 + (boost ? 30 : 0);
    for (const o of this.engineOsc) o.frequency.setTargetAtTime(f, t, 0.08);
    this.engineFilter!.frequency.setTargetAtTime(400 + speed * 900 + (boost ? 600 : 0), t, 0.1);
    this.engineGain.gain.setTargetAtTime(0.05 + speed * 0.07, t, 0.1);
  }

  stopEngine() {
    this.engineOsc.forEach((o) => o.stop());
    this.engineOsc = [];
    this.engineGain?.disconnect();
    this.engineGain = null;
  }

  // ---------- Efektler ----------
  private get now() {
    return this.ctx?.currentTime ?? 0;
  }
  beep(high = false) {
    if (!this.ctx) return;
    this.tone(high ? 880 : 440, this.now, high ? 0.6 : 0.25, "square", 0.25, this.sfx, { cutoff: 3000 });
  }
  pickup() {
    if (!this.ctx) return;
    const t = this.now;
    [660, 880, 1320].forEach((f, i) => this.tone(f, t + i * 0.05, 0.12, "triangle", 0.25, this.sfx));
  }
  turbo() {
    if (!this.ctx) return;
    this.noiseHit(this.now, 0.7, 0.4, this.sfx, "bandpass", 400, 3000);
  }
  missile() {
    if (!this.ctx) return;
    this.tone(900, this.now, 0.5, "sawtooth", 0.18, this.sfx, { to: 180, cutoff: 2500 });
  }
  explosion(vol = 1) {
    if (!this.ctx) return;
    const t = this.now;
    this.noiseHit(t, 0.6, 0.6 * vol, this.sfx, "lowpass", 2500, 120);
    this.tone(120, t, 0.4, "sine", 0.6 * vol, this.sfx, { to: 35 });
  }
  shield() {
    if (!this.ctx) return;
    const t = this.now;
    [523, 659, 784].forEach((f) => this.tone(f, t, 0.6, "sine", 0.12, this.sfx, { attack: 0.05 }));
  }
  zap() {
    if (!this.ctx) return;
    this.tone(1400, this.now, 0.35, "square", 0.12, this.sfx, { to: 90, cutoff: 5000 });
  }
  lap() {
    if (!this.ctx) return;
    const t = this.now;
    this.tone(784, t, 0.15, "square", 0.18, this.sfx, { cutoff: 4000 });
    this.tone(1047, t + 0.12, 0.3, "square", 0.18, this.sfx, { cutoff: 4000 });
  }
  finish() {
    if (!this.ctx) return;
    const t = this.now;
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.12, 0.3, "square", 0.18, this.sfx, { cutoff: 4000 }));
  }

  stopAll() {
    this.stopMusic();
    this.stopEngine();
  }
}

let instance: RaceAudio | null = null;
export const raceAudio = () => (instance ??= new RaceAudio());
