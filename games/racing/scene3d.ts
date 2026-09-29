"use client";

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildCarModel, plateTex, type CarRig } from "@/games/racing/carModel";
import { animateRealWheels, loadRealCar, makeRealBody, type RealBody } from "@/games/racing/realCar";
import { SkidMarks, TireSmoke } from "@/games/racing/effects";
import { FlagStarter } from "@/games/racing/starter";
import { buildCity } from "@/games/racing/cityWorld";
import { TRAFFIC_COUNT, makeTraffic, trafficPose, type TrafficCar } from "@/games/racing/traffic";
import { colorOf, type Car, type Missile, type Oil } from "@/games/racing/engine";
import type { Particle } from "@/games/racing/render";
import { TRACK_W, WORLD_H, WORLD_W, dirAt, nearest, type Track } from "@/games/racing/track";

const MAX_PARTS = 800;

// ---------- Doku üreticileri (tuvalden) ----------
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = false) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const asphaltTex = () =>
  canvasTex(
    128,
    256,
    (g) => {
      g.fillStyle = "#2c2852";
      g.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.07})`;
        g.fillRect(Math.random() * 128, Math.random() * 256, 1.5, 1.5);
      }
      g.fillStyle = "rgba(255,255,255,0.8)";
      g.fillRect(61, 0, 6, 128); // kesikli orta çizgi
      g.fillStyle = "rgba(34,211,238,0.12)";
      g.fillRect(0, 0, 3, 256);
      g.fillRect(125, 0, 3, 256);
    },
    true,
  );

const gridTex = () =>
  canvasTex(
    256,
    256,
    (g) => {
      g.fillStyle = "#040312";
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = "rgba(139,92,246,0.35)";
      g.lineWidth = 2;
      g.strokeRect(0, 0, 256, 256);
      g.strokeStyle = "rgba(139,92,246,0.12)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(128, 0);
      g.lineTo(128, 256);
      g.moveTo(0, 128);
      g.lineTo(256, 128);
      g.stroke();
    },
    true,
  );

const windowsTex = () =>
  canvasTex(
    64,
    128,
    (g) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, 64, 128);
      const cols = ["#fde68a", "#a5f3fc", "#f9a8d4", "#c4b5fd"];
      for (let y = 4; y < 128; y += 12)
        for (let x = 4; x < 64; x += 12)
          if (Math.random() < 0.45) {
            g.fillStyle = cols[Math.floor(Math.random() * cols.length)];
            g.globalAlpha = 0.5 + Math.random() * 0.5;
            g.fillRect(x, y, 6, 7);
          }
    },
    true,
  );

const questionTex = () =>
  canvasTex(128, 128, (g) => {
    const grd = g.createLinearGradient(0, 0, 128, 128);
    grd.addColorStop(0, "#f472b6");
    grd.addColorStop(1, "#8b5cf6");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = "#fff";
    g.lineWidth = 6;
    g.strokeRect(5, 5, 118, 118);
    g.fillStyle = "#fff";
    g.font = "bold 90px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("?", 64, 70);
  });

let glowTexCache: THREE.Texture | null = null;
const glowTex = () =>
  (glowTexCache ??= canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    r.addColorStop(0, "rgba(255,255,255,0.9)");
    r.addColorStop(0.5, "rgba(255,255,255,0.35)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  }));

const checkerTex = () =>
  canvasTex(
    64,
    64,
    (g) => {
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          g.fillStyle = (x + y) % 2 ? "#fff" : "#111";
          g.fillRect(x * 16, y * 16, 16, 16);
        }
    },
    true,
  );

function labelSprite(text: string, color: string, bold: boolean) {
  const tex = canvasTex(256, 64, (g) => {
    g.font = `${bold ? "bold " : ""}30px sans-serif`;
    const w = Math.min(250, g.measureText(text).width + 24);
    g.fillStyle = "rgba(5,4,11,0.65)";
    g.beginPath();
    g.roundRect(128 - w / 2, 8, w, 46, 12);
    g.fill();
    g.fillStyle = color;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 128, 32, 240);
  });
  // Ekranda sabit boyut: kameraya yaklaşınca devleşmez.
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true, sizeAttenuation: false }));
  s.scale.set(0.22, 0.055, 1);
  s.position.y = 42;
  s.renderOrder = 10;
  return s;
}

type CarView = CarRig & {
  label: THREE.Sprite;
  prevFwd: number;
  prevA: number;
  pitch: number;
  roll: number;
  steer: number;
  bounce: number;
  real?: RealBody; // gerçekçi model (yüklenince)
  color: string;
};

export class Scene3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(68, 16 / 10, 1, 6000);
  private composer: EffectComposer | null = null;
  private cars = new Map<string, CarView>();
  private smoke: TireSmoke;
  private skids: SkidMarks;
  private starter: FlagStarter;
  private shake = 0;
  private traffic: { car: TrafficCar; view: CarView }[] = [];
  private pixelRatio = 1;
  private maxRatio = 1;
  private frameMs = 16;
  private disposed = false;
  private lastSpin = 0;
  private frame = 0;
  private missiles = new Map<string, THREE.Object3D>();
  private oils = new Map<string, THREE.Mesh>();
  private boxes: THREE.Mesh[] = [];
  private parts: THREE.Points;
  private partPos = new Float32Array(MAX_PARTS * 3);
  private partCol = new Float32Array(MAX_PARTS * 3);
  private colorCache = new Map<string, THREE.Color>();
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private camAngle = 0;
  private missileGeo = new THREE.ConeGeometry(3.5, 16, 8);
  private oilGeo = new THREE.CircleGeometry(26, 24);
  private oilMat = new THREE.MeshStandardMaterial({ color: "#050507", metalness: 1, roughness: 0.05 });

  constructor(
    private canvas: HTMLCanvasElement,
    private track: Track,
    cars: Car[],
    private meId: string,
    private hq: boolean,
  ) {
    // Telefonda: kenar yumuşatma kapalı, 1x çözünürlük, daha kısa görüş mesafesi.
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    // Çözünürlük: cihazın izin verdiği en yüksekten başlar, kare hızı düşerse kendini ayarlar
    this.maxRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.pixelRatio = hq ? this.maxRatio : Math.min(this.maxRatio, 1.5);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.camera.far = hq ? 6000 : 2600;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.background = new THREE.Color("#070619");
    this.scene.fog = new THREE.Fog("#0a0820", 700, hq ? 2600 : 1900);
    this.scene.add(new THREE.HemisphereLight("#a78bfa", "#05040b", 0.7));
    const sun = new THREE.DirectionalLight("#ffffff", 1.1);
    sun.position.set(900, 1400, 600);
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight("#ffffff", 0.25));

    // Gerçekçi yansımalar için ortam haritası (boya, cam, krom)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = track.map === "sehir" ? 0.4 : 0.55;
    if (track.map === "sehir") this.renderer.toneMappingExposure = 0.78;
    pmrem.dispose();

    this.buildWorld();
    for (const c of cars) {
      const isMe = c.id === meId;
      const rig = buildCarModel(c.type, colorOf(c), { hq: true, beam: isMe || hq, clearcoat: hq });
      const label = labelSprite(c.name, isMe ? "#ffffff" : colorOf(c), isMe);
      label.position.y = 34;
      rig.group.add(label);
      this.scene.add(rig.group);
      this.cars.set(c.id, { ...rig, label, prevFwd: 0, prevA: c.a, pitch: 0, roll: 0, steer: 0, bounce: 0, color: colorOf(c) });
    }
    this.smoke = new TireSmoke(hq ? 900 : 350);
    this.skids = new SkidMarks(hq ? 2400 : 900);
    this.scene.add(this.skids.mesh, this.smoke.points);
    this.starter = new FlagStarter(track, hq);
    this.scene.add(this.starter.group);
    for (const tc of makeTraffic(track, TRAFFIC_COUNT)) {
      const rig = buildCarModel(tc.type, tc.color, { hq, beam: false, clearcoat: false });
      rig.glow.visible = false;
      this.scene.add(rig.group);
      this.traffic.push({ car: tc, view: { ...rig, label: new THREE.Sprite(), prevFwd: 0, prevA: 0, pitch: 0, roll: 0, steer: 0, bounce: 0, color: tc.color } });
    }

    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(this.partPos, 3));
    pg.setAttribute("color", new THREE.BufferAttribute(this.partCol, 3));
    this.parts = new THREE.Points(
      pg,
      new THREE.PointsMaterial({ size: 7, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.parts.frustumCulled = false;
    this.scene.add(this.parts);

    if (hq) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 320), 0.6, 0.45, 0.62));
      this.composer.addPass(new OutputPass());
    }

    const me = cars.find((c) => c.id === meId)!;
    this.camPos.set(me.x - Math.cos(me.a) * 160, 90, me.y - Math.sin(me.a) * 160);
    this.camLook.set(me.x, 10, me.y);
    this.camAngle = me.a;
    this.resize();
    // Gerçekçi araç modelini arka planda yükle; hazır olunca araçlara giydir
    loadRealCar()
      .then((tpl) => {
        if (this.disposed) return;
        const plate = plateTex();
        const views = [...this.cars.values(), ...this.traffic.map((x) => x.view)];
        for (const v of views) {
          v.real = makeRealBody(tpl, v.color, plate, this.hq);
          v.body.add(v.real.root);
          v.real.root.visible = false;
        }
      })
      .catch((e) => console.warn("[3B model]", e));
  }

  /** Neon arena: ızgara zemin, neon pist, bordürler, bariyerler, silüet. */
  private buildArena() {
    const t = this.track;
    const n = t.pts.length;
    // Zemin
    const gt = gridTex();
    gt.repeat.set(60, 60);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(9000, 9000),
      this.hq ? new THREE.MeshStandardMaterial({ map: gt, roughness: 0.95, envMapIntensity: 0.1 }) : new THREE.MeshLambertMaterial({ map: gt }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(WORLD_W / 2, -0.5, WORLD_H / 2);
    this.scene.add(ground);

    // Şerit tabanlı geometri üretici (pist, bordür, duvar)
    const strip = (inner: number, outer: number, y0: number, y1: number, color?: (i: number) => THREE.Color, uv = false) => {
      const pos: number[] = [],
        col: number[] = [],
        uvs: number[] = [],
        idx: number[] = [];
      for (let i = 0; i <= n; i++) {
        const k = i % n;
        const p = t.pts[k];
        const { dx, dy } = dirAt(t, k);
        const nx = -dy,
          ny = dx;
        pos.push(p.x + nx * inner, y0, p.y + ny * inner, p.x + nx * outer, y1, p.y + ny * outer);
        if (color) {
          const c = color(k);
          col.push(c.r, c.g, c.b, c.r, c.g, c.b);
        }
        if (uv) {
          const v = (i === n ? t.total : t.cum[k]) / 240;
          uvs.push(0, v, 1, v);
        }
        if (i < n) {
          const a = i * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      if (color) geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      if (uv) geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      return geo;
    };

    // Asfalt
    const road = new THREE.Mesh(
      strip(TRACK_W / 2, -TRACK_W / 2, 0.2, 0.2, undefined, true),
      this.hq
        ? new THREE.MeshStandardMaterial({ map: asphaltTex(), roughness: 0.75, metalness: 0.1, side: THREE.DoubleSide, envMapIntensity: 0.35 })
        : new THREE.MeshLambertMaterial({ map: asphaltTex(), side: THREE.DoubleSide }),
    );
    this.scene.add(road);

    // Bordürler: virajlarda kırmızı-beyaz, düzlüklerde neon
    const cyan = new THREE.Color("#22d3ee"),
      red = new THREE.Color("#ff2d55"),
      white = new THREE.Color("#ffffff");
    const curbColor = (k: number) => {
      const a = dirAt(t, k),
        b = dirAt(t, (k + 6) % n);
      if (a.dx * b.dx + a.dy * b.dy > 0.985) return cyan;
      return Math.floor(k / 2) % 2 ? red : white;
    };
    const curbMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.scene.add(new THREE.Mesh(strip(TRACK_W / 2, TRACK_W / 2 + 10, 0.6, 0.6, curbColor), curbMat));
    this.scene.add(new THREE.Mesh(strip(-TRACK_W / 2, -TRACK_W / 2 - 10, 0.6, 0.6, curbColor), curbMat));

    // Neon bariyerler
    const wallMat = new THREE.MeshBasicMaterial({ color: "#8b5cf6", transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
    const topMat = new THREE.MeshBasicMaterial({ color: "#c4b5fd", side: THREE.DoubleSide });
    for (const s of [1, -1]) {
      this.scene.add(new THREE.Mesh(strip(t.wall * s, t.wall * s, 0, 16), wallMat));
      this.scene.add(new THREE.Mesh(strip(t.wall * s, (t.wall + 3) * s, 16, 16), topMat));
    }

    // Şehir silueti — tüm binalar tek geometri/tek çizimde (telefonda akıcılık için)
    const wt = windowsTex();
    const edgeCols = ["#22d3ee", "#f472b6", "#8b5cf6", "#fbbf24"].map((c) => new THREE.Color(c));
    const boxGeos: THREE.BufferGeometry[] = [];
    const edgeGeos: THREE.BufferGeometry[] = [];
    const maxBuildings = this.hq ? 85 : 40;
    for (let tries = 0; tries < 900 && boxGeos.length < maxBuildings; tries++) {
      const x = -700 + Math.random() * (WORLD_W + 1400);
      const z = -700 + Math.random() * (WORLD_H + 1400);
      const w = 60 + Math.random() * 110,
        d = 60 + Math.random() * 110,
        h = 60 + Math.random() * 380;
      if (nearest(t, x, z).dist < t.wall + 40 + Math.max(w, d) / 2 + 30) continue;
      const geo = new THREE.BoxGeometry(w, h, d);
      const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (Math.max(w, d) / 40), uv.getY(i) * (h / 40));
      const edges = new THREE.EdgesGeometry(geo);
      geo.translate(x, h / 2, z);
      edges.translate(x, h / 2, z);
      const ec = edgeCols[boxGeos.length % edgeCols.length];
      const cols = new Float32Array(edges.getAttribute("position").count * 3);
      for (let i = 0; i < cols.length; i += 3) cols.set([ec.r, ec.g, ec.b], i);
      edges.setAttribute("color", new THREE.BufferAttribute(cols, 3));
      boxGeos.push(geo);
      edgeGeos.push(edges);
    }
    const city = mergeGeometries(boxGeos);
    const cityEdges = mergeGeometries(edgeGeos);
    boxGeos.forEach((g) => g.dispose());
    edgeGeos.forEach((g) => g.dispose());
    const cityMat = this.hq
      ? new THREE.MeshStandardMaterial({ color: "#0d0b22", emissive: "#ffffff", emissiveMap: wt, emissiveIntensity: 0.85, roughness: 0.85 })
      : new THREE.MeshLambertMaterial({ color: "#0d0b22", emissive: "#ffffff", emissiveMap: wt, emissiveIntensity: 0.85 });
    this.scene.add(new THREE.Mesh(city, cityMat));
    this.scene.add(new THREE.LineSegments(cityEdges, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 })));

  }

  private buildWorld() {
    const t = this.track;
    if (t.map === "sehir") buildCity(this.scene, t, this.hq);
    else this.buildArena();

    // Başlangıç çizgisi
    const p0 = t.pts[0];
    const d0 = dirAt(t, 0);
    const ct = checkerTex();
    ct.repeat.set(1, t.width / 32);
    const start = new THREE.Mesh(new THREE.PlaneGeometry(24, t.width), new THREE.MeshBasicMaterial({ map: ct }));
    start.rotation.x = -Math.PI / 2;
    start.rotation.z = -Math.atan2(d0.dy, d0.dx);
    start.position.set(p0.x, 0.9, p0.y);
    this.scene.add(start);

    // Başlangıç kemeri
    const archMat = new THREE.MeshStandardMaterial({ color: "#111827", emissive: "#f472b6", emissiveIntensity: 0.6 });
    const nx = -d0.dy,
      ny = d0.dx;
    for (const s of [1, -1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(8, 90, 8), archMat);
      post.position.set(p0.x + nx * (t.wall + 10) * s, 45, p0.y + ny * (t.wall + 10) * s);
      this.scene.add(post);
    }
    const bannerTex = canvasTex(1024, 128, (g) => {
      g.fillStyle = "#0b0720";
      g.fillRect(0, 0, 1024, 128);
      const grd = g.createLinearGradient(0, 0, 1024, 0);
      grd.addColorStop(0, "#8b5cf6");
      grd.addColorStop(0.5, "#22d3ee");
      grd.addColorStop(1, "#f472b6");
      g.fillStyle = grd;
      g.font = "bold 78px sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("GAME LOVER · ÇORUM", 512, 68);
    });
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
    // Uzun kenar (z) pistin karşısına uzanır; yazılı yüzler (±x) sürüş yönüne bakar.
    const banner = new THREE.Mesh(new THREE.BoxGeometry(6, 34, (t.wall + 10) * 2 + 8), [bannerMat, bannerMat, archMat, archMat, archMat, archMat]);
    banner.position.set(p0.x, 96, p0.y);
    banner.rotation.y = Math.atan2(nx, ny);
    this.scene.add(banner);

    // Yıldızlar
    const sp: number[] = [];
    for (let i = 0; i < (this.hq ? 900 : 300); i++) {
      const th = Math.random() * Math.PI * 2,
        ph = Math.random() * Math.PI * 0.45;
      sp.push(WORLD_W / 2 + Math.cos(th) * Math.sin(ph) * 4000, Math.cos(ph) * 3000 + 300, WORLD_H / 2 + Math.sin(th) * Math.sin(ph) * 4000);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    this.scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: "#ffffff", size: 3, sizeAttenuation: false, fog: false })));

    // Soru kutuları
    const qMat = new THREE.MeshStandardMaterial({ map: questionTex(), emissive: "#ffffff", emissiveMap: questionTex(), emissiveIntensity: 0.55, transparent: true, opacity: 0.95 });
    const qGeo = new THREE.BoxGeometry(22, 22, 22);
    for (const b of t.boxes) {
      const m = new THREE.Mesh(qGeo, qMat);
      m.position.set(b.x, 20, b.y);
      this.scene.add(m);
      this.boxes.push(m);
    }
  }

  /** Yakındaki araçlar gerçekçi modelle, uzaktakiler hafif modelle çizilir. */
  private applyLod(m: CarView, x: number, y: number, fwd: number, dt: number) {
    const d = Math.hypot(x - this.camPos.x, y - this.camPos.z);
    const near = !!m.real && d < (this.hq ? 1400 : 650);
    m.shell.visible = !near;
    if (m.real) m.real.root.visible = near;
    if (near) animateRealWheels(m.real!, fwd, m.steer, dt);
    else {
      for (const p of m.frontPivots) p.rotation.y = m.steer;
      for (const w of m.spinners) w.rotation.z -= (fwd / m.wheelR) * dt;
    }
  }

  resize() {
    const w = this.canvas.clientWidth || 960,
      h = this.canvas.clientHeight || 600;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private col(c: string) {
    let v = this.colorCache.get(c);
    if (!v) {
      v = new THREE.Color(c);
      this.colorCache.set(c, v);
    }
    return v;
  }

  update(s: { now: number; dt: number; cars: Car[]; boxesAt: number[]; missiles: Missile[]; oils: Oil[]; parts: Particle[]; countdownMs: number; sinceStartMs: number }) {
    const { now, dt } = s;
    this.frame++;
    // Uyarlanabilir çözünürlük (her ~1.5 sn)
    this.frameMs = this.frameMs * 0.95 + dt * 16.667 * 0.05;
    if (this.frame % 90 === 0) {
      let r = this.pixelRatio;
      if (this.frameMs > 21 && r > 1) r = Math.max(1, r - 0.25);
      else if (this.frameMs < 17.5 && r < this.maxRatio) r = Math.min(this.maxRatio, r + 0.25);
      if (r !== this.pixelRatio) {
        this.pixelRatio = r;
        this.renderer.setPixelRatio(r);
        this.resize();
      }
    }
    // Araçlar: süspansiyon, direksiyon, tekerlek dönüşü, fren lambası, duman ve iz
    const me0 = s.cars.find((c) => c.id === this.meId)!;
    for (const c of s.cars) {
      const m = this.cars.get(c.id);
      if (!m) continue;
      m.group.position.set(c.x, 0, c.y);
      m.group.rotation.y = -c.a;
      const fx = Math.cos(c.a),
        fy = Math.sin(c.a);
      const fwd = c.vx * fx + c.vy * fy;
      const speed = Math.hypot(c.vx, c.vy);
      const accel = (fwd - m.prevFwd) / Math.max(0.2, dt);
      let yaw = c.a - m.prevA;
      while (yaw > Math.PI) yaw -= Math.PI * 2;
      while (yaw < -Math.PI) yaw += Math.PI * 2;
      const yawRate = yaw / Math.max(0.2, dt);
      m.prevFwd = fwd;
      m.prevA = c.a;
      const spinning = now < c.spinUntil;

      // Süspansiyon: gazda arka çöker (burun kalkar), frende burun dalar; virajda dışa yatar
      const pitchT = Math.max(-0.07, Math.min(0.07, accel * 0.35));
      const rollT = Math.max(-0.09, Math.min(0.09, yawRate * fwd * 0.12));
      m.pitch += (pitchT - m.pitch) * Math.min(1, 0.12 * dt);
      m.roll += (rollT - m.roll) * Math.min(1, 0.15 * dt);
      m.bounce = spinning ? Math.abs(Math.sin(now / 90)) * 5 : Math.sin(now / 70 + c.x * 0.01) * Math.min(0.35, speed * 0.04);
      m.body.rotation.z = m.pitch;
      m.body.rotation.x = m.roll;
      m.body.position.y = m.bounce;

      // Ön tekerlekler direksiyonla döner, tüm tekerlekler hızla döner
      const steerT = spinning ? 0 : Math.max(-0.5, Math.min(0.5, -yawRate * 9));
      m.steer += (steerT - m.steer) * Math.min(1, 0.3 * dt);
      this.applyLod(m, c.x, c.y, fwd, dt);

      // Fren lambası
      const braking = accel < -0.06 || (c.drift > 2 && fwd > 3);
      m.brakeMat.emissiveIntensity += ((braking ? 4 : 1) - m.brakeMat.emissiveIntensity) * 0.3;
      if (m.real?.brake) m.real.brake.emissiveIntensity = m.brakeMat.emissiveIntensity * 1.5;

      m.shield.visible = now < c.shieldUntil;
      if (m.shield.visible) m.shield.scale.setScalar(1 + Math.sin(now / 90) * 0.04);
      m.flames.visible = now < c.boostUntil;
      if (m.flames.visible) m.flames.scale.set(0.7 + Math.random() * 0.7, 1, 1);
      (m.glow.material as THREE.MeshBasicMaterial).opacity = now < c.slowUntil ? 0.1 + Math.random() * 0.4 : 0.32;

      // Drift: arka tekerleklerden duman ve yolda iz
      const sliding = (c.drift > 1.3 && speed > 3.5) || spinning;
      const near = Math.abs(c.x - me0.x) + Math.abs(c.y - me0.y) < (this.hq ? 1800 : 900);
      if (sliding && near && (this.hq || this.frame % 2 === 0)) {
        const strength = spinning ? 1.4 : Math.min(1.6, (c.drift - 1.1) / 2);
        for (const side of [-1, 1]) {
          const wx = c.x + fx * m.rearAxle - fy * side * m.halfTrack;
          const wz = c.y + fy * m.rearAxle + fx * side * m.halfTrack;
          this.smoke.emit(wx, wz, c.vx, c.vy, strength);
          this.skids.add(wx, wz, c.a);
        }
      }
    }
    this.smoke.update(dt);
    this.starter.update(s.sinceStartMs, dt, now);
    // Şehir trafiği
    for (const { car, view } of this.traffic) {
      const p = trafficPose(this.track, car, s.sinceStartMs);
      view.group.position.set(p.x, 0, p.y);
      view.group.rotation.y = -p.a;
      this.applyLod(view, p.x, p.y, p.speed, dt);
    }

    // Kutular
    this.boxes.forEach((b, i) => {
      b.visible = now >= s.boxesAt[i];
      b.rotation.set(now / 900 + i, now / 700 + i, 0);
      b.position.y = 20 + Math.sin(now / 300 + i) * 4;
    });

    // Roketler
    const live = new Set<string>();
    for (const mi of s.missiles) {
      live.add(mi.id);
      let o = this.missiles.get(mi.id);
      if (!o) {
        o = new THREE.Mesh(this.missileGeo, new THREE.MeshBasicMaterial({ color: "#fbbf24" }));
        o.rotation.order = "YXZ";
        this.scene.add(o);
        this.missiles.set(mi.id, o);
      }
      o.position.set(mi.x, 12, mi.y);
      o.rotation.set(0, -mi.a, -Math.PI / 2, "YXZ");
      s.parts.push({ x: mi.x, y: mi.y, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, life: 1, c: "#fbbf24", s: 4 });
    }
    for (const [id, o] of this.missiles)
      if (!live.has(id)) {
        this.scene.remove(o);
        ((o as THREE.Mesh).material as THREE.Material).dispose(); // geometri ortak, silinmez
        this.missiles.delete(id);
      }

    // Yağ birikintileri
    const liveOil = new Set<string>();
    for (const ol of s.oils) {
      liveOil.add(ol.id);
      if (!this.oils.has(ol.id)) {
        const m = new THREE.Mesh(this.oilGeo, this.oilMat);
        m.rotation.x = -Math.PI / 2;
        m.scale.set(1, 0.7, 1);
        m.position.set(ol.x, 1, ol.y);
        this.scene.add(m);
        this.oils.set(ol.id, m);
      }
    }
    for (const [id, m] of this.oils)
      if (!liveOil.has(id)) {
        this.scene.remove(m);
        this.oils.delete(id);
      }

    // Parçacıklar
    let k = 0;
    for (let i = s.parts.length - 1; i >= 0; i--) {
      const p = s.parts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= 0.03 * dt;
      if (p.life <= 0) {
        s.parts.splice(i, 1);
        continue;
      }
      if (k >= MAX_PARTS) continue;
      this.partPos[k * 3] = p.x;
      this.partPos[k * 3 + 1] = 6 + (1 - p.life) * 22;
      this.partPos[k * 3 + 2] = p.y;
      const c = this.col(p.c);
      this.partCol[k * 3] = c.r * p.life;
      this.partCol[k * 3 + 1] = c.g * p.life;
      this.partCol[k * 3 + 2] = c.b * p.life;
      k++;
    }
    this.parts.geometry.setDrawRange(0, k);
    this.parts.geometry.attributes.position.needsUpdate = true;
    this.parts.geometry.attributes.color.needsUpdate = true;

    // Takip kamerası: aracın arkasına kilitli, sadece yön yumuşatılır (hızda geri kalmaz).
    const me = s.cars.find((c) => c.id === this.meId)!;
    let da = me.a - this.camAngle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    this.camAngle += da * (1 - Math.pow(0.9, dt));
    let back = 120,
      up = 58,
      orbit = 0;
    if (s.countdownMs > 0) {
      // Geri sayımda aracın etrafında dönerek arkasına yerleş
      const k2 = Math.min(1, s.countdownMs / 3600);
      orbit = k2 * Math.PI * 1.1;
      back += k2 * 60;
      up += k2 * 40;
    }
    const ang = this.camAngle + orbit;
    const fx = Math.cos(this.camAngle),
      fy = Math.sin(this.camAngle);
    this.camPos.set(me.x - Math.cos(ang) * back, up, me.y - Math.sin(ang) * back);
    this.camLook.set(me.x + fx * 45, 7, me.y + fy * 45);
    if (me.spinUntil > this.lastSpin && now < me.spinUntil) this.shake = 1;
    this.lastSpin = me.spinUntil;
    if (this.shake > 0.01) {
      this.camPos.x += (Math.random() - 0.5) * 6 * this.shake;
      this.camPos.y += (Math.random() - 0.5) * 4 * this.shake;
      this.camPos.z += (Math.random() - 0.5) * 6 * this.shake;
      this.shake *= Math.pow(0.9, dt);
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    const speed = Math.hypot(me.vx, me.vy);
    const fov = 66 + Math.min(14, speed * 0.9) + (now < me.boostUntil ? 8 : 0);
    this.camera.fov += (fov - this.camera.fov) * 0.1;
    this.camera.updateProjectionMatrix();

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose?.();
    });
    this.composer?.dispose();
    this.renderer.dispose();
  }
}
