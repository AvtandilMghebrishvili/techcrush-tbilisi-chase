import { buildExpansion } from "./expansion-visuals.js";
import { moundHeight } from "./terrain.js";
import { buildBridgeRails } from "./bridge-visuals.js";
import * as THREE from "./vendor/three.module.js";
import { registerBreakable } from "./breakable-props.js";
import { BRIDGE_DECKS, BRIDGE_BARRIERS } from "./bridge-data.js";
import { RETAINING_WALLS } from "./district-data.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  LANDMARKS as L,
  RIVER,
  RIVER_BANKS,
  RIVER_POLYGON,
  riverDistance,
} from "./district-data.js";
import { ROADS, NODES, BUILDINGS, nearestRoad } from "./city-map.js";
import { ROAD_SURFACE } from "./road-surface-data.js";
import { surfaceGeometry } from "./road-surface.js";
import { RAMPS } from "./stunts.js";
import { addFlag } from "./scenery.js";
const material = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...extra });
export function terrainMound(parent, p, rx, rz, height, mat) {
  const geo = new THREE.PlaneGeometry(rx * 2, rz * 2, 52, 40);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position,
    colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i),
      r = Math.hypot(x / rx, z / rz);
    pos.setY(i, moundHeight(p.x + x, p.z + z, { ...p, rx, rz, height }));
    const c = new THREE.Color("#ffffff").multiplyScalar(
      0.9 + 0.1 * Math.sin(x * 0.13 + z * 0.19),
    );
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(p.x, 0, p.z);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
export function buildTbilisiDistricts(v) {
  const root = new THREE.Group();
  root.userData.environment = true;
  v.decor.add(root);
  const stone = material("#c7bda5"),
    cream = material("#e1d8c1"),
    brick = material("#9a6349"),
    metal = material("#434f50", { metalness: 0.6 }),
    silver = material("#aebec5", { metalness: 0.72, roughness: 0.41 }),
    glass = material("#7aafbd", {
      metalness: 0.4,
      roughness: 0.18,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
    grass = material("#718647"),
    hedge = material("#425d30"),
    wood = material("#6d4b35"),
    white = material("#eee8d4"),
    red = material("#9d5350");
  v.districtMaterials = { grass, stone, brick, cream };
  const lawn = document.createElement("canvas");
  lawn.width = lawn.height = 512;
  const lc = lawn.getContext("2d");
  lc.fillStyle = "#798856";
  lc.fillRect(0, 0, 512, 512);
  let seed = 1763;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 24000; i++) {
    const x = random() * 512,
      y = random() * 512,
      n = random();
    lc.strokeStyle = `rgba(${72 + n * 40},${89 + n * 45},${40 + n * 30},.4)`;
    lc.lineWidth = 0.7;
    lc.beginPath();
    lc.moveTo(x, y);
    lc.lineTo(x - 1 + random() * 2, y - 1 - random() * 3);
    lc.stroke();
  }
  const lawnTexture = new THREE.CanvasTexture(lawn);
  lawnTexture.colorSpace = THREE.SRGBColorSpace;
  lawnTexture.wrapS = lawnTexture.wrapT = THREE.RepeatWrapping;
  lawnTexture.anisotropy = 4;
  grass.map = lawnTexture;
  grass.bumpMap = lawnTexture;
  grass.bumpScale = 0.035;
  grass.color.set("#c1cda9");
  // Meter-scaled masonry and paving joints continue across separate meshes.
  for (const [mat, columns, rows, base] of [
    [brick, 8, 14, [156, 107, 82]],
    [stone, 4, 6, [186, 179, 157]],
    [cream, 5, 5, [198, 193, 176]],
  ]) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#777668";
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < rows; y++)
      for (let x = -1; x <= columns; x++) {
        const n = (((x + 8) * 17 + y * 31) % 17) - 8;
        ctx.fillStyle = `rgb(${base[0] + n},${base[1] + n},${base[2] + n})`;
        ctx.fillRect(
          ((x + (y % 2) * 0.5) * 256) / columns + 1,
          (y * 256) / rows + 1,
          256 / columns - 2,
          256 / rows - 2,
        );
      }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    mat.map = t;
    mat.bumpMap = t;
    mat.bumpScale = 0.045;
    mat.color.set("#ffffff");
  }
  const add = (geometry, mat, x = 0, y = 0, z = 0, parent = root) => {
    const m = new THREE.Mesh(geometry, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const box = (w, h, d, m, x, y, z, parent = root) =>
    add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const orb = (rx, ry, rz, m, x, y, z, parent = root) => {
    const s = add(new THREE.SphereGeometry(1, 12, 8), m, x, y, z, parent);
    s.scale.set(rx, ry, rz);
    return s;
  };
  const beam = (a, b, r, m, parent = root) => {
    a = new THREE.Vector3(...a);
    b = new THREE.Vector3(...b);
    const mesh = add(
      new THREE.CylinderGeometry(r, r, a.distanceTo(b), 7),
      m,
      0,
      0,
      0,
      parent,
    );
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.sub(a).normalize(),
    );
    return mesh;
  };
  const label = (
    text,
    w,
    h,
    x,
    y,
    z,
    angle = 0,
    color = "#174644",
    parent = root,
  ) => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 192;
    const g = c.getContext("2d");
    g.fillStyle = color;
    g.fillRect(0, 0, 1024, 192);
    g.strokeStyle = "#e0e6d4";
    g.lineWidth = 4;
    g.strokeRect(8, 8, 1008, 176);
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.font = "bold 65px Arial";
    g.fillText(text, 512, 117, 975);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const mat = material("#fff", { map: t });
    for (const side of [0, Math.PI]) {
      const m = add(new THREE.PlaneGeometry(w, h), mat, x, y, z, parent);
      m.rotation.y = angle + side;
      m.position.x += Math.sin(angle + side) * 0.025;
      m.position.z += Math.cos(angle + side) * 0.025;
    }
  };
  const path = (points, width, m = cream, y = 0.035) => {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        d = Math.hypot(b.x - a.x, b.z - a.z);
      const s = box(width, 0.045, d, m, (a.x + b.x) / 2, y, (a.z + b.z) / 2);
      s.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    }
  };
  const dryPark = (p) => {
    for (let i = 1; i < RIVER.length; i++) {
      const a = RIVER[i - 1],
        b = RIVER[i];
      if (p.z <= a.z && p.z >= b.z) {
        const x = a.x + ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z);
        return { ...p, x: Math.min(p.x, x - 54) };
      }
    }
    return p;
  };
  const ellipse = (p, rx, rz, m, y = 0.025) => {
    if (p === L.rike) {
      const ring = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2,
          q = dryPark({ x: p.x + Math.cos(a) * rx, z: p.z + Math.sin(a) * rz });
        ring.push([q.x, q.z]);
      }
      return add(surfaceGeometry([[ring]], y), m);
    }
    const q = add(new THREE.CircleGeometry(1, 64), m, p.x, y, p.z);
    q.rotation.x = -Math.PI / 2;
    q.scale.set(rx, rz, 1);
    q.receiveShadow = true;
    return q;
  };
  const ground = add(
    surfaceGeometry(ROAD_SURFACE.ground, -0.28),
    material("#8a8974"),
  );
  ground.castShadow = false;
  v.districtMaterials.ground = ground.material;
  // Mtkvari below the city datum, with continuous masonry banks and animated ripples.
  const waterMaterial = material("#496f66", {
    metalness: 0.55,
    roughness: 0.24,
  });
  const waterTime = { value: 0 };
  waterMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.riverTime = waterTime;
    shader.vertexShader = "uniform float riverTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntransformed.y+=sin(position.x*.11+riverTime)*.075+cos(position.z*.13+riverTime*.6)*.06;",
    );
  };
  const water = add(surfaceGeometry([[RIVER_POLYGON]], -6.4), waterMaterial);
  water.castShadow = false;
  water.userData.dynamic = true;
  v.waterTime = waterTime;
  for (const bank of RIVER_BANKS) {
    for (let i = 1; i < bank.length; i++) {
      const a = bank[i - 1],
        b = bank[i],
        length = Math.hypot(b[0] - a[0], b[1] - a[1]),
        angle = Math.atan2(b[0] - a[0], b[1] - a[1]);
      const wall = box(
        2.1,
        6,
        length,
        stone,
        (a[0] + b[0]) / 2,
        -3,
        (a[1] + b[1]) / 2,
      );
      wall.rotation.y = angle;
      const cap = box(
        2.6,
        0.28,
        length,
        cream,
        (a[0] + b[0]) / 2,
        0.12,
        (a[1] + b[1]) / 2,
      );
      cap.rotation.y = angle;
      for (let d = 4; d < length; d += 11) {
        const t = d / length;
        box(
          0.24,
          5.8,
          0.35,
          brick,
          a[0] + (b[0] - a[0]) * t,
          -3,
          a[1] + (b[1] - a[1]) * t,
        );
      }
    }
  }
  // Baratashvili is a broad driving deck, with proper sidewalk edges and bridge railings.
  const bridges = BRIDGE_DECKS.map((b) => [
    b.name,
    b,
    b.angle,
    b.length,
    b.width,
  ]);
  for (const [name, p, angle, length, width] of bridges) {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = angle;
    root.add(g);
    box(width, 1.2, length, stone, 0, -0.65, 0, g);
    for (const side of [-1, 1]) {
      box(2.8, 0.25, length, cream, side * (width / 2 - 1.4), 0.2, 0, g);
      for (let z = -length / 2 + 8; z < length / 2; z += 25) {
        const localX = side * (width / 2 - 1),
          lamp = new THREE.Group();
        const wx = p.x + Math.cos(angle) * localX + Math.sin(angle) * z;
        const wz = p.z - Math.sin(angle) * localX + Math.cos(angle) * z;
        lamp.position.set(wx, 0, wz);
        lamp.rotation.y = angle;
        root.add(lamp);
        const prop = registerBreakable(v, lamp, wx, wz, 8.7);
        beam([0, 0.3, 0], [0, 8, 0], 0.09, metal, lamp);
        beam([0, 8, 0], [-side * 3, 8.7, 0], 0.08, metal, lamp);
        const head = box(
          1.25,
          0.16,
          0.5,
          v.streetLampMaterials[0],
          -side * 3,
          8.65,
          0,
          lamp,
        );
        v.streetLamps.push({ head, propId: prop.definition.id });
      }
    }
    for (const z of [-length * 0.28, length * 0.28])
      box(width * 0.7, 5.5, 4, stone, 0, -3.7, z, g);
    label(
      name,
      14,
      1.4,
      p.x + Math.cos(angle) * (width / 2 + 2),
      3.8,
      p.z - Math.sin(angle) * (width / 2 + 2),
      angle - Math.PI / 2,
    );
  }
  // Peace Bridge: an open pedestrian deck under a glass wave and diagonal white lattice.
  {
    const p = L.peace,
      g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = 0.12;
    root.add(g);
    box(150, 0.5, 8, cream, 0, -0.24, 0, g);
    const canopy = (u, t) => {
      const x = (u - 0.5) * 126,
        z = t * (6 + 4 * Math.sin(u * Math.PI) ** 2),
        y = 5 + 9 * Math.sin(u * Math.PI) ** 0.8 + (1 - t * t) * 2.8;
      return new THREE.Vector3(x, y, z);
    };
    const pos = [],
      uv = [],
      idx = [];
    for (let i = 0; i <= 36; i++)
      for (let j = 0; j <= 12; j++) {
        const p = canopy(i / 36, j / 6 - 1);
        pos.push(...p);
        uv.push(i / 36, j / 12);
      }
    for (let i = 0; i < 36; i++)
      for (let j = 0; j < 12; j++) {
        const n = i * 13 + j;
        idx.push(n, n + 13, n + 1, n + 1, n + 13, n + 14);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    add(geo, glass, 0, 0, 0, g);
    for (let i = 0; i < 36; i++)
      for (let j = 0; j < 12; j += 2) {
        beam(
          canopy(i / 36, j / 6 - 1).toArray(),
          canopy((i + 1) / 36, (j + 2) / 6 - 1).toArray(),
          0.085,
          white,
          g,
        );
        beam(
          canopy(i / 36, (j + 2) / 6 - 1).toArray(),
          canopy((i + 1) / 36, j / 6 - 1).toArray(),
          0.085,
          white,
          g,
        );
      }
    for (const x of [-42, 42])
      for (const z of [-4, 4])
        beam([x, 0, z], [x * 0.86, 12, z * 1.8], 0.35, white, g);
  }
  buildBridgeRails(v, stone, metal);
  // Rike's lawns, pale paths, red paving panels, fountain and amphitheatre.
  const park = L.rike;
  ellipse(park, 120, 235, grass, -0.01);
  path(
    [
      { x: park.x + 90, z: park.z + 205 },
      { x: park.x + 55, z: park.z + 90 },
      { x: park.x + 22, z: park.z },
      { x: park.x - 18, z: park.z - 130 },
      { x: park.x - 55, z: park.z - 225 },
    ].map(dryPark),
    9,
  );
  for (let i = 0; i < 6; i++) {
    const z = park.z - 180 + i * 65;
    path(
      [
        { x: park.x + 97, z },
        { x: park.x + 20, z: z + 25 },
        { x: park.x - 80, z: z + 5 },
      ].map(dryPark),
      5,
    );
    const p = dryPark({ x: park.x + 50, z });
    box(22, 0.035, 17, red, p.x - 12, 0.022, z);
  }
  const fountain = { x: park.x - 26, z: park.z - 52 };
  add(
    new THREE.CylinderGeometry(14, 14, 0.65, 48),
    stone,
    fountain.x,
    0.25,
    fountain.z,
  );
  ellipse(fountain, 12, 12, glass, 0.7);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    beam(
      [fountain.x + Math.cos(a) * 6, 0.8, fountain.z + Math.sin(a) * 6],
      [fountain.x + Math.cos(a) * 4, 3.4, fountain.z + Math.sin(a) * 4],
      0.045,
      glass,
    );
  }
  for (let row = 0; row < 5; row++)
    for (let j = 0; j < 18; j++) {
      const a = (j / 17) * Math.PI;
      const x = park.x + Math.cos(a) * (18 + row * 1.8),
        z = park.z + 95 + Math.sin(a) * (18 + row * 1.8);
      const seat = box(3.7, 0.5, 1.5, cream, x, 0.3 + row * 0.48, z);
      seat.rotation.y = -a;
    }
  for (let x = 0; x < 8; x++)
    for (let z = 0; z < 8; z++)
      box(
        1.6,
        0.045,
        1.6,
        (x + z) % 2 ? metal : white,
        park.x - 75 + x * 1.6,
        0.04,
        park.z + 70 + z * 1.6,
      );
  // Twin splayed steel shells with glazed oval mouths and a panel lattice.
  for (const sign of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(L.tubes.x - 13, 0, L.tubes.z + sign * 26);
    g.rotation.y = sign * 0.32;
    root.add(g);
    const point = (u, a, offset = 0) => {
      const radius = 12 + 7 * Math.cos(u * Math.PI) ** 2 + offset;
      return [
        48 - u * 99,
        18 + u * 4 + Math.sin(a) * (radius * 0.81),
        Math.cos(a) * radius,
      ];
    };
    const positions = [],
      uv = [],
      indices = [];
    for (let i = 0; i <= 30; i++)
      for (let j = 0; j <= 40; j++) {
        positions.push(...point(i / 30, (j / 40) * Math.PI * 2));
        uv.push(i / 30, j / 40);
      }
    for (let i = 0; i < 30; i++)
      for (let j = 0; j < 40; j++) {
        const n = i * 41 + j;
        indices.push(n, n + 1, n + 41, n + 1, n + 42, n + 41);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    add(geo, silver, 0, 0, 0, g);
    const seams = [];
    for (let i = 0; i < 30; i++)
      for (let j = 0; j < 40; j += 2)
        for (const direction of [-1, 1])
          for (let k = 0; k < 4; k++) {
            const sample = (t) =>
              point(
                (i + t) / 30,
                ((j + (direction === 1 ? t : 1 - t) * 2) / 40) * Math.PI * 2,
                0.12,
              );
            seams.push(...sample(k / 4), ...sample((k + 1) / 4));
          }
    const lattice = new THREE.BufferGeometry();
    lattice.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(seams, 3),
    );
    g.add(
      new THREE.LineSegments(
        lattice,
        new THREE.LineBasicMaterial({
          color: "#63767e",
          transparent: true,
          opacity: 0.7,
        }),
      ),
    );
    const mouth = add(new THREE.CircleGeometry(1, 48), glass, 48.05, 18, 0, g);
    mouth.rotation.y = Math.PI / 2;
    mouth.scale.set(19, 15.4, 1);
    for (let z = -15; z <= 15; z += 3)
      beam([48.15, 6, z], [48.15, 28, z], 0.07, silver, g);
    box(22, 0.6, 9, cream, 59, 1.8, 0, g).rotation.z = -0.15;
    orb(8, 16, 20, silver, -51, 22, 0, g);
  }
  // Retaining arcade behind the park follows the rising east-bank road.
  for (const wall of RETAINING_WALLS) {
    const z = wall.z;
    box(3, 8, 18, stone, wall.x, 4, z);
    const arch = add(
      new THREE.TorusGeometry(5, 0.6, 6, 16, Math.PI),
      brick,
      park.x - 130.4,
      4,
      z,
    );
    arch.rotation.y = Math.PI / 2;
  }
  // Europe's oval island and floral clock, surrounded by Georgian and EU flags.
  const e = L.europe;
  ellipse(e, 32.5, 64, grass, 0.02);
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2;
    orb(
      3.8,
      1.05,
      3.4,
      hedge,
      e.x + Math.sin(a) * 26,
      0.95,
      e.z + Math.cos(a) * 53,
    );
  }
  const flower = material("#ca6472");
  for (let i = 0; i < 20; i++) {
    const a = i * 0.8;
    orb(
      1.9,
      0.25,
      1.4,
      flower,
      e.x + Math.sin(a) * 18,
      0.25,
      e.z + Math.cos(a) * 35,
    );
  }
  const clock = { x: e.x, z: e.z + 39 };
  ellipse(clock, 12, 12, stone, 0.16);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const m = box(
      0.7,
      0.16,
      5,
      hedge,
      clock.x + Math.sin(a) * 7,
      0.3,
      clock.z + Math.cos(a) * 7,
    );
    m.rotation.y = a;
  }
  beam([clock.x, 0.55, clock.z], [clock.x + 7, 0.55, clock.z + 3], 0.15, white);
  beam([clock.x, 0.55, clock.z], [clock.x - 3, 0.55, clock.z + 8], 0.13, white);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6,
      x = e.x + Math.sin(a) * 35,
      z = e.z + Math.cos(a) * 66;
    addFlag(v, x, z, 8, 0.5);
    if (i % 2) {
      const f = v.flags.at(-1),
        c = document.createElement("canvas");
      c.width = 384;
      c.height = 256;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#163a9e";
      ctx.fillRect(0, 0, 384, 256);
      ctx.fillStyle = "#ffde48";
      ctx.font = "24px Arial";
      ctx.textAlign = "center";
      for (let j = 0; j < 12; j++) {
        const b = (j * Math.PI) / 6;
        ctx.fillText("★", 192 + Math.sin(b) * 65, 136 + Math.cos(b) * 65);
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      f.material.map = t;
      f.material.emissiveMap = t;
    }
  }
  label(
    "ევროპის მოედანი · EUROPE SQUARE",
    15,
    1.8,
    e.x - 53,
    3.2,
    e.z - 62,
    0.9,
  );
  // Brick bath domes, circular roof lights and Chreli Abano's blue arched facade.
  const b = L.baths;
  for (const [dx, dz, r] of [
    [-22, -12, 7],
    [-5, -15, 6],
    [13, -14, 7],
    [-22, 9, 6],
    [-5, 10, 7],
    [14, 10, 6],
    [31, -3, 5],
  ]) {
    box(r * 2, 2.2, r * 2, brick, b.x + dx, 1.1, b.z + dz);
    const dome = add(
      new THREE.SphereGeometry(r, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      brick,
      b.x + dx,
      2.2,
      b.z + dz,
    );
    dome.scale.y = 0.6;
    add(
      new THREE.CylinderGeometry(0.9, 1.2, 0.7, 12),
      cream,
      b.x + dx,
      2.2 + r * 0.6,
      b.z + dz,
    );
    add(
      new THREE.SphereGeometry(0.84, 12, 8),
      glass,
      b.x + dx,
      2.6 + r * 0.6,
      b.z + dz,
    );
    for (let ring = 1; ring <= 4; ring++) {
      const y = ((ring / 5) * Math.PI) / 2;
      const tor = add(
        new THREE.TorusGeometry(r * Math.cos(y), 0.035, 4, 32),
        stone,
        b.x + dx,
        2.2 + r * Math.sin(y) * 0.6,
        b.z + dz,
      );
      tor.rotation.x = Math.PI / 2;
    }
  }
  const blue = material("#2c717e"),
    deep = material("#184657");
  const tile = document.createElement("canvas");
  tile.width = tile.height = 256;
  const tc = tile.getContext("2d");
  tc.fillStyle = "#227384";
  tc.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 8; x++)
    for (let y = 0; y < 8; y++) {
      tc.save();
      tc.translate(x * 32 + 16, y * 32 + 16);
      tc.rotate(Math.PI / 4);
      tc.strokeStyle = (x + y) % 2 ? "#dad5b5" : "#79b8bc";
      tc.lineWidth = 2;
      tc.strokeRect(-9, -9, 18, 18);
      tc.fillStyle = "#163f59";
      tc.fillRect(-3, -3, 6, 6);
      tc.restore();
    }
  const mosaic = new THREE.CanvasTexture(tile);
  mosaic.colorSpace = THREE.SRGBColorSpace;
  mosaic.wrapS = mosaic.wrapT = THREE.RepeatWrapping;
  mosaic.repeat.set(2, 2);
  blue.map = mosaic;
  blue.color.set("#ffffff");
  box(27, 13, 5, blue, b.x - 5, 6.5, b.z + 35);
  box(28, 0.65, 6, cream, b.x - 5, 13.1, b.z + 35);
  box(11, 18, 5.15, blue, b.x - 5, 9, b.z + 35);
  box(11.7, 0.55, 5.5, cream, b.x - 5, 18.1, b.z + 35);
  const archShape = new THREE.Shape();
  archShape.moveTo(-3.9, 0);
  archShape.lineTo(3.9, 0);
  archShape.lineTo(3.9, 8.7);
  archShape.quadraticCurveTo(3.9, 12.2, 0, 15.2);
  archShape.quadraticCurveTo(-3.9, 12.2, -3.9, 8.7);
  archShape.closePath();
  add(new THREE.ShapeGeometry(archShape), deep, b.x - 5, 0.6, b.z + 37.68);
  for (const x of [-15, -5, 5]) {
    box(5, 7, 0.4, deep, b.x + x, 5, b.z + 37.6);
    const arch = add(
      new THREE.TorusGeometry(2.5, 0.3, 7, 18, Math.PI),
      cream,
      b.x + x,
      8.5,
      b.z + 37.9,
    );
    for (let y = 1; y < 12; y += 1.2)
      for (const side of [-1, 1])
        box(0.32, 0.65, 0.12, white, b.x + x + side * 3.1, y, b.z + 37.8);
  }
  for (let x = -17; x <= 7; x += 2)
    for (let y = 2; y <= 12; y += 2) {
      const m = box(0.65, 0.65, 0.11, cream, b.x + x, y, b.z + 37.7);
      m.rotation.z = Math.PI / 4;
    }
  label(
    "ჭრელი აბანო · CHRELI ABANO",
    16,
    1.3,
    b.x - 5,
    17,
    b.z + 38,
    0,
    "#165367",
  );
  // Metekhi's cliff-top church gives the square its southern silhouette.
  const m = L.metekhi;
  terrainMound(root, m, 54, 48, 25, stone);
  box(20, 22, 29, stone, m.x, 29, m.z);
  box(25, 2, 32, brick, m.x, 41, m.z);
  add(new THREE.CylinderGeometry(5, 6, 11, 12), cream, m.x, 47, m.z);
  add(new THREE.ConeGeometry(8, 10, 12), brick, m.x, 57, m.z);
  beam([m.x, 60, m.z], [m.x, 66, m.z], 0.17, metal);
  beam([m.x - 1.7, 64, m.z], [m.x + 1.7, 64, m.z], 0.17, metal);
  for (const side of [-1, 1])
    for (const dz of [-7, 5]) {
      box(0.2, 8, 2, deep, m.x + side * 10.1, 30, m.z + dz);
    }
  // Narikala walls, turrets and warm stone over the old-town ridge.
  const n = L.narikala;
  const hillMaterial = material("#8d9276", { vertexColors: true });
  v.localHillMaterials = [...(v.localHillMaterials || []), hillMaterial];
  terrainMound(root, n, 155, 115, 65, hillMaterial);
  for (let i = 0; i < 9; i++) {
    const x = n.x - 95 + i * 24,
      z = n.z + Math.sin(i * 0.65) * 20;
    box(25, 13, 5, stone, x, 62, z);
    for (let j = 0; j < 5; j++) box(2.5, 3, 5, stone, x - 10 + j * 5, 70, z);
    if (i % 3 === 0) {
      add(new THREE.CylinderGeometry(7, 9, 21, 12), stone, x, 64, z);
      for (let j = 0; j < 8; j++) {
        const a = (j * Math.PI) / 4;
        box(2, 2.5, 2, stone, x + Math.cos(a) * 6, 75, z + Math.sin(a) * 6);
      }
    }
  }
  // Moving cable-car cabins above the river, from Rike toward the fortress.
  const start = { x: L.cable.x, y: 14, z: L.cable.z },
    end = { x: n.x - 65, y: 94, z: n.z + 5 };
  for (const side of [-1, 1])
    beam(
      [start.x + side * 2, start.y, start.z],
      [end.x + side * 2, end.y, end.z],
      0.075,
      metal,
    );
  box(23, 7, 13, silver, start.x, 3.5, start.z);
  box(23, 0.3, 10, glass, start.x, 7.2, start.z);
  v.gondolas = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    root.add(g);
    box(3, 2.7, 2.4, red, 0, 0, 0, g);
    box(3.08, 1.5, 2.45, glass, 0, 0.3, 0, g);
    beam([0, 1.5, 0], [0, 5, 0], 0.09, metal, g);
    g.userData.dynamic = true;
    v.gondolas.push({ group: g, start, end, offset: i / 4 });
  }
  // Functional stunt ramps, steel side edges and hazard markings.
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
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: r.width,
      bevelEnabled: false,
    });
    const ramp = add(geo, metal, 0, 0, 0, g);
    ramp.rotation.y = -Math.PI / 2;
    ramp.position.x = r.width / 2;
    const hazard = material("#eac851");
    for (let z = -r.length / 2 + 0.5; z < r.length / 2; z += 1) {
      const h = (z / r.length + 0.5) * r.height + 0.035;
      const stripe = box(
        r.width,
        0.04,
        0.23,
        Math.floor(z) % 2 ? white : hazard,
        0,
        h,
        z,
        g,
      );
      stripe.rotation.x = -Math.atan(r.height / r.length);
    }
    label(
      r.id >= 4 ? r.name : "TECHCRUSH · JUMP",
      8,
      1,
      r.x + Math.cos(r.angle) * 4,
      3.5,
      r.z - Math.sin(r.angle) * 4,
      r.angle,
    );
  }
  // Walkable-street detail: crossings, stop bars, furniture, awnings and paving.
  const seen = [];
  for (const r of ROADS) {
    const fx = Math.sin(r.angle),
      fz = Math.cos(r.angle),
      rx = fz,
      rz = -fx;
    if (
      r.length > 34 &&
      r.start.links.length >= 3 &&
      !r.name.includes("Bridge")
    ) {
      const d =
        Math.max(...r.start.links.map((l) => ROADS[l.road].width)) / 2 + 4;
      if (
        d < r.length - 10 &&
        !seen.some((p) => Math.hypot(p.x - r.start.x, p.z - r.start.z) < 20)
      ) {
        seen.push(r.start);
        for (let x = -r.width / 2 + 1; x < r.width / 2; x += 1.4) {
          const stripe = box(
            0.72,
            0.012,
            3.5,
            white,
            r.start.x + fx * d + rx * x,
            0.089,
            r.start.z + fz * d + rz * x,
          );
          stripe.rotation.y = r.angle;
        }
        const bar = box(
          r.width / 2 - 1,
          0.012,
          0.3,
          white,
          r.start.x + fx * (d + 5) + (rx * r.width) / 4,
          0.09,
          r.start.z + fz * (d + 5) + (rz * r.width) / 4,
        );
        bar.rotation.y = r.angle;
      }
    }
    if (r.length < 48) continue;
    for (let t = 27; t < r.length - 15; t += 75) {
      const side = r.id % 2 ? 1 : -1,
        x = r.start.x + fx * t + rx * (r.width / 2 + 2.2) * side,
        z = r.start.z + fz * t + rz * (r.width / 2 + 2.2) * side;
      const nr = nearestRoad({ x, z });
      if (nr.distance < nr.road.width / 2 + 1 || riverDistance({ x, z }) < 48)
        continue;
      const g = new THREE.Group();
      g.position.set(x, 0.2, z);
      g.rotation.y = r.angle;
      root.add(g);
      for (const px of [-1, 0, 1])
        registerBreakable(v, g, x + rx * px, z + rz * px, 1.4, 0.45, "wood");
      for (const px of [-1.1, 1.1]) {
        box(0.11, 0.6, 0.8, metal, px, 0.3, 0, g);
        box(0.09, 1, 0.1, metal, px, 0.6, -0.32, g);
      }
      for (let j = 0; j < 4; j++)
        box(2.7, 0.07, 0.14, wood, 0, 0.62, -0.3 + j * 0.19, g);
      for (let j = 0; j < 3; j++)
        box(2.7, 0.13, 0.06, wood, 0, 0.9 + j * 0.17, -0.34, g);
      const propAt = (offset) => {
        const p = new THREE.Group();
        p.position.set(x + rx * offset, 0.2, z + rz * offset);
        p.rotation.y = r.angle;
        root.add(p);
        return p;
      };
      const bin = propAt(2.3),
        planter = propAt(-2.7);
      registerBreakable(v, bin, bin.position.x, bin.position.z, 1.1, 0.36);
      registerBreakable(
        v,
        planter,
        planter.position.x,
        planter.position.z,
        1.5,
        0.8,
        "stone",
      );
      add(
        new THREE.CylinderGeometry(0.34, 0.3, 0.85, 10),
        metal,
        0,
        0.43,
        0,
        bin,
      );
      box(0.7, 0.15, 0.7, metal, 0, 0.91, 0, bin);
      box(1.6, 0.55, 1.6, stone, 0, 0.3, 0, planter);
      orb(0.8, 0.65, 0.7, hedge, 0, 0.9, 0, planter);
      if (r.id % 3 === 0) {
        const sign = propAt(4);
        label(r.name.toUpperCase(), 7, 0.85, 0, 3.8, 0, 0, "#174644", sign);
        box(0.1, 3.7, 0.1, metal, 0, 1.85, 0, sign);
        registerBreakable(v, sign, sign.position.x, sign.position.z, 4.2, 0.12);
      }
    }
  }
  // Small old-town balconies and sloped terracotta roofs distinguish the southern blocks.
  for (const b of BUILDINGS) {
    if (b.landmark || b.z > -650) continue;
    const g = new THREE.Group();
    g.position.set(b.x, 0, b.z);
    g.rotation.y = b.angle;
    root.add(g);
    for (const side of [-1, 1]) {
      const roof = box(
        b.w + 1,
        0.5,
        b.d * 0.58,
        brick,
        0,
        b.h + 2,
        side * b.d * 0.25,
        g,
      );
      roof.rotation.x = side * 0.3;
    }
    for (const x of [-b.w * 0.28, b.w * 0.28]) {
      box(5, 0.25, 2.2, wood, x, b.h * 0.5, b.d / 2 + 0.9, g);
      box(5, 0.1, 0.1, wood, x, b.h * 0.5 + 1.2, b.d / 2 + 1.9, g);
      for (let j = -2; j <= 2; j++)
        box(0.09, 1.2, 0.09, wood, x + j, b.h * 0.5 + 0.65, b.d / 2 + 1.9, g);
      box(5, 0.18, 2.5, brick, x, b.h * 0.5 + 3, b.d / 2 + 0.9, g);
    }
  }
  buildExpansion(v, root, box, label, v.expansionFacades);
  // Static meshes are merged in local tiles, retaining culling and dynamic gondolas/water.
  root.updateMatrixWorld(true);
  const batches = new Map(),
    remove = [];
  root.traverse((o) => {
    if (!o.isMesh || o.userData.dynamic) return;
    for (let p = o.parent; p && p !== root; p = p.parent)
      if (p.userData.dynamic) return;
    const pos = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld),
      key =
        o.material.uuid +
        ":" +
        Math.floor(pos.x / 180) +
        ":" +
        Math.floor(pos.z / 180);
    if (!batches.has(key)) batches.set(key, { material: o.material, geos: [] });
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    if (!geo.attributes.uv)
      geo.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(
          new Float32Array(geo.attributes.position.count * 2),
          2,
        ),
      );
    geo.applyMatrix4(o.matrixWorld);
    if (!o.material.vertexColors) geo.deleteAttribute("color");
    const scale =
      o.material === brick
        ? 3
        : o.material === stone
          ? 6
          : o.material === cream
            ? 4
            : [grass, ground.material].includes(o.material)
              ? 35
              : (v.localHillMaterials || []).includes(o.material)
                ? 100
                : 0;
    if (scale) {
      const pos = geo.attributes.position,
        n = geo.attributes.normal,
        uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const vertical = Math.abs(n.getY(i)) < 0.6;
        uv.setXY(
          i,
          (vertical && Math.abs(n.getX(i)) > 0.6 ? pos.getZ(i) : pos.getX(i)) /
            scale,
          (vertical ? pos.getY(i) : pos.getZ(i)) / scale,
        );
      }
    }
    batches.get(key).geos.push(geo);
    remove.push(o);
  });
  for (const o of remove) {
    o.removeFromParent();
    o.geometry.dispose();
  }
  for (const { material, geos } of batches.values()) {
    const merged = mergeGeometries(geos);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    v.decor.add(mesh);
  }
}
export function animateDistricts(v, time) {
  if (v.batumiWheel) v.batumiWheel.rotation.z = time * 0.035;
  for (const f of v.batumiFigures || [])
    f.group.position.x = f.side * (1.2 + Math.cos(time * 0.035) * 1.8);
  if (v.kutaisiWheel) v.kutaisiWheel.rotation.z = time * 0.045;
  if (v.waterTime) v.waterTime.value = time;
  for (const cabin of v.gondolas || []) {
    const t = (time * 0.025 + cabin.offset) % 1,
      { start: a, end: b } = cabin;
    cabin.group.position.set(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * 7 - 5,
      a.z + (b.z - a.z) * t,
    );
  }
}
