"use client";

import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CarType } from "@/games/racing/engine";

/**
 * Kodla üretilen gerçekçi araç modelleri (dış dosya yok).
 * Araç +x yönüne bakar, y yukarı, z genişlik (sağ taraf +z).
 */
export type CarRig = {
  group: THREE.Group; // dünya konumu ve yön
  body: THREE.Group; // süspansiyon: yunuslama / yatma / zıplama
  shell: THREE.Group; // basit (kodla çizilen) gövde — uzaktayken görünür
  frontPivots: THREE.Group[]; // direksiyonla dönen ön tekerlekler
  spinners: THREE.Group[]; // dönen tekerlekler
  brakeMat: THREE.MeshStandardMaterial;
  flames: THREE.Group;
  shield: THREE.Mesh;
  glow: THREE.Mesh;
  beam: THREE.Mesh | null;
  rearAxle: number; // x (negatif)
  halfTrack: number; // tekerleklerin z mesafesi
  wheelR: number;
};

type Spec = {
  L: number;
  W: number;
  r: number; // tekerlek yarıçapı
  axle: number; // aks mesafesinin yarısı
  body: [number, number][];
  cabin: [number, number][];
  roof: [number, number, number]; // x0, x1, y
  head: [number, number]; // far x, y
  tail: number; // stop y
  wing: number | null; // kanat yüksekliği (yoksa null)
};

const SPECS: Record<CarType, Spec> = {
  // Spor coupe
  hiz: {
    L: 44,
    W: 21,
    r: 5.2,
    axle: 13.4,
    body: [[-22, 4], [-22.6, 7.6], [-21.4, 10.4], [-16, 11.4], [-9, 11.8], [2, 11.6], [9, 11], [15, 9.8], [20, 8], [22.6, 6.2], [22.8, 4.4], [21.2, 3.1], [-20.4, 3.1]],
    cabin: [[-13.5, 11.3], [-10.5, 15.2], [-6.5, 17], [0.5, 17], [4.5, 15.4], [9.5, 11.2]],
    roof: [-6.2, 0.4, 17],
    head: [21.6, 7.2],
    tail: 9.2,
    wing: 16,
  },
  // Muscle car
  tank: {
    L: 47,
    W: 24,
    r: 5.9,
    axle: 14.5,
    body: [[-23.5, 4.6], [-24, 9.4], [-23, 12.8], [-14, 13.4], [4, 13.4], [14, 13], [21, 11.8], [23.8, 9.4], [24, 5.4], [22.4, 3.6], [-22, 3.6]],
    cabin: [[-16, 13.2], [-12.5, 19], [-6.5, 20.4], [2.5, 20.4], [6.5, 18.6], [11.5, 13.2]],
    roof: [-6.2, 2.2, 20.4],
    head: [23.3, 10],
    tail: 11,
    wing: null,
  },
  // Kama süper araba
  avci: {
    L: 46,
    W: 22.5,
    r: 5.4,
    axle: 14.2,
    body: [[-23, 4.2], [-23.4, 8.2], [-21.8, 10.2], [-13, 10.9], [-3, 10.6], [6, 9.2], [13, 7.6], [19, 5.8], [23, 4.6], [23.4, 3.6], [21.6, 2.9], [-21.4, 2.9]],
    cabin: [[-12, 10.7], [-7.5, 14.6], [-2.5, 15.6], [1.5, 15], [5.5, 12.4], [11, 8.4]],
    roof: [-6.5, 0.8, 15.5],
    head: [20.5, 5.6],
    tail: 8.6,
    wing: 13.5,
  },
};

let plateCache: THREE.Texture | null = null;
export function plateTex() {
  if (plateCache) return plateCache;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f8fafc";
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = "#1d4ed8";
  g.fillRect(0, 0, 30, 64);
  g.fillStyle = "#fff";
  g.font = "bold 16px sans-serif";
  g.fillText("TR", 4, 56);
  g.fillStyle = "#111";
  g.font = "bold 40px sans-serif";
  g.fillText("19 GL 019", 40, 47);
  g.strokeStyle = "#111";
  g.lineWidth = 4;
  g.strokeRect(2, 2, 252, 60);
  plateCache = new THREE.CanvasTexture(c);
  plateCache.colorSpace = THREE.SRGBColorSpace;
  return plateCache;
}

