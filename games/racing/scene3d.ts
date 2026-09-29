"use client";

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { colorOf, type Car, type CarType, type Missile, type Oil } from "@/games/racing/engine";
import type { Particle } from "@/games/racing/render";
import { TRACK_W, WORLD_H, WORLD_W, dirAt, nearest, type Track } from "@/games/racing/track";

const WALL = TRACK_W / 2 + 55;
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

// ---------- Araç modeli ----------
type CarMesh = { group: THREE.Group; body: THREE.Group; shield: THREE.Mesh; flames: THREE.Group; glow: THREE.Mesh; wheels: THREE.Mesh[] };

function buildCar(type: CarType, color: string, name: string, isMe: boolean, hq: boolean): CarMesh {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.65, roughness: 0.28, emissive: color, emissiveIntensity: 0.12 });
  const dark = new THREE.MeshStandardMaterial({ color: "#0b0f1f", metalness: 0.9, roughness: 0.15 });
  const black = new THREE.MeshStandardMaterial({ color: "#0a0a0f", roughness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: "#f8fafc", metalness: 0.4, roughness: 0.3 });

  const dims = type === "tank" ? { l: 40, h: 12, w: 25 } : type === "avci" ? { l: 42, h: 8, w: 20 } : { l: 40, h: 9, w: 21 };
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(dims.l, dims.h, dims.w), paint);
  chassis.position.y = 4 + dims.h / 2;
  body.add(chassis);

  // Yan şerit (telefonda atlanır)
  if (hq) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(dims.l * 0.9, 1.6, dims.w + 0.4), white);
    stripe.position.y = 4 + dims.h * 0.55;
    body.add(stripe);
  }

  if (type === "avci") {
    // Kama burun
    const nose = new THREE.Mesh(new THREE.ConeGeometry(dims.w / 2, 16, 4), paint);
    nose.rotation.z = -Math.PI / 2;
    nose.rotation.x = Math.PI / 4;
    nose.scale.set(1, 1, 0.45);
    nose.position.set(dims.l / 2 + 7, 4 + dims.h / 2, 0);
    body.add(nose);
  }

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(type === "tank" ? 20 : 16, type === "tank" ? 9 : 7, dims.w - 4), dark);
  cabin.position.set(type === "avci" ? -4 : -2, 4 + dims.h + (type === "tank" ? 4.5 : 3.5), 0);
  body.add(cabin);

  // Spoiler
  const wing = new THREE.Mesh(new THREE.BoxGeometry(5, 1.5, dims.w + 4), paint);
  wing.position.set(-dims.l / 2 + 2, 4 + dims.h + 7, 0);
  body.add(wing);
  for (const z of hq ? [-dims.w / 2 + 3, dims.w / 2 - 3] : []) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(2, 7, 1.5), black);
    post.position.set(-dims.l / 2 + 2, 4 + dims.h + 3, z);
    body.add(post);
  }

  // Farlar ve stoplar
  const headMat = new THREE.MeshBasicMaterial({ color: "#e0f2fe" });
  const tailMat = new THREE.MeshBasicMaterial({ color: "#ff2d55" });
  for (const z of [-dims.w / 2 + 4, dims.w / 2 - 4]) {
    if (hq) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(1, 2.5, 4), headMat);
      hl.position.set(dims.l / 2 + 0.5, 4 + dims.h * 0.6, z);
      body.add(hl);
    }
    const tl = new THREE.Mesh(new THREE.BoxGeometry(1, 2.5, 5), tailMat);
    tl.position.set(-dims.l / 2 - 0.5, 4 + dims.h * 0.6, z);
    body.add(tl);
  }

  // Tekerlekler
  const wheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(5, 5, 4.5, 18);
  for (const [x, z] of [
    [dims.l / 2 - 8, dims.w / 2],
    [dims.l / 2 - 8, -dims.w / 2],
    [-dims.l / 2 + 8, dims.w / 2],
    [-dims.l / 2 + 8, -dims.w / 2],
  ]) {
    const wheel = new THREE.Mesh(wheelGeo, black);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 5, z);
    if (hq) wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 4.7, 8), new THREE.MeshBasicMaterial({ color })));
    body.add(wheel);
    wheels.push(wheel);
  }

  // Alt neon
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(dims.l + 34, dims.w + 30),
    new THREE.MeshBasicMaterial({ color, map: glowTex(), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.8;
  group.add(glow);

  // Turbo alevleri
  const flames = new THREE.Group();
  const flameMat = new THREE.MeshBasicMaterial({ color: "#fbbf24", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const z of [-5, 5]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(3.5, 20, 10), flameMat);
    f.rotation.z = Math.PI / 2;
    f.position.set(-dims.l / 2 - 10, 7, z);
    flames.add(f);
  }
  flames.visible = false;
  body.add(flames);

  // Kalkan
  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(34, 24, 16),
    new THREE.MeshBasicMaterial({ color: "#22d3ee", transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  shield.position.y = 10;
  shield.visible = false;
  group.add(shield);

  group.add(labelSprite(name, isMe ? "#ffffff" : color, isMe));
  return { group, body, shield, flames, glow, wheels };
}

export class Scene3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(68, 16 / 10, 1, 6000);
  private composer: EffectComposer | null = null;
  private cars = new Map<string, CarMesh>();
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
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: hq, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(hq ? Math.min(window.devicePixelRatio || 1, 2) : 1);
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

    this.buildWorld();
    for (const c of cars) {
      const m = buildCar(c.type, colorOf(c), c.name, c.id === meId, hq);
      this.scene.add(m.group);
      this.cars.set(c.id, m);
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
  }

  private buildWorld() {
    const t = this.track;
    const n = t.pts.length;

    // Zemin
    const gt = gridTex();
    gt.repeat.set(60, 60);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(9000, 9000),
      this.hq ? new THREE.MeshStandardMaterial({ map: gt, roughness: 0.95 }) : new THREE.MeshLambertMaterial({ map: gt }),
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
        ? new THREE.MeshStandardMaterial({ map: asphaltTex(), roughness: 0.85, metalness: 0.1, side: THREE.DoubleSide })
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
      this.scene.add(new THREE.Mesh(strip(WALL * s, WALL * s, 0, 16), wallMat));
      this.scene.add(new THREE.Mesh(strip(WALL * s, (WALL + 3) * s, 16, 16), topMat));
    }

    // Başlangıç çizgisi
    const p0 = t.pts[0];
    const d0 = dirAt(t, 0);
    const ct = checkerTex();
    ct.repeat.set(1, TRACK_W / 32);
    const start = new THREE.Mesh(new THREE.PlaneGeometry(24, TRACK_W), new THREE.MeshBasicMaterial({ map: ct }));
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
      post.position.set(p0.x + nx * (WALL + 10) * s, 45, p0.y + ny * (WALL + 10) * s);
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
    const banner = new THREE.Mesh(new THREE.BoxGeometry(6, 34, (WALL + 10) * 2 + 8), [bannerMat, bannerMat, archMat, archMat, archMat, archMat]);
    banner.position.set(p0.x, 96, p0.y);
    banner.rotation.y = Math.atan2(nx, ny);
    this.scene.add(banner);

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
      if (nearest(t, x, z).dist < WALL + 40 + Math.max(w, d) / 2 + 30) continue;
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

  update(s: { now: number; dt: number; cars: Car[]; boxesAt: number[]; missiles: Missile[]; oils: Oil[]; parts: Particle[]; countdownMs: number }) {
    const { now, dt } = s;
    // Araçlar
    for (const c of s.cars) {
      const m = this.cars.get(c.id);
      if (!m) continue;
      m.group.position.set(c.x, 0, c.y);
      m.group.rotation.y = -c.a;
      const fx = Math.cos(c.a),
        fy = Math.sin(c.a);
      const fwd = c.vx * fx + c.vy * fy;
      const lat = -c.vx * fy + c.vy * fx;
      m.body.rotation.x = THREE.MathUtils.lerp(m.body.rotation.x, Math.max(-0.12, Math.min(0.12, lat * 0.03)), 0.2);
      m.body.position.y = now < c.spinUntil ? Math.abs(Math.sin(now / 90)) * 6 : 0;
      for (const w of m.wheels) w.rotation.y += fwd * 0.12 * dt;
      m.shield.visible = now < c.shieldUntil;
      if (m.shield.visible) m.shield.scale.setScalar(1 + Math.sin(now / 90) * 0.04);
      m.flames.visible = now < c.boostUntil;
      if (m.flames.visible) m.flames.scale.set(0.8 + Math.random() * 0.6, 1, 1);
      (m.glow.material as THREE.MeshBasicMaterial).opacity = now < c.slowUntil ? 0.2 + Math.random() * 0.5 : 0.7;
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
    this.camLook.set(me.x + fx * 70, 12, me.y + fy * 70);
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
