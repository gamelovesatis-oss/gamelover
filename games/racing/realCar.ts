"use client";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

/**
 * Gerçekçi araç modeli: Khronos "Car Concept" (CC BY 4.0, Eric Chadwick / Darmstadt Graphics Group,
 * CC0 Unity Fan modeline dayanır). Oyun için sadeleştirildi — bkz. public/models/CREDITS.md
 */
const URL = "/models/car-concept.glb";
const LENGTH = 46; // oyun birimi (fizikteki araç boyuna yakın)

let template: Promise<THREE.Group> | null = null;

export function loadRealCar() {
  if (!template)
    template = new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      loader.load(URL, (g) => resolve(g.scene), undefined, reject);
    });
  return template;
}

export type RealBody = {
  root: THREE.Group;
  wheels: { node: THREE.Object3D; base: THREE.Quaternion; front: boolean }[];
  brake: THREE.MeshStandardMaterial | null;
  radius: number; // tekerlek yarıçapı (oyun birimi)
  spinSign: number;
  spin: number;
};

/** Şablondan araca özel kopya: boya rengi, plaka, fren lambası malzemesi kişiye özel. */
export function makeRealBody(tpl: THREE.Group, color: string, plate: THREE.Texture, hq: boolean): RealBody {
  const model = tpl.clone(true);
  const clones = new Map<THREE.Material, THREE.Material>();
  let brake: THREE.MeshStandardMaterial | null = null;
  const paint = new THREE.Color(color);
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const src = mesh.material as THREE.MeshStandardMaterial;
    let mat = clones.get(src);
    if (!mat) {
      const name = src.name || "";
      if (/^Paint 1/.test(name)) {
        const m = src.clone();
        m.color.copy(paint);
        m.envMapIntensity = 0.95;
        mat = m;
      } else if (/^Paint 2/.test(name)) {
        const m = src.clone();
        m.color.copy(paint).multiplyScalar(0.18); // iki tonlu: koyu ikincil paneller
        mat = m;
      } else if (name === "Brakelight") {
        const m = src.clone();
        m.emissive = new THREE.Color("#ff1a3c");
        m.emissiveIntensity = 1;
        brake = m;
        mat = m;
      } else if (name === "Headlight") {
        const m = src.clone();
        m.emissive = new THREE.Color("#eaf4ff");
        m.emissiveIntensity = 2.5;
        mat = m;
      } else if (name === "License") {
        const m = src.clone();
        m.map = plate;
        m.color.set("#ffffff");
        mat = m;
      } else mat = src;
      if (!hq && (mat as THREE.MeshPhysicalMaterial).clearcoat) (mat as THREE.MeshPhysicalMaterial).clearcoat = 0; // telefonda cila katmanı kapalı
      clones.set(src, mat);
    }
    mesh.material = mat;
  });

  // Ön taraf hangi yönde? Farların konumuna bak (+z ise ön +z).
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  let front = 1;
  model.traverse((o) => {
    if (o.name === "BodyHeadlights") {
      const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
      front = c.z >= (box.min.z + box.max.z) / 2 ? 1 : -1;
    }
  });
  const scale = LENGTH / Math.max(size.z, size.x);
  model.scale.setScalar(scale);
  model.rotation.y = (front * Math.PI) / 2; // modelin önü oyunun +x yönüne
  model.position.y = -box.min.y * scale;
  const root = new THREE.Group();
  root.add(model);

  const wheels: RealBody["wheels"] = [];
  let radius = 3.5;
  model.traverse((o) => {
    const m = /^Wheel(Front|Rear)(L|R)$/.exec(o.name);
    if (!m) return;
    wheels.push({ node: o, base: o.quaternion.clone(), front: m[1] === "Front" });
    const wb = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
    radius = (wb.y * scale) / 2 || radius;
  });
  return { root, wheels, brake, radius, spinSign: front, spin: 0 };
}

const qSteer = new THREE.Quaternion();
const qSpin = new THREE.Quaternion();
const AX_Y = new THREE.Vector3(0, 1, 0);
const AX_X = new THREE.Vector3(1, 0, 0);

/** Tekerlekleri döndür (fwd: ileri hız, oyun birimi/kare) ve ön tekerleklere direksiyon ver. */
export function animateRealWheels(r: RealBody, fwd: number, steer: number, dt: number) {
  r.spin += ((fwd / r.radius) * dt) * r.spinSign;
  qSpin.setFromAxisAngle(AX_X, r.spin);
  for (const w of r.wheels) {
    w.node.quaternion.copy(w.base);
    if (w.front) {
      // Model 90° döndürüldüğü için oyundaki direksiyon açısı modelin y ekseninde aynı kalır
      qSteer.setFromAxisAngle(AX_Y, steer);
      w.node.quaternion.multiply(qSteer);
    }
    w.node.quaternion.multiply(qSpin);
  }
}