let radialCache: THREE.Texture | null = null;
function radialTex() {
  if (radialCache) return radialCache;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.45, "rgba(255,255,255,0.45)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  radialCache = new THREE.CanvasTexture(c);
  return radialCache;
}

/** Yan profil + yuvarlatılmış kenarlarla katı gövde. */
function extrude(pts: [number, number][], depth: number, bevel: number, segs: number) {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const d = Math.max(0.5, depth - bevel * 2);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: 4 });
  g.translate(0, 0, -d / 2);
  return g;
}

/** Kaporta yüzeyini yumuşat (keskin yüzey geçişleri yerine akıcı yansıma). */
function smooth(g: THREE.BufferGeometry) {
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  const m = mergeVertices(g, 0.05);
  m.computeVertexNormals();
  g.dispose();
  return m;
}

/** Birleştirme öncesi: indeksi kaldır, sadece konum/normal/uv bırak, konumla. */
function prep(g: THREE.BufferGeometry, x = 0, y = 0, z = 0, ry = 0, rz = 0) {
  let geo = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(k)) geo.deleteAttribute(k);
  if (!geo.attributes.uv) {
    const n = geo.attributes.position.count;
    geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  }
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz)), new THREE.Vector3(1, 1, 1));
  geo.applyMatrix4(m);
  if (geo !== g) g.dispose();
  return geo;
}
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const merged = (list: THREE.BufferGeometry[], mat: THREE.Material) => new THREE.Mesh(mergeGeometries(list), mat);

