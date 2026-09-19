import * as THREE from "./vendor/three.module.js";

// Reference-informed silhouettes, merged into the existing city static batches.
// No downloaded photographs, extra render loop or per-landmark texture cache.
export function buildHeritage(s, g, kit) {
  const { add, box, cylinder, beam, cream, stone, glass, gold, iron } = kit;
  const arch = (x, y, z, r, height, material = cream) => {
    box(0.55, height, r * 0.45, material, x - r, y + height / 2, z, g);
    box(0.55, height, r * 0.45, material, x + r, y + height / 2, z, g);
    add(
      new THREE.TorusGeometry(r, 0.3, 5, 16, Math.PI),
      material,
      x,
      y + height,
      z,
      g,
    );
  };
  const pediment = (w, d, y, z) => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(0, w * 0.17);
    shape.closePath();
    return add(
      new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }),
      cream,
      0,
      y,
      z,
      g,
    );
  };
  if (s.style === "parliament") {
    box(s.w, 1.2, s.d, stone, 0, 0.6, 0, g);
    const dome = add(
      new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      glass,
      0,
      1.2,
      0,
      g,
    );
    dome.scale.set(s.w / 2, s.h - 1.2, s.d / 2);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const t = ((i / 24) * Math.PI) / 2;
        pts.push(
          new THREE.Vector3(
            ((Math.cos(a) * s.w) / 2) * Math.sin(t),
            1.3 + (s.h - 1.2) * Math.cos(t),
            ((Math.sin(a) * s.d) / 2) * Math.sin(t),
          ),
        );
      }
      add(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(pts),
          24,
          0.16,
          4,
          false,
        ),
        cream,
        0,
        0,
        0,
        g,
      );
    }
    for (let i = 1; i < 9; i++) {
      const t = ((i / 9) * Math.PI) / 2;
      const ring = add(
        new THREE.TorusGeometry(1, 0.0035, 4, 60),
        cream,
        0,
        1.3 + (s.h - 1.2) * Math.cos(t),
        0,
        g,
      );
      ring.rotation.x = Math.PI / 2;
      ring.scale.set((s.w / 2) * Math.sin(t), (s.d / 2) * Math.sin(t), s.w / 2);
    }
    // Sweeping white shell across the elliptical glass roof.
    const pts = [];
    for (let i = 0; i <= 32; i++) {
      const t = (i / 32) * Math.PI;
      pts.push(
        new THREE.Vector3(
          Math.cos(t) * s.w * 0.5,
          1.8 + Math.sin(t) * (s.h - 1),
          Math.sin(t) * s.d * 0.12,
        ),
      );
    }
    add(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 2, 6, false),
      cream,
      0,
      0,
      0,
      g,
    );
    box(18, 4, 2, glass, 0, 2, s.d / 2 - 0.8, g);
    return true;
  }
  if (s.style === "museum" || s.style === "theatre") {
    box(s.w, s.h, s.d, cream, 0, s.h / 2, 0, g);
    for (const y of [0.6, s.h * 0.48, s.h - 0.5])
      box(s.w + 0.5, 0.45, s.d + 0.5, stone, 0, y, 0, g);
    for (let x = -s.w / 2 + 3; x < s.w / 2 - 2; x += 5.6) {
      for (const y of [2, s.h * 0.57]) {
        box(2.5, 4, 0.1, glass, x, y + 2, s.d / 2 + 0.055, g);
        arch(x, y, s.d / 2 + 0.22, 1.3, 3);
      }
    }
    if (s.style === "theatre") {
      for (let x = -17; x <= 17; x += 6.8) {
        cylinder(0.68, 15, cream, x, 9, s.d / 2 - 0.3, g);
        box(2, 1, 2, stone, x, 16.7, s.d / 2 - 0.3, g);
      }
      pediment(42, 3, s.h, s.d / 2 - 3);
      for (const x of [-20, 20])
        box(1.6, s.h, s.d + 0.3, stone, x, s.h / 2, 0, g);
    } else {
      box(9, 5, 0.3, iron, 0, 2.5, s.d / 2 + 0.2, g);
      arch(0, 0, s.d / 2 + 0.5, 4.5, 4.5);
      pediment(14, 1, s.h, s.d / 2 - 1);
    }
    return true;
  }
  if (s.style === "colonnades") {
    for (const side of [-1, 1]) {
      box(19, 0.5, 13, stone, side * 12.5, 0.25, 0, g);
      for (const x of [side * 4.5, side * 12.5, side * 20.5])
        for (const z of [-4.5, 4.5]) {
          cylinder(0.67, 7.4, cream, x, 4.2, z, g);
          cylinder(0.9, 0.45, cream, x, 0.7, z, g);
          box(1.8, 0.55, 1.8, cream, x, 7.9, z, g);
        }
      for (const z of [-4.5, 4.5])
        box(19, 1.1, 2, cream, side * 12.5, 8.65, z, g);
      for (const x of [side * 4.5, side * 20.5])
        box(2, 1.1, 11, cream, x, 8.65, 0, g);
      for (let i = 0; i < 9; i++) {
        const x = side * (4.5 + i * 2);
        cylinder(0.12, 0.8, cream, x, 9.65, 4.5, g);
      }
      box(19, 0.25, 1, cream, side * 12.5, 10.1, 4.5, g);
    }
    return true;
  }
  if (s.style === "gothic") {
    box(30, 1, 46, stone, 0, 0.5, 0, g);
    box(24, 21, 44, cream, 0, 11.5, 0, g);
    const roof = pediment(25, 43, 22, -21.5);
    roof.material = iron;
    for (const x of [-10, 10]) {
      box(8, 28, 9, cream, x, 15, 17, g);
      add(new THREE.ConeGeometry(5.5, 11, 4), iron, x, 34.5, 17, g).rotation.y =
        Math.PI / 4;
      beam([x, 39, 17], [x, 41, 17], 0.1, gold, g);
      beam([x - 0.6, 40.3, 17], [x + 0.6, 40.3, 17], 0.09, gold, g);
      arch(x, 21, 21.6, 1.35, 4);
      box(2.3, 4, 0.1, glass, x, 23.5, 21.6, g);
    }
    for (const x of [-11.9, -5.4, 5.4, 11.9])
      box(0.55, 21, 0.8, stone, x, 11.5, 22.3, g);
    for (const y of [1.4, 8, 22]) box(24.4, 0.4, 0.85, stone, 0, y, 22.3, g);
    for (const x of [-6.8, 6.8]) {
      box(1.65, 4.5, 0.18, glass, x, 11.4, 22.12, g);
      arch(x, 9.2, 22.4, 1.05, 3.8);
    }
    const rose = add(
      new THREE.TorusGeometry(3, 0.45, 6, 18),
      stone,
      0,
      17,
      22.15,
      g,
    );
    add(new THREE.CircleGeometry(2.7, 18), glass, 0, 17, 22.12, g);
    for (let a = 0; a < Math.PI; a += Math.PI / 6)
      beam(
        [Math.cos(a) * 2.7, 17 + Math.sin(a) * 2.7, 22.25],
        [-Math.cos(a) * 2.7, 17 - Math.sin(a) * 2.7, 22.25],
        0.1,
        cream,
        g,
      );
    box(4, 6, 0.2, iron, 0, 3.8, 22.1, g);
    arch(0, 1, 22.35, 2.3, 5);
    for (const x of [-12.3, 12.3])
      for (let z = -17; z < 14; z += 7) {
        box(1.2, 22, 1.4, stone, x, 11, z, g);
        box(0.15, 8, 2.5, glass, x, 14, z + 3, g);
      }
    return true;
  }
  if (s.style === "neptune") {
    cylinder(7, 1, stone, 0, 0.5, 0, g);
    cylinder(6.4, 0.08, glass, 0, 1.05, 0, g);
    cylinder(2, 4, cream, 0, 3, 0, g);
    cylinder(3, 0.5, stone, 0, 5, 0, g);
    cylinder(0.75, 3, gold, 0, 7, 0, g);
    add(new THREE.SphereGeometry(0.55, 10, 8), gold, 0, 9, 0, g);
    for (const side of [-1, 1])
      beam([side * 0.45, 6, 0], [side * 0.6, 5.25, 0.3], 0.2, gold, g);
    beam([0.4, 8, 0], [2, 8.8, 0], 0.2, gold, g);
    beam([2, 6, 0], [2, 11.4, 0], 0.085, gold, g);
    for (const x of [1.5, 2, 2.5])
      beam([2, 10.5, 0], [x, 11.5, 0], 0.08, gold, g);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      add(
        new THREE.SphereGeometry(0.8, 8, 6),
        stone,
        Math.cos(a) * 3.5,
        1.8,
        Math.sin(a) * 3.5,
        g,
      );
    }
    return true;
  }
  return false;
}
