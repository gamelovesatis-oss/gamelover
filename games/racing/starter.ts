"use client";

import * as THREE from "three";
import { dirAt, type Track } from "@/games/racing/track";

/**
 * Yarışı başlatan karakter: ızgaranın önünde, iki araç sırasının ortasında durur.
 * Geri sayımda mendili kaldırıp sallar, "BAŞLA!" anında atar; mendil süzülerek yere düşer.
 */
export class FlagStarter {
  readonly group = new THREE.Group();
  private figure = new THREE.Group();
  private armR = new THREE.Group();
  private armL = new THREE.Group();
  private cloth: THREE.Mesh;
  private clothGeo: THREE.PlaneGeometry;
  private clothBase: Float32Array;
  private released = false;
  private clothVel = new THREE.Vector3();
  private clothSpin = new THREE.Vector3();

  constructor(track: Track, hq: boolean) {
    const p0 = track.pts[0];
    const d = dirAt(track, 0);
    // Başlangıç çizgisinin biraz önünde, araçlara bakacak şekilde
    this.group.position.set(p0.x + d.dx * 20, 0, p0.y + d.dy * 20);
    this.group.rotation.y = -Math.atan2(-d.dy, -d.dx);
    this.figure.scale.setScalar(1.4);
    this.group.add(this.figure);

    // Ayaklarının altında spot ışığı halkası (gece sahnesinde öne çıksın)
    const c0 = document.createElement("canvas");
    c0.width = c0.height = 64;
    const g0 = c0.getContext("2d")!;
    const grd = g0.createRadialGradient(32, 32, 2, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,240,220,0.9)");
    grd.addColorStop(1, "rgba(255,240,220,0)");
    g0.fillStyle = grd;
    g0.fillRect(0, 0, 64, 64);
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 46),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c0), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.7;
    this.group.add(pool);

    const seg = hq ? 12 : 8;
    const mat = (color: string, rough = 0.7) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05 });
    const skin = mat("#e3b08c", 0.6);
    const jacket = mat("#171722", 0.45);
    const jeans = mat("#23304f", 0.8);
    const hair = mat("#2b1a12", 0.5);
    const accent = mat("#f472b6", 0.5);
    const white = mat("#f4f4f5", 0.6);
    const cap = (r: number, len: number, m: THREE.Material) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, seg), m);

    // Bacaklar ve ayakkabılar
    for (const side of [-1, 1]) {
      const leg = cap(1.25, 8.5, jeans);
      leg.position.set(0, 6.2, side * 1.5);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 1.9), white);
      shoe.position.set(0.6, 0.7, side * 1.5);
      this.figure.add(leg, shoe);
    }
    // Gövde (ceket) + kemer şeridi
    const torso = cap(2.9, 5.2, jacket);
    torso.position.y = 15.4;
    torso.scale.set(0.8, 1, 1);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 0.7, seg), accent);
    stripe.position.y = 12.2;
    stripe.scale.set(0.8, 1, 1);
    // Boyun, baş, saç, at kuyruğu
    const neck = cap(0.8, 1, skin);
    neck.position.y = 20.4;
    const head = new THREE.Mesh(new THREE.SphereGeometry(2.4, seg * 2, seg), skin);
    head.position.y = 23;
    const hairTop = new THREE.Mesh(new THREE.SphereGeometry(2.6, seg * 2, seg, 0, Math.PI * 2, 0, Math.PI * 0.62), hair);
    hairTop.position.set(-0.35, 23.25, 0);
    const tail = cap(0.85, 4.2, hair);
    tail.position.set(-2.6, 21.2, 0);
    tail.rotation.z = -0.35;
    this.figure.add(torso, stripe, neck, head, hairTop, tail);

    // Kollar (omuzdan dönen)
    for (const [arm, side] of [
      [this.armR, 1],
      [this.armL, -1],
    ] as [THREE.Group, number][]) {
      arm.position.set(0, 18.8, side * 3.1);
      const upper = cap(0.85, 6.2, jacket);
      upper.position.y = -3.6;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.85, seg, seg), skin);
      hand.position.y = -7.6;
      arm.add(upper, hand);
      this.figure.add(arm);
    }
    this.armL.rotation.x = 0.3; // sol kol hafif dışarıda
    this.armL.rotation.z = 0.2;

    // Mendil (kareli kenarlı beyaz bez)
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 64, 64);
    g.strokeStyle = "#ef4444";
    g.lineWidth = 6;
    g.strokeRect(3, 3, 58, 58);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.clothGeo = new THREE.PlaneGeometry(7, 5.5, 8, 6);
    this.clothGeo.translate(3.5, -2.75, 0); // köşesinden tutulur
    this.clothBase = Float32Array.from(this.clothGeo.attributes.position.array as Float32Array);
    this.cloth = new THREE.Mesh(this.clothGeo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
    this.cloth.position.set(0, -8, 0);
    this.armR.add(this.cloth);
  }

  /** sinceStartMs: başlangıçtan geçen süre (geri sayımda negatif). */
  update(sinceStartMs: number, dt: number, now: number) {
    const t = sinceStartMs;
    if (t > 9000) {
      this.group.visible = false;
      return;
    }
    const ease = (x: number) => x * x * (3 - 2 * x);

    // Hafif sallanma
    this.figure.position.y = Math.sin(now / 260) * 0.25;
    this.figure.rotation.x = Math.sin(now / 900) * 0.03;

    if (t < -2600) {
      this.armR.rotation.x = -0.1;
    } else if (t < -1800) {
      // Mendili yukarı kaldır
      this.armR.rotation.x = -0.1 - ease((t + 2600) / 800) * 2.9;
    } else if (t < 0) {
      this.armR.rotation.x = -3 + Math.sin(now / 140) * 0.12;
    } else if (t < 350) {
      // "BAŞLA!": kolu sertçe indir, mendili bırak
      this.armR.rotation.x = -3 + ease(t / 350) * 3.4;
      if (!this.released) this.release();
    } else {
      this.armR.rotation.x = -0.4;
      this.armL.rotation.x = 2.4 + Math.sin(now / 160) * 0.4; // sevinçle el salla
      this.figure.position.y = Math.abs(Math.sin(now / 150)) * 1.5;
    }
    // 7. saniyeden sonra sahneden sessizce çekil
    if (t > 7000) this.group.scale.setScalar(Math.max(0.01, 1 - (t - 7000) / 2000));

    // Bez dalgalanması
    const pos = this.clothGeo.attributes.position as THREE.BufferAttribute;
    const amp = this.released ? 0.8 : 1.2;
    for (let i = 0; i < pos.count; i++) {
      const bx = this.clothBase[i * 3],
        by = this.clothBase[i * 3 + 1];
      const w = (bx / 7) * amp;
      pos.setZ(i, Math.sin(now / 90 + bx * 0.9 + by * 0.4) * w * 1.4);
    }
    pos.needsUpdate = true;
    this.clothGeo.computeVertexNormals();

    // Serbest düşen mendil
    if (this.released && this.cloth.position.y > 0.6) {
      this.clothVel.y = Math.max(-0.35, this.clothVel.y - 0.012 * dt);
      this.clothVel.x *= 0.98;
      this.clothVel.z *= 0.98;
      this.cloth.position.addScaledVector(this.clothVel, dt);
      this.cloth.rotation.x += this.clothSpin.x * dt;
      this.cloth.rotation.y += this.clothSpin.y * dt;
      this.cloth.rotation.z += this.clothSpin.z * dt;
      if (this.cloth.position.y <= 0.6) {
        this.cloth.position.y = 0.6;
        this.cloth.rotation.set(-Math.PI / 2, 0, this.cloth.rotation.z);
      }
    }
  }

  /** Mendili elden bırakıp dünyaya taşı. */
  private release() {
    this.released = true;
    const world = new THREE.Vector3();
    this.cloth.getWorldPosition(world);
    const q = new THREE.Quaternion();
    this.cloth.getWorldQuaternion(q);
    this.armR.remove(this.cloth);
    this.group.parent?.add(this.cloth);
    this.cloth.position.copy(world);
    this.cloth.quaternion.copy(q);
    this.clothVel.set((Math.random() - 0.5) * 0.4, 0.25, (Math.random() - 0.5) * 0.4);
    this.clothSpin.set((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.08);
  }
}