export function buildCarModel(type: CarType, color: string, opts: { hq: boolean; beam: boolean; clearcoat?: boolean }): CarRig {
  const s = SPECS[type];
  const { hq } = opts;
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const shell = new THREE.Group();
  body.add(shell);

  // ---------- Malzemeler ----------
  const paint = (opts.clearcoat ?? hq)
    ? new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.2 })
    : new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.3, envMapIntensity: 1.1 });
  const dark = new THREE.MeshStandardMaterial({ color: "#0c0d12", metalness: 0.3, roughness: 0.55 });
  const glass = new THREE.MeshStandardMaterial({ color: "#0a1220", metalness: 0.9, roughness: 0.05, envMapIntensity: 1.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: "#d9dde6", metalness: 1, roughness: 0.18, envMapIntensity: 1.4 });
  const tireMat = new THREE.MeshStandardMaterial({ color: "#111114", roughness: 0.92, metalness: 0 });
  const headMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#e8f3ff", emissiveIntensity: 2.2 });
  const brakeMat = new THREE.MeshStandardMaterial({ color: "#5a0010", emissive: "#ff1a3c", emissiveIntensity: 1 });

  // ---------- Kaporta ----------
  const paintGeos: THREE.BufferGeometry[] = [];
  const darkGeos: THREE.BufferGeometry[] = [];
  paintGeos.push(prep(smooth(extrude(s.body, s.W, 2.2, hq ? 5 : 3))));
  // Tavan paneli
  paintGeos.push(prep(box(s.roof[1] - s.roof[0], 0.9, s.W - 6.4), (s.roof[0] + s.roof[1]) / 2, s.roof[2] + 0.3, 0));
  // Aynalar
  const cabFront = s.cabin[s.cabin.length - 1][0];
  const belt = s.cabin[0][1];
  for (const side of [-1, 1]) {
    paintGeos.push(prep(box(2.2, 1.7, 2.6), cabFront - 3, belt + 2.2, side * (s.W / 2 + 0.6)));
    darkGeos.push(prep(box(0.8, 0.6, 1.8), cabFront - 3.4, belt + 1.2, side * (s.W / 2 - 0.4)));
  }
  // Tekerlek kemerleri: tekerleğin üstünü saran kavisli çamurluk
  for (const x of [s.axle, -s.axle])
    for (const side of [-1, 1]) {
      const arch = new THREE.TorusGeometry(s.r + 1.4, 1.3, 8, hq ? 18 : 10, Math.PI);
      paintGeos.push(prep(arch, x, s.r, side * (s.W / 2 + 0.2)));
      const liner = new THREE.CylinderGeometry(s.r + 1.2, s.r + 1.2, 4, hq ? 16 : 8, 1, true, Math.PI / 2, Math.PI); // üst yarı
      liner.rotateX(Math.PI / 2);
      darkGeos.push(prep(liner, x, s.r, side * (s.W / 2 - 1.8)));
    }
  // Kapı direği (B sütunu) ve cam çerçevesi
  const cabRear = s.cabin[0][0];
  const cabTop = Math.max(...s.cabin.map((q) => q[1]));
  for (const side of [-1, 1]) {
    darkGeos.push(prep(box(1.4, cabTop - belt - 0.6, 0.4), (cabRear + cabFront) / 2 - 1, (belt + cabTop) / 2, side * ((s.W - 4.6) / 2 + 0.1)));
    darkGeos.push(prep(box(cabFront - cabRear - 2, 0.6, 0.4), (cabRear + cabFront) / 2, belt + 0.4, side * ((s.W - 4.6) / 2 + 0.1)));
  }

  // Kanat
  if (s.wing) {
    paintGeos.push(prep(box(5.5, 0.9, s.W + 1.5), -s.L / 2 + 3.2, s.wing, 0));
    for (const side of [-1, 1]) darkGeos.push(prep(box(1.6, s.wing - 9, 1.2), -s.L / 2 + 3.6, (s.wing + 9) / 2, side * (s.W / 2 - 4)));
    for (const side of [-1, 1]) paintGeos.push(prep(box(5.8, 3, 0.5), -s.L / 2 + 3.2, s.wing, side * (s.W / 2 + 1)));
  }
  // Izgara, splitter, difüzör, marşpiyel
  darkGeos.push(prep(box(1, 2.6, s.W * 0.52), s.L / 2 + 0.4, s.body[s.body.length - 3][1] + 1.4, 0));
  darkGeos.push(prep(box(4.5, 0.8, s.W + 0.6), s.L / 2 - 1.2, 3, 0));
  darkGeos.push(prep(box(3.2, 1.8, s.W * 0.78), -s.L / 2 + 0.8, 3.6, 0));
  darkGeos.push(prep(box(s.axle * 1.35, 1.3, s.W + 0.8), 0, 3.6, 0));
  shell.add(merged(paintGeos, paint), merged(darkGeos, dark));

  // Plakalar (Çorum: 19)
  if (hq) {
    const plateMat = new THREE.MeshStandardMaterial({ map: plateTex(), roughness: 0.5 });
    const front = new THREE.Mesh(box(0.3, 2.2, 7.5), plateMat);
    front.position.set(s.L / 2 + 0.9, 4.6, 0);
    const rear = new THREE.Mesh(box(0.3, 2.2, 7.5), plateMat);
    rear.position.set(-s.L / 2 - 0.5, s.tail - 3, 0);
    rear.rotation.y = Math.PI;
    shell.add(front, rear);
  }

  // Cam (kabin)
  shell.add(new THREE.Mesh(prep(extrude(s.cabin, s.W - 4.6, 1.2, hq ? 3 : 1)), glass));

  // Egzoz
  const exGeos = [-1, 1].map((side) => prep(new THREE.CylinderGeometry(1.05, 1.05, 3.2, hq ? 12 : 6), -s.L / 2 - 0.6, 4.4, side * s.W * 0.22, 0, Math.PI / 2));
  shell.add(merged(exGeos, chrome));

  // Farlar ve stoplar
  const hGeos: THREE.BufferGeometry[] = [];
  const tGeos: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    hGeos.push(prep(box(1.4, 1.5, 4.6), s.head[0], s.head[1], side * (s.W / 2 - 3.6)));
    tGeos.push(prep(box(1, 1.4, 5.2), -s.L / 2 - 0.35, s.tail, side * (s.W / 2 - 3.6)));
  }
  tGeos.push(prep(box(0.8, 0.5, s.W - 13), -s.L / 2 - 0.3, s.tail + 0.2, 0)); // ortadaki ince şerit
  shell.add(merged(hGeos, headMat), merged(tGeos, brakeMat));
  if (hq)
    for (const side of [-1, 1]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex(), color: "#dbeafe", blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      sp.scale.set(9, 9, 1);
      sp.position.set(s.head[0] + 1.2, s.head[1], side * (s.W / 2 - 3.6));
      shell.add(sp);
    }

  // ---------- Tekerlekler ----------
  const frontPivots: THREE.Group[] = [];
  const spinners: THREE.Group[] = [];
  const tw = 4.8;
  const halfTrack = s.W / 2 - 0.4;
  const tireGeo = new THREE.CylinderGeometry(s.r, s.r, tw, hq ? 26 : 14);
  tireGeo.rotateX(Math.PI / 2);
  const caliperMat = new THREE.MeshStandardMaterial({ color: "#dc2626", metalness: 0.4, roughness: 0.4 });
  for (const [x, front] of [
    [s.axle, true],
    [-s.axle, false],
  ] as [number, boolean][])
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, s.r, side * halfTrack);
      const spin = new THREE.Group();
      spin.add(new THREE.Mesh(tireGeo, tireMat));
      // Jant: göbek + parmaklar (tek parça)
      const rimGeo = new THREE.CylinderGeometry(s.r * 0.66, s.r * 0.66, 0.6, hq ? 18 : 10);
      rimGeo.rotateX(Math.PI / 2);
      const parts = [prep(rimGeo, 0, 0, side * (tw / 2 - 0.05))];
      if (hq)
        for (let k = 0; k < 5; k++) {
          const sp = box(s.r * 1.2, 0.8, 0.5);
          sp.rotateZ((k / 5) * Math.PI);
          parts.push(prep(sp, 0, 0, side * (tw / 2 + 0.25)));
        }
      spin.add(merged(parts, chrome));
      pivot.add(spin);
      // Fren kaliperi (dönmez) — sadece yüksek kalitede
      if (hq) {
        const cal = new THREE.Mesh(box(2.2, 2.6, 1), caliperMat);
        cal.position.set(-s.r * 0.35, s.r * 0.25, side * (tw / 2 - 1.2));
        pivot.add(cal);
      }
      shell.add(pivot);
      spinners.push(spin);
      if (front) frontPivots.push(pivot);
    }

  // ---------- Zemin efektleri ----------
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(s.L + 18, s.W + 16),
    new THREE.MeshBasicMaterial({ map: radialTex(), color: "#000000", transparent: true, opacity: 0.75, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.45;
  group.add(shadow);

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(s.L + 10, s.W + 12),
    new THREE.MeshBasicMaterial({ color, map: radialTex(), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.55;
  group.add(glow);

  let beam: THREE.Mesh | null = null;
  if (opts.beam) {
    beam = new THREE.Mesh(
      new THREE.PlaneGeometry(110, 75),
      new THREE.MeshBasicMaterial({ color: "#fff7e0", map: radialTex(), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    beam.rotation.x = -Math.PI / 2;
    beam.position.set(s.L / 2 + 52, 0.6, 0);
    group.add(beam);
  }

  // Turbo alevleri (egzozdan)
  const flames = new THREE.Group();
  const flameMat = new THREE.MeshBasicMaterial({ color: "#ffb020", transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const coreMat = new THREE.MeshBasicMaterial({ color: "#7dd3fc", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const side of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(1.6, 12, 10), flameMat);
    f.rotation.z = Math.PI / 2;
    f.position.set(-s.L / 2 - 7.5, 4.4, side * s.W * 0.22);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.8, 6, 8), coreMat);
    core.rotation.z = Math.PI / 2;
    core.position.set(-s.L / 2 - 4.6, 4.4, side * s.W * 0.22);
    flames.add(f, core);
  }
  flames.visible = false;
  body.add(flames);

  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(s.L, s.W) * 0.72, 24, 16),
    new THREE.MeshBasicMaterial({ color: "#22d3ee", transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  shield.position.y = 9;
  shield.visible = false;
  group.add(shield);

  return { group, body, shell, frontPivots, spinners, brakeMat, flames, shield, glow, beam, rearAxle: -s.axle, halfTrack, wheelR: s.r };
}
