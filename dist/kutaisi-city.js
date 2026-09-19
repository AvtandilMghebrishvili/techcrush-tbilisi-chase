import { buildHeritagePlazas } from "./heritage-plazas.js";
import { buildHeritage } from "./city-heritage.js";
import { buildCableCars } from "./cable-cars.js";
import * as THREE from "./vendor/three.module.js";
import { surfaceGeometry } from "./road-surface.js";
import { ROAD_SURFACE } from "./road-surface-data.js";
import {
  KUTAISI_SITES,
  FORECOURTS,
  CABLE_STATIONS,
  LANDMARKS,
  RIVER_POLYGON,
  RIVER_BANKS,
} from "./kutaisi-district-data.js";
import { BRIDGE_DECKS, PEACE_DECK } from "./bridge-data.js";
import { buildBridgeRails } from "./bridge-visuals.js";
import { RAMPS } from "./stunts.js";
import { ROOFTOP, QUEST_BOX } from "./world-sites.js";
import { ROADS, BUILDINGS, containsPoint } from "./city-map.js";
import { roadClear } from "./road-clearance.js";
import { registerBreakable } from "./breakable-props.js";
import { batchStatic, facadeMaterial } from "./expansion-visuals.js";
const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

// Original reference-informed lime plaster / stone facades, shared emission masks.
export function kutaisiFacades() {
  return [0, 1, 2, 1, 2].map((style, i) => {
    const m = facadeMaterial(style);
    m.color.set(["#d5c9b5", "#f1e3be", "#dce4db", "#cebdac", "#e4dcd0"][i]);
    m.map.repeat.y = m.emissiveMap.repeat.y = 0.5;
    return m;
  });
}
export function buildKutaisiCity(v) {
  const root = new THREE.Group();
  root.userData.environment = true;
  v.decor.add(root);
  const stone = mat("#c5c0ae"),
    cream = mat("#efe6cf"),
    roof = mat("#328d8c", { metalness: 0.28, roughness: 0.57 }),
    bronze = mat("#706d51", { metalness: 0.78 }),
    gold = mat("#c99f42", { metalness: 0.83, roughness: 0.32 }),
    iron = mat("#434e51", { metalness: 0.7 }),
    white = mat("#ecede4"),
    wood = mat("#654b3b"),
    red = mat("#aa4336"),
    glass = mat("#497981", { metalness: 0.45, roughness: 0.2 }),
    grass = mat("#6f8254");
  v.districtMaterials = { stone, cream, grass, ground: mat("#92947a") };
  v.nightWindowMaterials ||= [];
  const window = mat("#2b4850", {
    metalness: 0.5,
    roughness: 0.25,
    emissive: "#ffc57a",
    emissiveIntensity: 0,
  });
  v.nightWindowMaterials.push(window);
  const add = (geo, m, x = 0, y = 0, z = 0, parent = root) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const box = (w, h, d, m, x, y, z, parent = root) =>
    add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const orb = (rx, ry, rz, m, x, y, z, parent = root) => {
    const o = add(new THREE.SphereGeometry(1, 12, 9), m, x, y, z, parent);
    o.scale.set(rx, ry, rz);
    return o;
  };
  const cylinder = (r, h, m, x, y, z, parent = root, n = 16) =>
    add(new THREE.CylinderGeometry(r, r, h, n), m, x, y, z, parent);
  const beam = (a, b, r, m, parent = root) => {
    const p = new THREE.Vector3(...a),
      q = new THREE.Vector3(...b);
    const o = add(
      new THREE.CylinderGeometry(r, r, p.distanceTo(q), 7),
      m,
      0,
      0,
      0,
      parent,
    );
    o.position.copy(p).add(q).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      q.sub(p).normalize(),
    );
    return o;
  };
  const label = (text, w, h, x, y, z, angle = 0, parent = root) => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#123638";
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = "#f5e8bf";
    ctx.font = "bold 46px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, 512, 82, 990);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const o = add(
      new THREE.PlaneGeometry(w, h),
      mat("#ffffff", { map: t, side: THREE.DoubleSide }),
      x,
      y,
      z,
      parent,
    );
    o.rotation.y = angle;
    return o;
  };
  const ground = add(
    surfaceGeometry(ROAD_SURFACE.ground, -0.28),
    v.districtMaterials.ground,
  );
  ground.castShadow = false;
  // Small lawn tiles follow the park margins without covering streets or buildings.
  const lawns = [];
  for (const [p, rx, rz] of [
    [LANDMARKS.boulevard, 59, 68],
    [LANDMARKS.park, 76, 76],
    [LANDMARKS.rike, 98, 148],
  ]) {
    for (let dx = -rx; dx < rx; dx += 8)
      for (let dz = -rz; dz < rz; dz += 8) {
        const corners = [
          [p.x + dx, p.z + dz],
          [p.x + dx + 8, p.z + dz],
          [p.x + dx + 8, p.z + dz + 8],
          [p.x + dx, p.z + dz + 8],
        ];
        if (
          corners.some(
            ([x, z]) =>
              ((x - p.x) / rx) ** 2 + ((z - p.z) / rz) ** 2 > 1 ||
              !roadClear({ x, z }, 3) ||
              BUILDINGS.some((b) => containsPoint(b, x, z, 2)),
          )
        )
          continue;
        lawns.push([[...corners, corners[0]]]);
      }
  }
  const lawn = add(surfaceGeometry(lawns, 0.02), grass);
  lawn.castShadow = false;
  const waterTime = { value: 0 },
    waterMat = mat("#547f75", { metalness: 0.5, roughness: 0.27 });
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.riverTime = waterTime;
    shader.vertexShader = "uniform float riverTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntransformed.y+=sin(position.x*.11+riverTime)*.075+cos(position.z*.13+riverTime*.6)*.06;",
    );
  };
  const water = add(surfaceGeometry([[RIVER_POLYGON]], -6.4), waterMat);
  water.castShadow = false;
  water.userData.dynamic = true;
  v.waterTime = waterTime;
  // Pale Rioni bedrock and the exact support-cap outlines used by water physics.
  for (const bank of RIVER_BANKS)
    for (let i = 1; i < bank.length; i++) {
      const a = bank[i - 1],
        b = bank[i],
        length = Math.hypot(b[0] - a[0], b[1] - a[1]),
        angle = Math.atan2(b[0] - a[0], b[1] - a[1]);
      box(
        2.1,
        6,
        length,
        stone,
        (a[0] + b[0]) / 2,
        -3,
        (a[1] + b[1]) / 2,
      ).rotation.y = angle;
      box(
        2.6,
        0.28,
        length,
        cream,
        (a[0] + b[0]) / 2,
        0.12,
        (a[1] + b[1]) / 2,
      ).rotation.y = angle;
      for (let d = 6; d < length; d += 19) {
        const t = d / length;
        const rock = add(
          new THREE.DodecahedronGeometry(1, 0),
          stone,
          a[0] + (b[0] - a[0]) * t,
          -6.1,
          a[1] + (b[1] - a[1]) * t,
        );
        rock.scale.set(4 + (i % 3), 1.1, 3);
      }
    }
  for (const b of [...BRIDGE_DECKS, PEACE_DECK]) {
    const g = new THREE.Group();
    g.position.set(b.x, 0, b.z);
    g.rotation.y = b.angle;
    root.add(g);
    const frame =
      b.name === "RED BRIDGE" ? red : b.name === "WHITE BRIDGE" ? white : stone;
    box(b.width, 0.55, b.length, frame, 0, -0.26, 0, g);
    for (const side of [-1, 1]) {
      box(0.4, 1.1, b.length, frame, side * (b.width / 2 - 0.25), -1, 0, g);
      for (let z = -b.length / 2 + 3; z < b.length / 2; z += 7) {
        beam(
          [side * (b.width / 2 - 0.25), -1.4, z],
          [side * (b.width / 2 - 0.25), -0.35, Math.min(z + 7, b.length / 2)],
          0.12,
          frame,
          g,
        );
      }
    }
    for (const z of [-b.length * 0.28, b.length * 0.28])
      box(b.width * 0.65, 6, 3.1, stone, 0, -3.5, z, g);
    if (b.name === "WHITE BRIDGE") {
      for (let z = -b.length / 2 + 3; z < b.length / 2; z += 5)
        box(3, 0.045, 3.8, glass, 0, 0.085, z, g);
      // Picasso's Boy: perched bronze figure with both stolen hats, from the supplied close reference.
      const boy = new THREE.Group();
      boy.position.set(b.width / 2 - 0.25, 1.5, b.length * 0.22);
      boy.rotation.y = -Math.PI / 2;
      g.add(boy);
      orb(0.28, 0.24, 0.22, bronze, 0, 0.12, 0, boy);
      orb(0.24, 0.48, 0.19, bronze, 0, 0.67, -0.06, boy);
      orb(0.19, 0.25, 0.18, bronze, 0, 1.35, -0.1, boy);
      orb(0.2, 0.13, 0.19, bronze, 0, 1.51, -0.09, boy);
      orb(0.075, 0.055, 0.08, bronze, 0, 1.36, 0.08, boy);
      for (const x of [-0.085, 0.085]) {
        orb(0.041, 0.018, 0.03, iron, x, 1.4, 0.065, boy);
        beam(
          [x - 0.038, 1.44, 0.074],
          [x + 0.038, 1.44, 0.084],
          0.012,
          bronze,
          boy,
        );
      }
      beam([-0.055, 1.27, 0.071], [0.055, 1.27, 0.071], 0.012, iron, boy);
      for (let i = 0; i < 9; i++)
        orb(
          0.045,
          0.06,
          0.12,
          bronze,
          Math.sin(i * 2.4) * 0.13,
          1.53 + Math.cos(i) * 0.02,
          -0.06 + Math.cos(i * 2.4) * 0.08,
          boy,
        );
      for (const side of [-1, 1]) {
        beam(
          [side * 0.17, 0.98, -0.03],
          [side * 0.48, 0.95, 0.35],
          0.09,
          bronze,
          boy,
        );
        beam(
          [side * 0.48, 0.95, 0.35],
          [side * 0.61, 1.08, 0.87],
          0.073,
          bronze,
          boy,
        );
        orb(0.08, 0.075, 0.12, bronze, side * 0.61, 1.08, 0.91, boy);
        const hat = cylinder(
          0.31,
          0.05,
          bronze,
          side * 0.61,
          1.06,
          1.16,
          boy,
          20,
        );
        hat.rotation.x = 0.2;
        cylinder(0.19, 0.17, bronze, side * 0.61, 1.15, 1.16, boy, 16);
        beam(
          [side * 0.16, 0.16, 0.04],
          [side * 0.3, -0.12, 0.4],
          0.13,
          bronze,
          boy,
        );
        beam(
          [side * 0.3, -0.12, 0.4],
          [side * 0.33, -0.68, 0.29],
          0.09,
          bronze,
          boy,
        );
        orb(0.1, 0.07, 0.21, bronze, side * 0.33, -0.74, 0.38, boy);
      }
      label(
        "თეთრი ხიდი · WHITE BRIDGE",
        9,
        1.1,
        -b.width / 2,
        3,
        -b.length * 0.28,
        Math.PI / 2,
        g,
      );
      v.picassoBoy = boy;
    }
  }
  buildBridgeRails(v, cream, white);
  const gabled = (w, d, y, m, parent) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(0, w * 0.3);
    s.closePath();
    const o = add(
      new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }),
      m,
      0,
      y,
      -d / 2,
      parent,
    );
    return o;
  };
  buildHeritagePlazas(root, FORECOURTS, stone, cream);
  for (const s of KUTAISI_SITES) {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.angle;
    root.add(g);
    if (
      s.style !== "theatre" &&
      buildHeritage(s, g, {
        add,
        box,
        cylinder,
        beam,
        cream,
        stone,
        glass,
        gold,
        iron,
      })
    ) {
      // Architecture shares the parent city batch and materials.
    } else if (s.style === "fountain") {
      cylinder(12.5, 1.4, stone, 0, 0.7, 0, g, 48);
      cylinder(11.9, 0.08, glass, 0, 1.45, 0, g, 48);
      cylinder(4.8, 2.4, stone, 0, 2.55, 0, g);
      cylinder(2.9, 2.3, stone, 0, 4.5, 0, g);
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI) / 12,
          r = i % 2 ? 9.7 : 7.2,
          x = Math.cos(a) * r,
          z = Math.sin(a) * r;
        cylinder(0.6, 0.45, stone, x, 1.7, z, g);
        orb(0.45, 0.45, 0.75, gold, x, 2.35, z, g);
        orb(0.22, 0.35, 0.24, gold, x, 2.85, z + 0.45, g);
        for (const dx of [-0.24, 0.24])
          beam([x + dx, 2.2, z - 0.35], [x + dx, 1.8, z - 0.4], 0.06, gold, g);
        const arc = new THREE.CatmullRomCurve3([
          new THREE.Vector3(x, 1.6, z),
          new THREE.Vector3(x * 0.78, 3, z * 0.78),
          new THREE.Vector3(x * 0.52, 1.5, z * 0.52),
        ]);
        add(new THREE.TubeGeometry(arc, 8, 0.026, 3, false), glass, 0, 0, 0, g);
      }
      for (const x of [-1.05, 1.05]) {
        orb(0.45, 0.7, 1.1, gold, x, 6.4, 0, g);
        beam([x, 6.6, 0.7], [x, 7.6, 1], 0.21, gold, g);
        orb(0.23, 0.32, 0.5, gold, x, 7.8, 1.1, g);
        for (const z of [-0.65, 0.65])
          beam([x, 6, z], [x, 5.2, z], 0.11, gold, g);
      }
    } else if (s.style === "cathedral") {
      box(40, 4, 56, stone, 0, 2, 0, g);
      box(25, 25, 51, cream, 0, 16.5, 0, g);
      box(38, 25, 20, cream, 0, 16.5, 0, g);
      gabled(28, 54, 29, roof, g);
      const cross = new THREE.Group();
      g.add(cross);
      cross.rotation.y = Math.PI / 2;
      gabled(22, 40, 29, roof, cross);
      cylinder(6.4, 11, cream, 0, 34, 0, g, 12);
      add(new THREE.ConeGeometry(8, 9, 12), roof, 0, 44, 0, g);
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        const w = box(
          1.2,
          5,
          0.16,
          window,
          Math.sin(a) * 6.43,
          35,
          Math.cos(a) * 6.43,
          g,
        );
        w.rotation.y = a;
      }
      beam([0, 48, 0], [0, 52, 0], 0.12, bronze, g);
      beam([-1, 50.6, 0], [1, 50.6, 0], 0.1, bronze, g);
      for (const side of [-1, 1])
        for (let z = -20; z <= 20; z += 8) {
          box(0.18, 13, 2, stone, side * 12.58, 17, z, g);
          box(0.2, 4, 1.2, window, side * 12.7, 20, z + 3, g);
        }
      for (const side of [-1, 1]) {
        box(4.6, 7, 0.18, wood, 0, 7.5, side * 25.6, g);
        box(2.1, 5, 0.18, window, 0, 21, side * 25.6, g);
        for (const x of [-9, -4, 4, 9]) {
          box(0.65, 21, 0.65, stone, x, 17, side * 25.7, g);
          box(1.5, 3, 0.19, window, x * 0.78, 21, side * 25.8, g);
        }
        for (const y of [8, 15, 27])
          box(26, 0.22, 0.7, stone, 0, y, side * 25.5, g);
      }
    } else {
      const facade = v.expansionFacades[s.style === "market" ? 0 : 2];
      box(s.w, s.h, s.d, facade, 0, s.h / 2, 0, g);
      for (const y of [1, s.h * 0.5, s.h + 0.3])
        box(s.w + 0.65, 0.32, s.d + 0.65, cream, 0, y, 0, g);
      if (s.style === "theatre" || s.style === "opera") {
        for (let x = -s.w * 0.42; x <= s.w * 0.42; x += s.w / 11) {
          cylinder(
            0.53,
            s.h * 0.77,
            cream,
            x,
            s.h * 0.46,
            s.d / 2 - 0.5,
            g,
            12,
          );
          box(1.6, 0.4, 1.2, stone, x, s.h * 0.84, s.d / 2 - 0.5, g);
        }
        if (s.style === "theatre") gabled(s.w * 0.94, 4, s.h + 0.5, cream, g);
        else
          for (let i = 0; i < 13; i++) {
            const x = (i - 6) * 3.5;
            box(1.2, 0.7, 1.2, stone, x, s.h + 1, 0, g);
            orb(0.3, 0.78, 0.26, bronze, x, s.h + 2, 0, g);
            orb(0.23, 0.26, 0.22, bronze, x, s.h + 3, 0, g);
          }
      } else if (s.style === "palace") {
        gabled(s.w + 2, s.d + 2, s.h, mat("#a95942"), g);
        for (let x = -8; x <= 8; x += 4)
          box(0.3, 4, 0.5, wood, x, 3.5, s.d / 2 + 0.1, g);
      } else if (s.style === "royal") {
        const turret = cylinder(
          4.1,
          8,
          cream,
          s.w * 0.2,
          s.h + 3,
          s.d * 0.2,
          g,
          16,
        );
        add(
          new THREE.ConeGeometry(5, 5, 16),
          iron,
          turret.position.x,
          s.h + 9,
          turret.position.z,
          g,
        );
      } else if (s.style === "synagogue") {
        for (const x of [-9, 9]) {
          box(4, 6, 4, cream, x, s.h + 2, s.d * 0.35, g);
          orb(2.3, 2.1, 2.3, roof, x, s.h + 6, s.d * 0.35, g);
        }
      } else box(s.w + 0.6, 0.55, s.d + 0.6, roof, 0, s.h + 0.85, 0, g);
    }
    label(
      s.name,
      Math.min(25, s.w * 0.8),
      1.2,
      0,
      s.style === "fountain"
        ? 1.3
        : s.style === "museum"
          ? 7.3
          : Math.min(4, s.h * 0.3),
      s.d / 2 + 0.75,
      0,
      g,
    );
  }
  // Besik Gabashvili park: a recognizable wheel and the river-crossing cable car.
  const park = LANDMARKS.park,
    wheel = new THREE.Group();
  wheel.userData.dynamic = true;
  wheel.position.set(park.x, 26, park.z);
  root.add(wheel);
  const ring = add(
    new THREE.TorusGeometry(20, 0.28, 6, 56),
    cream,
    0,
    0,
    0,
    wheel,
  );
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    beam(
      [0, 0, 0],
      [Math.cos(a) * 20, Math.sin(a) * 20, 0],
      0.095,
      iron,
      wheel,
    );
    box(
      2.2,
      2.4,
      2,
      i % 2 ? red : roof,
      Math.cos(a) * 20,
      Math.sin(a) * 20,
      0,
      wheel,
    );
  }
  for (const z of [-5, 5]) {
    beam([park.x - 9, 0, park.z + z], [park.x, 26, park.z], 0.45, cream);
    beam([park.x + 9, 0, park.z + z], [park.x, 26, park.z], 0.45, cream);
  }
  v.kutaisiWheel = wheel;
  const [cableA, cableB] = CABLE_STATIONS;
  for (const station of CABLE_STATIONS) {
    // Open platforms, attached pylons, and a canopy above the turnaround.
    box(12, 0.45, 15, cream, station.x, station.y - 6.3, station.z);
    box(12, 0.4, 15, roof, station.x, station.y + 1.1, station.z);
    for (const x of [-5, 5])
      for (const z of [-6, 6])
        box(
          0.6,
          station.y + 1,
          0.6,
          iron,
          station.x + x,
          (station.y + 1) / 2,
          station.z + z,
        );
    label(
      "KUTAISI CABLE CAR",
      10,
      1,
      station.x,
      station.y - 4.7,
      station.z + 7.55,
    );
  }
  buildCableCars(v, root, cableA, cableB, 4);
  // Original rooftop challenge annex and matching solid slopes.
  box(
    ROOFTOP.w,
    ROOFTOP.h,
    ROOFTOP.d,
    v.expansionFacades[1],
    ROOFTOP.x,
    ROOFTOP.h / 2,
    ROOFTOP.z,
  );
  box(ROOFTOP.w, 0.12, ROOFTOP.d, iron, ROOFTOP.x, ROOFTOP.h - 0.06, ROOFTOP.z);
  label(
    "TECHCRUSH / PLATINUM SKYBOX",
    32,
    2.6,
    ROOFTOP.x,
    8,
    ROOFTOP.z - ROOFTOP.d / 2 - 0.05,
    Math.PI,
  );
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
  const crate = new THREE.Group();
  crate.userData.dynamic = true;
  crate.position.set(QUEST_BOX.x, QUEST_BOX.y, QUEST_BOX.z);
  root.add(crate);
  const platinum = mat("#e6c9ff", {
    metalness: 0.8,
    emissive: "#9560bf",
    emissiveIntensity: 0.35,
  });
  box(3.4, 2.6, 3.4, platinum, 0, 1.4, 0, crate);
  for (const x of [-1.7, 1.7]) box(0.22, 2.8, 3.5, iron, x, 1.4, 0, crate);
  const beacon = add(
    new THREE.OctahedronGeometry(1.15),
    platinum,
    0,
    5.5,
    0,
    crate,
  );
  v.questCrate = { root: crate, beacon };
  // Crosswalks, cafe furniture and signs: fixed meshes, shared breakable contacts.
  for (const r of ROADS) {
    if (r.length < 42 || r.id % 4) continue;
    const t = 0.4,
      p = {
        x: r.start.x + (r.end.x - r.start.x) * t,
        z: r.start.z + (r.end.z - r.start.z) * t,
      };
    if (r.start.links.length >= 3 && !r.name.includes("Bridge"))
      for (let x = -r.width / 2 + 1; x < r.width / 2; x += 1.5) {
        const s = box(
          0.75,
          0.012,
          3.1,
          white,
          p.x + Math.cos(r.angle) * x,
          0.09,
          p.z - Math.sin(r.angle) * x,
        );
        s.rotation.y = r.angle;
      }
    const x = p.x + Math.cos(r.angle) * (r.width / 2 + 6),
      z = p.z - Math.sin(r.angle) * (r.width / 2 + 6);
    if (
      !roadClear({ x, z }, 2) ||
      BUILDINGS.some((b) => containsPoint(b, x, z, 2))
    )
      continue;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = r.angle;
    root.add(g);
    g.userData.dynamic = true;
    box(2.5, 0.15, 0.8, wood, 0, 0.6, 0, g);
    box(2.5, 0.7, 0.12, wood, 0, 1, -0.38, g);
    for (const dx of [-1, 1]) box(0.12, 0.6, 0.65, iron, dx, 0.3, 0, g);
    registerBreakable(v, g, x, z, 1.3);
  }
  batchStatic(root);
}
