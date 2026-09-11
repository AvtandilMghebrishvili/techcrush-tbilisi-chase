import * as THREE from "./vendor/three.module.js";
import { TIERS } from "./progression.js";
import {
  box,
  mesh,
  metal,
  makeWheel,
  makeSpoiler,
  tierValue,
} from "./customization.js";

// Studio assemblies, not icons: the four grades change machining, layout and finish.
export function makePartModel(id, quality = 1) {
  const tier = tierValue(quality),
    root = new THREE.Group();
  root.name = `${id}-${tier}`;
  const finish = metal(TIERS[tier].color, 0.2),
    steel = metal("#b7c0c9"),
    dark = metal("#262e39", 0.4),
    rubber = metal("#151b21", 0.85);
  const cylinder = (r, h, mat, x = 0, y = 0, z = 0) =>
    mesh(root, new THREE.CylinderGeometry(r, r, h, 40), mat, x, y, z);
  const torus = (r, t, mat, x = 0, y = 0, z = 0) =>
    mesh(root, new THREE.TorusGeometry(r, t, 10, 48), mat, x, y, z);
  const pipe = (points, r = 0.055, mat = steel) =>
    mesh(
      root,
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        32,
        r,
        8,
        false,
      ),
      mat,
    );
  if (id === "rims" || id === "tires" || id === "brakes") {
    if (id === "brakes") {
      const disk = cylinder(0.5, 0.045, steel);
      disk.rotation.x = Math.PI / 2;
      torus(0.45, 0.009, dark, 0, 0, 0.029);
      torus(0.16, 0.03, finish, 0, 0, 0.04);
      for (let i = 0; i < 12 + tier * 7; i++) {
        let a = (i / (12 + tier * 7)) * Math.PI * 2;
        mesh(
          root,
          new THREE.CircleGeometry(0.018, 8),
          rubber,
          Math.sin(a) * 0.37,
          Math.cos(a) * 0.37,
          0.025,
        );
      }
      box(root, 0.21, 0.46, 0.17, finish, 0.4, 0, 0.08);
      box(root, 0.11, 0.29, 0.18, dark, 0.42, 0, 0.09);
    } else {
      const wheel = makeWheel(
        { rims: id === "rims" ? tier : 0, tires: id === "tires" ? tier : 1 },
        1,
      );
      wheel.rotation.y = -Math.PI / 2;
      wheel.scale.setScalar(1.6);
      root.add(wheel);
    }
  } else if (id === "spoiler") {
    const wing = makeSpoiler(tier, 1.5, 0, 0, true);
    root.add(wing);
  } else if (id === "engine") {
    box(root, 0.83, 0.47, 0.9, dark, 0, -0.12, 0);
    for (const s of [-1, 1]) {
      const head = box(root, 0.39, 0.23, 1.03, finish, s * 0.28, 0.23, 0);
      head.rotation.z = s * 0.28;
      for (let i = 0; i < 3 + tier; i++) {
        const z = -0.4 + (i * 0.8) / (2 + tier);
        cylinder(0.08, 0.14, steel, s * 0.22, 0.42, z);
        pipe(
          [
            [s * 0.48, 0.16, z],
            [s * 0.62, -0.05, z],
            [s * 0.53, -0.32, z],
          ],
          0.035,
        );
      }
    }
    cylinder(0.14, 0.07, finish, 0, 0.44, 0);
    box(root, 0.15, 0.1, 0.85, steel, 0, 0.38, 0);
  } else if (id === "ecu") {
    box(root, 1, 0.18, 0.7, dark);
    box(root, 0.91, 0.035, 0.63, finish, 0, 0.105, 0);
    for (let i = 0; i < 7 + tier * 3; i++)
      box(
        root,
        0.022,
        0.08,
        0.57,
        steel,
        -0.42 + (i * 0.84) / (6 + tier * 3),
        0.155,
        0,
      );
    for (let i = 0; i < 2 + tier; i++) {
      box(
        root,
        0.12,
        0.1,
        0.12,
        rubber,
        -0.35 + (i * 0.7) / (1 + tier),
        0,
        0.38,
      );
      for (let j = 0; j < 4; j++)
        box(
          root,
          0.013,
          0.016,
          0.08,
          finish,
          -0.39 + (i * 0.7) / (1 + tier) + j * 0.023,
          0,
          0.46,
        );
    }
  } else if (id === "turbo") {
    torus(0.28, 0.115, steel);
    cylinder(0.1, 0.25, finish, 0, 0, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8 + tier * 2; i++) {
      const a = (i / (8 + tier * 2)) * Math.PI * 2;
      const blade = box(
        root,
        0.025,
        0.17,
        0.08,
        finish,
        Math.sin(a) * 0.12,
        Math.cos(a) * 0.12,
        0.08,
      );
      blade.rotation.z = -a + 0.3;
    }
    pipe(
      [
        [0.27, 0, 0],
        [0.48, 0.05, 0],
        [0.52, 0.33, 0],
      ],
      0.095,
    );
    torus(0.1, 0.02, finish, 0.52, 0.33, 0).rotation.x = Math.PI / 2;
    if (tier >= 3) {
      const twin = torus(0.2, 0.085, dark, -0.22, 0, -0.29);
      twin.rotation.y = 0.3;
    }
  } else if (id === "tank") {
    for (const s of tier >= 3 ? [-1, 1] : [0]) {
      const x = s * 0.24;
      mesh(
        root,
        new THREE.CapsuleGeometry(0.18, 0.65 + tier * 0.04, 8, 32),
        finish,
        x,
        0,
        0,
      );
      cylinder(0.065, 0.16, steel, x, 0.56, 0);
      box(root, 0.22, 0.035, 0.045, dark, x, 0.65, 0);
      for (const y of [-0.24, 0.24]) cylinder(0.185, 0.047, dark, x, y, 0);
    }
  } else if (id === "cooler") {
    box(root, 1.12, 0.61, 0.18, finish);
    for (let i = 0; i < 11 + tier * 3; i++)
      box(
        root,
        1,
        0.014,
        0.19,
        steel,
        0,
        -0.27 + (i * 0.54) / (10 + tier * 3),
        0,
      );
    for (const s of [-1, 1])
      pipe(
        [
          [s * 0.53, 0, 0],
          [s * 0.71, 0, 0],
          [s * 0.72, 0.28, 0],
        ],
        0.07,
      );
  } else if (id === "gearbox") {
    const bell = cylinder(0.32, 0.33, steel, 0, 0, -0.38);
    bell.rotation.x = Math.PI / 2;
    const body = cylinder(0.23, 0.69, dark, 0, 0, 0.12);
    body.rotation.x = Math.PI / 2;
    for (let i = 0; i < 5 + tier; i++) {
      const r = torus(0.24, 0.024, finish, 0, 0, -0.1 + i * 0.072);
      r.rotation.z = 0.1;
    }
    const shaft = cylinder(0.07, 0.37, steel, 0, 0, 0.58);
    shaft.rotation.x = Math.PI / 2;
  } else if (id === "suspension") {
    for (const s of [-1, 1]) {
      const x = s * 0.24;
      cylinder(0.07, 1.08, steel, x, 0, 0);
      cylinder(0.105, 0.3, finish, x, -0.39, 0);
      const pts = Array.from({ length: 150 }, (_, i) => {
        let a = (i / 149) * Math.PI * (10 + tier * 2);
        return new THREE.Vector3(
          x + Math.sin(a) * 0.14,
          -0.25 + (i / 149) * 0.68,
          Math.cos(a) * 0.14,
        );
      });
      mesh(
        root,
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(pts),
          150,
          0.024,
          8,
          false,
        ),
        finish,
      );
      cylinder(0.18, 0.05, dark, x, 0.5, 0);
      cylinder(0.18, 0.05, dark, x, -0.31, 0);
    }
  } else if (id === "exhaust") {
    for (const s of [-1, 1]) {
      const muffler = cylinder(0.14, 0.63, dark, s * 0.2, 0, 0);
      muffler.rotation.x = Math.PI / 2;
      pipe(
        [
          [s * 0.2, 0, 0.25],
          [s * 0.3, 0, 0.53],
          [s * 0.3, 0.07, 0.7],
        ],
        0.075,
        finish,
      );
      torus(0.077, 0.014, steel, s * 0.3, 0.07, 0.7);
      for (let i = 0; i < tier; i++)
        torus(0.142, 0.011, finish, s * 0.2, 0, -0.22 + i * 0.12);
    }
  } else if (id === "armor") {
    for (let i = 0; i < 2 + tier; i++) {
      const panel = box(
        root,
        0.85,
        0.035,
        0.55,
        i % 2 ? dark : finish,
        (i % 2) * 0.055,
        i * 0.09,
        0,
      );
      panel.rotation.y = i * 0.075;
      for (const s of [-1, 1])
        for (const z of [-0.21, 0.21])
          cylinder(
            0.025,
            0.05,
            steel,
            s * 0.34 + (i % 2) * 0.055,
            i * 0.09 + 0.025,
            z,
          );
    }
  } else if (id === "weight") {
    const panel = box(root, 1.05, 0.045, 0.85, dark);
    panel.rotation.x = 0.12;
    for (let i = 0; i < 12 + tier * 4; i++) {
      const strip = box(
        root,
        0.009,
        0.048,
        0.83,
        metal(i % 2 ? "#414953" : "#252d36"),
        -0.49 + (i * 0.98) / (11 + tier * 4),
        0,
        0,
      );
      strip.rotation.x = 0.12;
    }
    for (const s of [-1, 1])
      box(root, 0.045, 0.08, 0.8, finish, s * 0.5, -0.04, 0);
  }
  root.userData = { part: id, tier };
  return root;
}
