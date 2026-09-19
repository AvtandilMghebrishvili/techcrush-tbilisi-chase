import * as THREE from "./vendor/three.module.js";
import { ROAD_SURFACE } from "./road-surface-data.js";
import { surfaceGeometry } from "./road-surface.js";
import {
  RUSTAVI_SITES,
  RIVER_POLYGON,
  RIVER_BANKS,
  EXAM_YARD,
  LANDMARKS,
  GRANDSTAND_STEPS,
} from "./rustavi-district-data.js";
import { BRIDGE_DECKS } from "./bridge-data.js";
import { buildBridgeRails } from "./bridge-visuals.js";
import {
  facadeMaterial,
  batchStatic,
  buildExpansion,
} from "./expansion-visuals.js";
import { RAMPS } from "./stunts.js";
import { registerBreakable } from "./breakable-props.js";
import { buildCivicDetails } from "./rustavi-civic-visuals.js";
const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
export function rustaviFacades() {
  return [0, 1, 2, 1, 0].map((style, i) => {
    const m = facadeMaterial(style);
    m.color.set(["#d3c2a9", "#e6d6b8", "#d6c7b4", "#b7c0bb", "#c9a983"][i]);
    return m;
  });
}
export function buildRustaviCity(v) {
  const root = new THREE.Group();
  root.userData.environment = true;
  v.decor.add(root);
  const stone = mat("#bfb6a3"),
    cream = mat("#eee0c5"),
    roof = mat("#986b57"),
    iron = mat("#343d44", { metalness: 0.6 }),
    bronze = mat("#827b55", { metalness: 0.78 }),
    white = mat("#e7e7da"),
    red = mat("#ec3455"),
    asphalt = mat("#646769");
  const windows = mat("#334e5a", {
    roughness: 0.25,
    metalness: 0.4,
    emissive: "#ffcf88",
    emissiveIntensity: 0,
  });
  v.nightWindowMaterials ||= [];
  v.nightWindowMaterials.push(windows);
  v.districtMaterials = {
    stone,
    cream,
    grass: mat("#8a9466"),
    ground: mat("#a5a087"),
  };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = root) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const box = (w, h, d, m, x, y, z, p = root) =>
    add(new THREE.BoxGeometry(w, h, d), m, x, y, z, p);
  const cylinder = (r, h, m, x, y, z, p = root) =>
    add(new THREE.CylinderGeometry(r, r, h, 12), m, x, y, z, p);
  const orb = (a, b, c, m, x, y, z, p = root) => {
    const o = add(new THREE.SphereGeometry(1, 12, 8), m, x, y, z, p);
    o.scale.set(a, b, c);
    return o;
  };
  const beam = (a, b, r, m, p = root) => {
    const x = new THREE.Vector3(...a),
      y = new THREE.Vector3(...b);
    const o = add(
      new THREE.CylinderGeometry(r, r, x.distanceTo(y), 8),
      m,
      0,
      0,
      0,
      p,
    );
    o.position.copy(x).add(y).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      y.sub(x).normalize(),
    );
    return o;
  };
  const label = (text, w, h, x, y, z, angle = 0, p = root) => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#1c272d";
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = "#f9e8bc";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, 512, 82, 995);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const o = add(
      new THREE.PlaneGeometry(w, h),
      mat("white", { map: t }),
      x,
      y,
      z,
      p,
    );
    o.rotation.y = angle;
    return o;
  };
  const ground = add(
    surfaceGeometry(ROAD_SURFACE.ground, -0.28),
    v.districtMaterials.ground,
  );
  ground.castShadow = false;
  const waterTime = { value: 0 },
    waterMat = mat("#527e78", { metalness: 0.5, roughness: 0.3 });
  waterMat.onBeforeCompile = (s) => {
    s.uniforms.riverTime = waterTime;
    s.vertexShader = "uniform float riverTime;\n" + s.vertexShader;
    s.vertexShader = s.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntransformed.y+=sin(position.x*.1+riverTime)*.07;",
    );
  };
  const water = add(surfaceGeometry([[RIVER_POLYGON]], -6.4), waterMat);
  water.castShadow = false;
  water.userData.dynamic = true;
  v.waterTime = waterTime;
  for (const bank of RIVER_BANKS)
    for (let i = 1; i < bank.length; i++) {
      const a = bank[i - 1],
        b = bank[i],
        len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      box(
        2.6,
        6,
        len,
        stone,
        (a[0] + b[0]) / 2,
        -3,
        (a[1] + b[1]) / 2,
      ).rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
    }
  for (const b of BRIDGE_DECKS) {
    const g = new THREE.Group();
    g.position.set(b.x, 0, b.z);
    g.rotation.y = b.angle;
    root.add(g);
    box(b.width, 0.55, b.length, stone, 0, -0.26, 0, g);
    for (const z of [-b.length * 0.25, b.length * 0.25])
      box(b.width * 0.6, 6, 2.5, stone, 0, -3.4, z, g);
  }
  buildBridgeRails(v, stone, iron);
  for (const s of RUSTAVI_SITES) {
    if (["heroes", "heroes-apartment", "hall"].includes(s.style)) continue;
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.angle;
    root.add(g);
    if (s.style === "diamond") {
      box(s.w, s.h, s.d, stone, 0, s.h / 2, 0, g);
      // Enlarged hollow, folded diamond: the user's new Rustavi monument reference.
      const shape = new THREE.Shape();
      shape.moveTo(0, 12);
      shape.lineTo(11, 0);
      shape.lineTo(0, -12);
      shape.lineTo(-11, 0);
      shape.closePath();
      const hole = new THREE.Path();
      hole.moveTo(0, 6.4);
      hole.lineTo(-5.5, 0);
      hole.lineTo(0, -6.4);
      hole.lineTo(5.5, 0);
      hole.closePath();
      shape.holes.push(hole);
      const ring = add(
        new THREE.ExtrudeGeometry(shape, {
          depth: 3,
          bevelEnabled: true,
          bevelSegments: 2,
          steps: 1,
          bevelSize: 0.9,
          bevelThickness: 0.65,
        }),
        cream,
        0,
        17,
        -1.5,
        g,
      );
      ring.rotation.y = 0.08;
      for (let i = 0; i < 8; i++) {
        const t = i / 8;
        beam(
          [-10 + 10 * t, 17 + 12 * t, 2.1],
          [-5.4 + 5.4 * t, 17 + 6.4 * t, 2.8],
          0.13,
          stone,
          g,
        );
      }
      label("რუსთავის ახალი ძეგლი", 11, 1.25, 0, 2.6, 4.56, 0, g);
      continue;
    }
    if (s.style === "horses" || s.style === "poet") {
      box(s.w, s.h, s.d, stone, 0, s.h / 2, 0, g);
      if (s.style === "horses")
        for (const side of [-1, 1]) {
          box(2.4, 12, 2.4, cream, side * 4, 10, 0, g);
          orb(2.5, 1.4, 1.1, bronze, side * 4, 17, 0, g);
          orb(0.75, 1.9, 0.68, bronze, side * 4 + 1.4, 18.5, 0, g);
          orb(1, 0.55, 0.6, bronze, side * 4 + 2, 20, 0, g);
          for (const z of [-0.65, 0.65]) {
            beam(
              [side * 4 - 1.2, 17, z],
              [side * 4 - 2, 15.4, z],
              0.2,
              bronze,
              g,
            );
            beam(
              [side * 4 + 1.4, 17, z],
              [side * 4 + 2.3, 18, z],
              0.19,
              bronze,
              g,
            );
          }
          beam(
            [side * 4 - 2, 17.5, 0],
            [side * 4 - 3.2, 15.9, 0],
            0.25,
            bronze,
            g,
          );
        }
      else {
        box(3, 3, 2.7, bronze, 0, 5, 0, g);
        orb(1.15, 2.1, 0.85, bronze, 0, 7.2, 0, g);
        orb(0.65, 0.85, 0.7, bronze, 0, 9.7, 0, g);
        beam([-1, 7.5, 0], [-2, 5.7, 1.4], 0.3, bronze, g);
        beam([1, 7.5, 0], [1.7, 5.7, 1.4], 0.3, bronze, g);
      }
      label(s.name, 12, 1.2, 0, 2.1, s.d / 2 + 0.04, 0, g);
      continue;
    }
    box(
      s.w,
      s.h,
      s.d,
      s.style === "industry" ? stone : cream,
      0,
      s.h / 2,
      0,
      g,
    );
    box(s.w + 0.5, 0.55, s.d + 0.5, roof, 0, s.h + 0.27, 0, g);
    const floors = Math.max(2, Math.floor(s.h / 5));
    for (let level = 0; level < floors; level++)
      for (let x = -s.w / 2 + 4; x < s.w / 2 - 2; x += 5.8) {
        const y = 3 + level * 4.8;
        for (const side of [-1, 1]) {
          box(2.7, 3, 0.08, windows, x, y, side * (s.d / 2 + 0.06), g);
          if (s.style === "hall" || s.style === "theatre") {
            const arch = new THREE.Mesh(
              new THREE.TorusGeometry(1.45, 0.17, 5, 12, Math.PI),
              stone,
            );
            arch.position.set(x, y + 1.45, side * (s.d / 2 + 0.15));
            g.add(arch);
          }
        }
      }
    if (s.style === "hall" || s.style === "theatre") {
      for (let x = -s.w / 2 + 2; x <= s.w / 2 - 2; x += 5.8)
        box(0.55, s.h - 2, 0.38, stone, x, s.h / 2, s.d / 2 + 0.15, g);
      for (const y of [1, s.h * 0.5, s.h - 0.5])
        box(s.w + 0.7, 0.45, s.d + 0.4, stone, 0, y, 0, g);
      if (s.style === "theatre") {
        const pediment = add(
          new THREE.ConeGeometry(s.w * 0.33, 5, 3),
          cream,
          0,
          s.h + 2,
          0,
          g,
        );
        pediment.rotation.y = Math.PI / 2;
        pediment.scale.z = 0.35;
      }
    }
    if (s.style === "industry")
      for (let x = -25; x <= 25; x += 25) {
        cylinder(2.8, 38, roof, x, s.h + 19, 0, g);
        for (let y = 32; y < 66; y += 8) cylinder(2.84, 1, cream, x, y, 0, g);
      }
    if (s.style === "pits")
      for (let x = -32; x <= 32; x += 8)
        box(6, 4, 0.15, iron, x, 2.1, s.d / 2 + 0.1, g);
    label(s.name, s.w * 0.82, 1.7, 0, s.h - 1.9, s.d / 2 + 0.36, 0, g);
  }
  // Closed-course exam manoeuvres: parking bays, slalom, stop line and hill-start.
  const e = EXAM_YARD;
  box(e.w, 0.045, e.d, asphalt, e.x, 0.022, e.z);
  for (let lane = -2; lane <= 2; lane++) {
    box(0.14, 0.015, e.d - 10, white, e.x + lane * 28, 0.075, e.z);
    for (let j = 0; j < 5; j++)
      box(
        20,
        0.015,
        0.13,
        white,
        e.x + lane * 28 + 10,
        0.075,
        e.z - e.d / 2 + 12 + j * 11,
      );
  }
  for (let i = 0; i < 10; i++) {
    const x = e.x - 62 + (i % 2) * 7,
      z = e.z - 43 + i * 9,
      g = new THREE.Group();
    g.position.set(x, 0, z);
    root.add(g);
    g.userData.dynamic = true;
    add(new THREE.ConeGeometry(0.42, 1.2, 8), red, 0, 0.6, 0, g);
    box(0.8, 0.06, 0.8, iron, 0, 0.03, 0, g);
    registerBreakable(v, g, x, z, 1.2, 0.4, "plastic");
  }
  label(
    "DRIVING ACADEMY · SLALOM / PARK / STOP",
    50,
    2.8,
    e.x,
    5,
    e.z - e.d / 2,
    Math.PI,
  );
  box(25, 0.016, 1.1, white, e.x + 48, 0.076, e.z + 48);
  label("STOP", 7, 2, e.x + 60, 3.3, e.z + 51, Math.PI);
  const p = LANDMARKS.track;
  for (const [row, step] of GRANDSTAND_STEPS.entries())
    box(
      step.w,
      step.h,
      step.d,
      row % 2 ? white : red,
      step.x,
      step.h / 2,
      step.z,
    );
  label("RUSTAVI INTERNATIONAL MOTORPARK", 76, 4, p.x, 15, p.z + 12);
  // Reuse the same tested ramp mesh, roof crate, footprint and landing logic as other cities.
  buildExpansion(v, root, box, label, v.expansionFacades);
  for (const r of RAMPS) {
    const g = new THREE.Group();
    g.position.set(r.x, 0, r.z);
    g.rotation.y = r.angle;
    root.add(g);
    const s = new THREE.Shape();
    s.moveTo(-r.length / 2, 0);
    s.lineTo(r.length / 2, 0);
    s.lineTo(r.length / 2, r.height);
    s.closePath();
    const ramp = add(
      new THREE.ExtrudeGeometry(s, { depth: r.width, bevelEnabled: false }),
      iron,
      r.width / 2,
      0,
      0,
      g,
    );
    ramp.rotation.y = -Math.PI / 2;
    for (let z = -r.length / 2 + 0.5; z < r.length / 2; z += 1.6) {
      const stripe = box(
        r.width,
        0.04,
        0.27,
        z % 3 > 1.5 ? red : cream,
        0,
        (z / r.length + 0.5) * r.height + 0.035,
        z,
        g,
      );
      stripe.rotation.x = -Math.atan(r.height / r.length);
    }
    label(
      r.name,
      11,
      1,
      r.x + Math.cos(r.angle) * 7,
      3.4,
      r.z - Math.sin(r.angle) * 7,
      r.angle,
    );
  }

  buildCivicDetails(v, root, {
    add,
    box,
    cylinder,
    beam,
    label,
    stone,
    cream,
    iron,
    windows,
  });
  batchStatic(root);
}
