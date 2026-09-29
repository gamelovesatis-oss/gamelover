"use client";

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CITY_GRID, CITY_STREET, WORLD_H, WORLD_W, dirAt, type Track } from "@/games/racing/track";

function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = true) {
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

const noise = (g: CanvasRenderingContext2D, w: number, h: number, n: number, a: number) => {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * a})`;
    g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
  }
};

/** Şehir haritası: sokak ızgarası, kaldırımlı bloklar, binalar, bariyerler, lambalar. */
export function buildCity(scene: THREE.Scene, t: Track, hq: boolean) {
  const n = t.pts.length;
  const half = CITY_STREET / 2;
  const lines = (max: number) => {
    const out: number[] = [];
    for (let v = 200 - CITY_GRID; v <= max + CITY_GRID; v += CITY_GRID) out.push(v);
    return out;
  };
  const xs = lines(WORLD_W - 200);
  const ys = lines(WORLD_H - 300);

  // ---------- Zemin ve sokaklar ----------
  const asphalt = tex(256, 256, (g) => {
    g.fillStyle = "#23232c";
    g.fillRect(0, 0, 256, 256);
    noise(g, 256, 256, 2200, 0.06);
  });
  asphalt.repeat.set(40, 40);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.9, envMapIntensity: 0.15 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLD_W / 2, -0.4, WORLD_H / 2);
  scene.add(ground);

  // Yarış rotası: şerit çizgili asfalt
  const laneTex = tex(128, 256, (g) => {
    g.fillStyle = "#2a2a34";
    g.fillRect(0, 0, 128, 256);
    noise(g, 128, 256, 1600, 0.07);
    g.fillStyle = "rgba(250,250,250,0.85)";
    g.fillRect(62, 0, 4, 120); // kesikli orta çizgi
    g.fillStyle = "rgba(250,204,21,0.9)";
    g.fillRect(4, 0, 3, 256); // sarı kenar çizgileri
    g.fillRect(121, 0, 3, 256);
  });
  const pos: number[] = [],
    uvs: number[] = [],
    idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const k = i % n;
    const p = t.pts[k];
    const { dx, dy } = dirAt(t, k);
    pos.push(p.x - dy * half, 0.15, p.y + dx * half, p.x + dy * half, 0.15, p.y - dx * half);
    const v = (i === n ? t.total : t.cum[k]) / 240;
    uvs.push(0, v, 1, v);
    if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const routeGeo = new THREE.BufferGeometry();
  routeGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  routeGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  routeGeo.setIndex(idx);
  routeGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(routeGeo, new THREE.MeshStandardMaterial({ map: laneTex, roughness: 0.7, envMapIntensity: 0.4, side: THREE.DoubleSide })));

  // ---------- Bloklar: kaldırım + binalar ----------
  const windows = tex(64, 128, (g) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, 64, 128);
    const cols = ["#fde68a", "#fef3c7", "#bae6fd", "#fbcfe8"];
    for (let y = 4; y < 128; y += 11)
      for (let x = 3; x < 64; x += 10)
        if (Math.random() < 0.42) {
          g.fillStyle = cols[Math.floor(Math.random() * cols.length)];
          g.globalAlpha = 0.45 + Math.random() * 0.55;
          g.fillRect(x, y, 6, 7);
        }
  });
  const walkGeos: THREE.BufferGeometry[] = [];
  const bGeos: THREE.BufferGeometry[] = [];
  const edgeGeos: THREE.BufferGeometry[] = [];
  const edgeCols = ["#22d3ee", "#f472b6", "#a78bfa", "#fbbf24", "#94a3b8"].map((c) => new THREE.Color(c));
  const walk = 16;
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i] + half,
        x1 = xs[i + 1] - half,
        y0 = ys[j] + half,
        y1 = ys[j + 1] - half;
      const bw = x1 - x0,
        bh = y1 - y0;
      const slab = new THREE.BoxGeometry(bw, 1.6, bh);
      slab.translate((x0 + x1) / 2, 0.8, (y0 + y1) / 2);
      walkGeos.push(slab);
      // Blok içine 1-4 bina
      const parts = hq ? 1 + Math.floor(Math.random() * 3.5) : 1 + Math.floor(Math.random() * 2);
      const iw = bw - walk * 2,
        ih = bh - walk * 2;
      const split = parts > 1 && Math.random() < 0.5 ? "x" : "y";
      for (let k = 0; k < parts; k++) {
        const w = split === "x" ? iw / parts - 6 : iw;
        const d = split === "y" ? ih / parts - 6 : ih;
        const cx = x0 + walk + (split === "x" ? (iw / parts) * (k + 0.5) : iw / 2);
        const cz = y0 + walk + (split === "y" ? (ih / parts) * (k + 0.5) : ih / 2);
        const h = 70 + Math.random() * (Math.random() < 0.2 ? 520 : 240);
        const g = new THREE.BoxGeometry(w, h, d);
        const uv = g.getAttribute("uv") as THREE.BufferAttribute;
        for (let q = 0; q < uv.count; q++) uv.setXY(q, uv.getX(q) * (Math.max(w, d) / 38), uv.getY(q) * (h / 38));
        const e = new THREE.EdgesGeometry(g);
        g.translate(cx, h / 2 + 1.6, cz);
        e.translate(cx, h / 2 + 1.6, cz);
        const ec = edgeCols[(i * 7 + j * 3 + k) % edgeCols.length];
        const cols = new Float32Array(e.getAttribute("position").count * 3);
        for (let q = 0; q < cols.length; q += 3) cols.set([ec.r, ec.g, ec.b], q);
        e.setAttribute("color", new THREE.BufferAttribute(cols, 3));
        bGeos.push(g);
        edgeGeos.push(e);
      }
    }
  const walkTex = tex(128, 128, (g) => {
    g.fillStyle = "#34343c";
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = "rgba(0,0,0,0.25)";
    for (let v = 0; v <= 128; v += 32) {
      g.beginPath();
      g.moveTo(v, 0);
      g.lineTo(v, 128);
      g.moveTo(0, v);
      g.lineTo(128, v);
      g.stroke();
    }
    noise(g, 128, 128, 500, 0.05);
  });
  walkTex.repeat.set(0.05, 0.05);
  const walkGeo = mergeGeometries(walkGeos);
  // Dünya koordinatından doku (kaldırım taşları düzgün tekrarlasın)
  const wp = walkGeo.getAttribute("position") as THREE.BufferAttribute;
  const wuv = walkGeo.getAttribute("uv") as THREE.BufferAttribute;
  for (let q = 0; q < wp.count; q++) wuv.setXY(q, wp.getX(q) / 24, wp.getZ(q) / 24);
  walkTex.repeat.set(1, 1);
  scene.add(new THREE.Mesh(walkGeo, new THREE.MeshStandardMaterial({ map: walkTex, roughness: 0.95, envMapIntensity: 0.1 })));
  walkGeos.forEach((g) => g.dispose());

  const city = mergeGeometries(bGeos);
  bGeos.forEach((g) => g.dispose());
  scene.add(
    new THREE.Mesh(
      city,
      new THREE.MeshStandardMaterial({ color: "#1a1a26", emissive: "#ffffff", emissiveMap: windows, emissiveIntensity: 0.9, roughness: 0.6, metalness: 0.3, envMapIntensity: 0.5 }),
    ),
  );
  const edges = mergeGeometries(edgeGeos);
  edgeGeos.forEach((g) => g.dispose());
  scene.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55 })));

  // ---------- Yarış rotası bariyerleri (kırmızı-beyaz beton) ----------
  const barrier = (off: number) => {
    const p2: number[] = [],
      c2: number[] = [],
      id2: number[] = [];
    const red = new THREE.Color("#dc2626"),
      white = new THREE.Color("#bdbdc4");
    for (let i = 0; i <= n; i++) {
      const k = i % n;
      const p = t.pts[k];
      const { dx, dy } = dirAt(t, k);
      const x = p.x - dy * off,
        z = p.y + dx * off;
      p2.push(x, 0, z, x, 9, z);
      const c = Math.floor(t.cum[k] / 30) % 2 ? red : white;
      c2.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (i < n) id2.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p2, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(c2, 3));
    g.setIndex(id2);
    g.computeVertexNormals();
    return g;
  };
  const barMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide, envMapIntensity: 0.3 });
  scene.add(new THREE.Mesh(barrier(t.wall + 3), barMat), new THREE.Mesh(barrier(-(t.wall + 3)), barMat));

  // ---------- Sokak lambaları (tek çizimde) ----------
  const lampEvery = 170;
  const lamps: { x: number; z: number; a: number }[] = [];
  for (let s = 60, side = 1; s < t.total; s += lampEvery, side *= -1) {
    let k = 0;
    while (k < n - 1 && t.cum[k + 1] < s) k++;
    const p = t.pts[k];
    const { dx, dy } = dirAt(t, k);
    const off = side * (t.wall + 12);
    lamps.push({ x: p.x - dy * off, z: p.y + dx * off, a: Math.atan2(dx * side, dy * side) }); // kol yola bakar
  }
  const poleGeo = new THREE.CylinderGeometry(0.9, 1.2, 46, 8);
  poleGeo.translate(0, 23, 0);
  const armGeo = new THREE.BoxGeometry(14, 1, 1.2);
  armGeo.translate(7, 45.5, 0);
  const headGeo = new THREE.BoxGeometry(6, 1.4, 3.6);
  headGeo.translate(13, 44.6, 0);
  const poleMesh = new THREE.InstancedMesh(mergeGeometries([poleGeo, armGeo]), new THREE.MeshStandardMaterial({ color: "#2b2d36", metalness: 0.6, roughness: 0.4 }), lamps.length);
  const headMesh = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ color: "#fff7d6", emissive: "#ffe8a3", emissiveIntensity: 3 }), lamps.length);
  const pool = tex(
    128,
    128,
    (g) => {
      const r = g.createRadialGradient(64, 64, 2, 64, 64, 64);
      r.addColorStop(0, "rgba(255,226,160,0.95)");
      r.addColorStop(1, "rgba(255,226,160,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, 128, 128);
    },
    false,
  );
  const poolGeo = new THREE.PlaneGeometry(95, 95);
  poolGeo.rotateX(-Math.PI / 2);
  poolGeo.translate(13, 0.5, 0);
  const poolMesh = new THREE.InstancedMesh(poolGeo, new THREE.MeshBasicMaterial({ map: pool, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }), lamps.length);
  const m = new THREE.Matrix4();
  lamps.forEach((l, i) => {
    m.makeRotationY(l.a);
    m.setPosition(l.x, 0, l.z);
    poleMesh.setMatrixAt(i, m);
    headMesh.setMatrixAt(i, m);
    poolMesh.setMatrixAt(i, m);
  });
  scene.add(poleMesh, headMesh, poolMesh);

  // ---------- Yaya geçitleri (rotanın geçtiği kavşaklarda) ----------
  const stripeGeos: THREE.BufferGeometry[] = [];
  for (const x of xs)
    for (const y of ys) {
      // Bu kavşak rotaya yakın mı?
      let near = false;
      for (let k = 0; k < n; k += 4) if (Math.abs(t.pts[k].x - x) < 60 && Math.abs(t.pts[k].y - y) < 60) near = true;
      if (!near) continue;
      for (const [ox, oz, rot] of [
        [0, -half - 10, 0],
        [0, half + 10, 0],
        [-half - 10, 0, Math.PI / 2],
        [half + 10, 0, Math.PI / 2],
      ])
        for (let q = -4; q <= 4; q++) {
          const g = new THREE.PlaneGeometry(5, 16);
          g.rotateX(-Math.PI / 2);
          g.translate(q * 11, 0.3, 0);
          g.rotateY(rot);
          g.translate(x + ox, 0, y + oz);
          stripeGeos.push(g);
        }
    }
  if (stripeGeos.length) scene.add(new THREE.Mesh(mergeGeometries(stripeGeos), new THREE.MeshStandardMaterial({ color: "#a8a8ae", roughness: 0.85, envMapIntensity: 0.2 })));
  stripeGeos.forEach((g) => g.dispose());
}
