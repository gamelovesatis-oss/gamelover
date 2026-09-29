"use client";

import * as THREE from "three";

/** Lastik dumanı: yumuşak, büyüyüp sönen parçacıklar (tek çizim). */
export class TireSmoke {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private size: Float32Array;
  private alpha: Float32Array;
  private vel: Float32Array;
  private age: Float32Array;
  private life: Float32Array;
  private next = 0;

  constructor(private max: number) {
    this.pos = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.age = new Float32Array(max).fill(1e9);
    this.life = new Float32Array(max).fill(1);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute("size", new THREE.BufferAttribute(this.size, 1));
    g.setAttribute("alpha", new THREE.BufferAttribute(this.alpha, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {},
      vertexShader: `
        attribute float size; attribute float alpha; varying float vAlpha;
        void main() {
          vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (430.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d) * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(0.86, 0.85, 0.9, a);
        }`,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
  }

  emit(x: number, z: number, vx: number, vz: number, strength: number) {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    this.pos[i * 3] = x + (Math.random() - 0.5) * 3;
    this.pos[i * 3 + 1] = 2 + Math.random() * 2;
    this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * 3;
    this.vel[i * 3] = vx * 0.25 + (Math.random() - 0.5) * 0.4;
    this.vel[i * 3 + 1] = 0.15 + Math.random() * 0.2;
    this.vel[i * 3 + 2] = vz * 0.25 + (Math.random() - 0.5) * 0.4;
    this.age[i] = 0;
    this.life[i] = 45 + Math.random() * 35;
    this.size[i] = 7 + strength * 5;
    this.alpha[i] = 0.35 * Math.min(1, strength);
  }

  update(dt: number) {
    for (let i = 0; i < this.max; i++) {
      if (this.age[i] > this.life[i]) {
        this.alpha[i] = 0;
        continue;
      }
      this.age[i] += dt;
      const t = this.age[i] / this.life[i];
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.vel[i * 3] *= 0.97;
      this.vel[i * 3 + 2] *= 0.97;
      this.size[i] += 0.55 * dt;
      this.alpha[i] = Math.max(0, this.alpha[i] - (0.35 / this.life[i]) * dt * (t > 0.5 ? 1.4 : 0.7));
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.size.needsUpdate = true;
    g.attributes.alpha.needsUpdate = true;
  }
}

/** Kalıcı lastik izleri: halka tamponlu tek InstancedMesh. */
export class SkidMarks {
  readonly mesh: THREE.InstancedMesh;
  private next = 0;
  private filled = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private up = new THREE.Vector3(0, 1, 0);
  private one = new THREE.Vector3(1, 1, 1);
  private p = new THREE.Vector3();

  constructor(private max: number) {
    const geo = new THREE.PlaneGeometry(5.5, 3.2);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }

  add(x: number, z: number, heading: number) {
    this.q.setFromAxisAngle(this.up, -heading);
    this.p.set(x, 0.32, z);
    this.m.compose(this.p, this.q, this.one);
    this.mesh.setMatrixAt(this.next, this.m);
    this.next = (this.next + 1) % this.max;
    this.filled = Math.min(this.max, this.filled + 1);
    this.mesh.count = this.filled;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
