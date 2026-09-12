import * as THREE from "./vendor/three.module.js";
import { surfaceGeometry } from "./road-surface.js";
import { ROAD_SURFACE } from "./road-surface-data.js";
import {
  BATUMI_SITES,
  LANDMARKS,
  RIVER_POLYGON,
  RIVER,
  inSea,
} from "./batumi-district-data.js";
import { batchStatic, facadeMaterial } from "./expansion-visuals.js";
import { roadClear } from "./road-clearance.js";
import { BUILDINGS, containsPoint } from "./city-map.js";
import { RAMPS } from "./stunts.js";
import { ROOFTOP, QUEST_BOX } from "./world-sites.js";
const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...extra });
export const batumiFacades = () =>
  [1, 2, 1, 3, 3].map((type, i) => {
    const m = facadeMaterial(type);
    m.userData.metricFacade = true;
    m.color.set(["#eee1c8", "#f1e5d1", "#ded8ca", "#c6e3ed", "#dde9ee"][i]);
    return m;
  });
export function buildBatumiCity(v) {
  const root = new THREE.Group();
  root.userData.environment = true;
  v.decor.add(root);
  const cream = mat("#ede6d3"),
    iron = mat("#465663", { metalness: 0.7 }),
    red = mat("#ef2148"),
    gold = mat("#dbb85f", { metalness: 0.8, roughness: 0.3 }),
    glass = facadeMaterial(3),
    white = mat("#d8ebef"),
    stone = mat("#bcc5b7");
  glass.userData.metricFacade = true;
  v.buildingMaterials.push(glass);
  v.districtMaterials = {
    stone,
    cream,
    grass: mat("#74935c"),
    ground: mat("#a5ac8e"),
  };
  const add = (geometry, m, x = 0, y = 0, z = 0, parent = root) => {
    const o = new THREE.Mesh(geometry, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const box = (w, h, d, m, x, y, z, parent = root) =>
    add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const cylinder = (r, h, m, x, y, z, parent = root) =>
    add(new THREE.CylinderGeometry(r, r, h, 16), m, x, y, z, parent);
  const beam = (a, b, r, m, parent = root) => {
    const p = new THREE.Vector3(...a),
      q = new THREE.Vector3(...b),
      o = add(
        new THREE.CylinderGeometry(r, r, p.distanceTo(q), 6),
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
    ctx.fillStyle = "#142333";
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = "#fff2c9";
    ctx.font = "bold 45px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, 512, 82, 990);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const o = add(
      new THREE.PlaneGeometry(w, h),
      mat("#ffffff", { map: t }),
      x,
      y,
      z,
      parent,
    );
    o.rotation.y = angle;
    return o;
  };
  add(
    surfaceGeometry(ROAD_SURFACE.ground, -0.28),
    v.districtMaterials.ground,
  ).castShadow = false;
  const sea = mat("#348c9c", { metalness: 0.3, roughness: 0.31 });
  v.waterMaterial = sea;
  v.waterTime = { value: 0 };
  sea.onBeforeCompile = (shader) => {
    shader.uniforms.seaTime = v.waterTime;
    shader.vertexShader = "uniform float seaTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntransformed.y+=sin(position.x*.045+seaTime*.7)*.06;",
    );
    shader.fragmentShader = "uniform float seaTime;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      "#include <color_fragment>\ndiffuseColor.rgb*=.94+.06*sin(vViewPosition.x*.8+seaTime)*sin(vViewPosition.z*.3+seaTime*.7);",
    );
  };
  add(surfaceGeometry([[RIVER_POLYGON]], -1.15), sea).castShadow = false;
  const garden = v.districtMaterials.grass;
  // Paved waterfront remains open; planted lawns occupy only dry, clear ground.
  for (let i = 1; i < RIVER.length; i++) {
    const a = RIVER[i - 1],
      b = RIVER[i],
      length = Math.hypot(b.x - a.x, b.z - a.z);
    if (!length) continue;
    const nx = (b.z - a.z) / length,
      nz = -(b.x - a.x) / length;
    for (let t = 0; t < length; t += 22)
      for (const width of [36, 62, 88]) {
        let x = a.x + ((b.x - a.x) * t) / length + nx * width,
          z = a.z + ((b.z - a.z) * t) / length + nz * width;
        if (inSea({ x, z })) {
          x = a.x + ((b.x - a.x) * t) / length - nx * width;
          z = a.z + ((b.z - a.z) * t) / length - nz * width;
        }
        if (
          Math.abs(x) > 3000 ||
          Math.abs(z) > 3000 ||
          inSea({ x, z }) ||
          !roadClear({ x, z }, 15) ||
          BUILDINGS.some((b) => containsPoint(b, x, z, 15))
        )
          continue;
        box(19, 0.04, 19, garden, x, -0.2, z);
      }
  }
  for (const s of BATUMI_SITES) {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.angle;
    root.add(g);
    if (s.style === "alphabet") {
      cylinder(11, 2, stone, 0, 1, 0, g);
      cylinder(5, 105, glass, 0, 54, 0, g);
      for (let side = 0; side < 2; side++)
        for (let i = 0; i < 64; i++) {
          const a = (i / 64) * Math.PI * 4 + side * Math.PI,
            b = ((i + 1) / 64) * Math.PI * 4 + side * Math.PI;
          beam(
            [Math.cos(a) * 9, 6 + i * 1.5, Math.sin(a) * 9],
            [Math.cos(b) * 9, 6 + (i + 1) * 1.5, Math.sin(b) * 9],
            0.6,
            white,
            g,
          );
        }
      const globe = add(
        new THREE.SphereGeometry(11, 24, 16),
        glass,
        0,
        118,
        0,
        g,
      );
      globe.scale.y = 1.08;
      cylinder(10.8, 1, gold, 0, 118, 0, g);
      cylinder(3, 8, iron, 0, 129, 0, g);
      const letters = "აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ";
      for (let i = 0; i < 33; i++) {
        const a = (i / 33) * Math.PI * 4;
        label(
          letters[i],
          2.7,
          3,
          Math.cos(a) * 9.7,
          9 + i * 2.8,
          Math.sin(a) * 9.7,
          Math.PI / 2 - a,
          g,
        );
      }
    } else if (s.style === "ali") {
      box(14, 1, 8, stone, 0, 0.5, 0, g);
      v.batumiFigures = [];
      for (const side of [-1, 1]) {
        const person = new THREE.Group();
        person.userData.dynamic = true;
        person.position.set(side * 3, 1, 0);
        g.add(person);
        v.batumiFigures.push({ group: person, side });
        for (let i = 0; i < 27; i++) {
          const y = 0.14 + i * 0.25;
          const r =
            y < 3
              ? 1.15
              : y < 5
                ? 1.25 + (y - 3) * 0.28
                : y < 5.7
                  ? 1.35
                  : 0.63;
          const disc = add(
            new THREE.CylinderGeometry(r, r, 0.14, 20),
            white,
            0,
            y,
            0,
            person,
          );
          disc.scale.z = 0.5;
        }
      }
    } else if (s.style === "wheel") {
      cylinder(2.5, 8, stone, 0, 4, 0, g);
      beam([0, 0, 0], [0, 29, 0], 1.2, white, g);
      const wheel = new THREE.Group();
      wheel.userData.dynamic = true;
      wheel.position.y = 29;
      g.add(wheel);
      v.batumiWheel = wheel;
      add(new THREE.TorusGeometry(25, 0.4, 6, 64), white, 0, 0, 0, wheel);
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI) / 12;
        beam(
          [0, 0, 0],
          [Math.cos(a) * 25, Math.sin(a) * 25, 0],
          0.14,
          white,
          wheel,
        );
        box(
          2.1,
          2.6,
          2.1,
          i % 2 ? red : gold,
          Math.cos(a) * 25,
          Math.sin(a) * 25,
          0,
          wheel,
        );
      }
    } else if (["lighthouse", "chacha", "medea", "piazza"].includes(s.style)) {
      const w = s.style === "medea" ? 4 : s.w * 0.65;
      box(s.w, 1.2, s.d, stone, 0, 0.6, 0, g);
      box(w, s.h * 0.77, w, cream, 0, s.h * 0.385, 0, g);
      for (const y of [0.28, 0.56, 0.77])
        box(w + 1, 0.6, w + 1, gold, 0, s.h * y, 0, g);
      if (s.style === "medea") {
        cylinder(0.8, 4, gold, 0, 19, 0, g);
        add(new THREE.SphereGeometry(0.85, 10, 8), gold, 0, 21.6, 0, g);
        beam([0.6, 20, 0], [2.7, 22, 0], 0.22, gold, g);
        add(new THREE.TorusGeometry(0.8, 0.2, 6, 14), gold, 2.8, 22, 0, g);
      } else {
        box(w * 0.7, s.h * 0.18, w * 0.7, glass, 0, s.h * 0.86, 0, g);
        add(
          new THREE.ConeGeometry(w * 0.7, s.h * 0.1, 4),
          gold,
          0,
          s.h * 0.95,
          0,
          g,
        );
      }
    } else if (s.style === "fountain") {
      box(s.w, 1.4, s.d, stone, 0, 0.7, 0, g);
      box(s.w - 3, 0.15, s.d - 3, sea, 0, 1.45, 0, g);
      for (let i = -3; i <= 3; i++)
        cylinder(0.18, 2.4 + (3 - Math.abs(i)) * 0.7, white, i * 4, 2.4, 0, g);
    } else if (s.style === "twins") {
      for (const side of [-1, 1]) {
        box(26, s.h, 38, glass, side * 24, s.h / 2, 0, g);
        for (let y = 4; y < s.h; y += 5)
          box(26.1, 0.5, 38.1, white, side * 24, y, 0, g);
      }
    } else {
      box(s.w, s.h, s.d, glass, 0, s.h / 2, 0, g);
      for (const side of [-1, 1])
        box(1.4, s.h, s.d + 0.4, cream, side * (s.w / 2 - 0.7), s.h / 2, 0, g);
      if (s.style === "sheraton") {
        box(s.w + 2, 3, s.d + 2, cream, 0, s.h - 1, 0, g);
        add(new THREE.ConeGeometry(12, 24, 4), cream, 0, s.h + 12, 0, g);
        cylinder(0.6, 12, gold, 0, s.h + 29, 0, g);
      }
      if (s.style === "tower") {
        const disc = add(
          new THREE.TorusGeometry(11, 1, 8, 24),
          gold,
          s.w / 2,
          105,
          s.d / 2 + 0.7,
          g,
        );
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          box(
            2.4,
            2.4,
            2.4,
            gold,
            s.w / 2 + Math.cos(a) * 11,
            105 + Math.sin(a) * 11,
            s.d / 2 + 1,
            g,
          );
        }
      }
    }
    if (s.style !== "alphabet")
      label(s.name, Math.min(28, s.w + 8), 1.7, 0, 3, s.d / 2 + 0.12, 0, g);
  }
  // Airport is a distant skyline detail, not a disconnected drivable runway.
  const a = LANDMARKS.airport,
    airport = new THREE.Group();
  airport.position.set(a.x, 0, a.z);
  airport.rotation.y = -0.55;
  root.add(airport);
  box(48, 0.08, 720, iron, 0, 0, 0, airport);
  for (let z = -340; z < 360; z += 35)
    box(1, 0.02, 18, cream, 0, 0.06, z, airport);
  box(72, 12, 34, glass, -87, 6, 30, airport);
  box(10, 28, 10, cream, -130, 14, 10, airport);
  box(18, 6, 18, glass, -130, 31, 10, airport);
  label("BATUMI INTERNATIONAL AIRPORT", 70, 4, -80, 15, 48, 0, airport);
  const plane = new THREE.Group();
  plane.position.set(0, 3, 120);
  airport.add(plane);
  const body = cylinder(2.2, 31, white, 0, 0, 0, plane);
  body.rotation.x = Math.PI / 2;
  box(32, 0.55, 6, white, 0, 0, 0, plane);
  box(0.5, 7, 7, red, 0, 3, -12, plane);
  buildBatumiStunts(v, root, { add, box, label, iron, cream, red });
  batchStatic(root);
}

function buildBatumiStunts(v, root, { add, box, label, iron, cream, red }) {
  box(
    ROOFTOP.w,
    ROOFTOP.h,
    ROOFTOP.d,
    v.expansionFacades[1],
    ROOFTOP.x,
    ROOFTOP.h / 2,
    ROOFTOP.z,
  );
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
    const shape = new THREE.Shape();
    shape.moveTo(-r.length / 2, 0);
    shape.lineTo(r.length / 2, 0);
    shape.lineTo(r.length / 2, r.height);
    shape.closePath();
    const slope = add(
      new THREE.ExtrudeGeometry(shape, { depth: r.width, bevelEnabled: false }),
      iron,
      r.width / 2,
      0,
      0,
      g,
    );
    slope.rotation.y = -Math.PI / 2;
    for (let z = -r.length / 2 + 0.5; z < r.length / 2; z += 1.6) {
      const stripe = box(
        r.width,
        0.04,
        0.27,
        red,
        0,
        (z / r.length + 0.5) * r.height + 0.04,
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
}
