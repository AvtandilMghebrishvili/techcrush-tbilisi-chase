import * as THREE from "./vendor/three.module.js";
import {
  HEROES,
  FREEDOM,
  AXIS,
  KING_TOWERS,
  TOWER_PARTS,
  HALL,
  FLYOVER_PIERS,
  FLYOVER_RAILS,
} from "./tbilisi-civic-data.js";
import { FLYOVER_PATH } from "./tbilisi-civic-layout.js";

// Original procedural landmark models, batched with the rest of the district.
// Shared window textures/emissive materials use the existing day/night update.
export function buildTbilisiCivic(v, root, shared, label) {
  const mat = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...extra });
  const stone = shared.stone,
    cream = shared.cream,
    lawn = shared.grass;
  const white = mat("#e6e1d3"),
    concrete = mat("#a3a39b"),
    gold = mat("#e4b447", { metalness: 0.78, roughness: 0.29 }),
    dark = mat("#222c34"),
    bronze = mat("#92764e", { metalness: 0.65 });
  const road = v.roadMaterial,
    paint = mat("#e3e0c8");
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#7b98a7";
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 12; x++) {
      ctx.fillStyle =
        (x * 13 + y * 7) % 9 < 2
          ? "#b9bdad"
          : (x + y) % 3
            ? "#354e63"
            : "#607789";
      ctx.fillRect((x * 256) / 12 + 1, y * 32 + 1, 256 / 12 - 2, 30);
    }
  const windows = new THREE.CanvasTexture(c);
  windows.colorSpace = THREE.SRGBColorSpace;
  const glass = mat("#d3e6ee", {
    map: windows,
    metalness: 0.5,
    roughness: 0.26,
    emissive: "#d4b980",
    emissiveMap: windows,
    emissiveIntensity: 0,
  });
  const blackGlass = glass.clone();
  blackGlass.color.set("#526271");
  v.nightWindowMaterials.push(glass, blackGlass);
  const mesh = (geo, m, x = 0, y = 0, z = 0, parent = root) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const box = (w, h, d, m, x, y, z, parent = root) =>
    mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const cyl = (r1, r2, h, m, x, y, z, n = 32, parent = root) =>
    mesh(new THREE.CylinderGeometry(r1, r2, h, n), m, x, y, z, parent);
  const orb = (x, y, z, sx, sy, sz, m, parent = root) => {
    const o = mesh(new THREE.SphereGeometry(1, 12, 8), m, x, y, z, parent);
    o.scale.set(sx, sy, sz);
    return o;
  };
  const beam = (a, b, r, m, parent = root) => {
    const av = new THREE.Vector3(...a),
      bv = new THREE.Vector3(...b),
      mid = av.clone().add(bv).multiplyScalar(0.5),
      d = bv.sub(av);
    const o = cyl(r, r, d.length(), m, mid.x, mid.y, mid.z, 8, parent);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return o;
  };
  function rounded(w, d, h, r = 5) {
    const s = new THREE.Shape(),
      x = -w / 2,
      z = -d / 2;
    s.moveTo(x + r, z);
    s.lineTo(x + w - r, z);
    s.quadraticCurveTo(x + w, z, x + w, z + r);
    s.lineTo(x + w, z + d - r);
    s.quadraticCurveTo(x + w, z + d, x + w - r, z + d);
    s.lineTo(x + r, z + d);
    s.quadraticCurveTo(x, z + d, x, z + d - r);
    s.lineTo(x, z + r);
    s.quadraticCurveTo(x, z, x + r, z);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: h,
      bevelEnabled: false,
      curveSegments: 5,
    });
    geo.rotateX(-Math.PI / 2);
    return geo;
  }

  // Axis: 37 individually twisted storeys, pale stone and dark glass twins.
  for (const p of TOWER_PARTS.filter(
    (p) => p.style.startsWith("axis") || p.style === "podium",
  )) {
    const g = new THREE.Group();
    g.position.set(p.x, p.base, p.z);
    g.rotation.y = p.angle;
    root.add(g);
    const height = p.h - p.base;
    box(
      p.w,
      height,
      p.d,
      p.style === "axis-glass" ? blackGlass : glass,
      0,
      height / 2,
      0,
      g,
    );
    if (p.style === "podium") {
      box(p.w, 0.6, p.d, white, 0, height, 0, g);
      for (let x = -p.w / 2 + 4; x < p.w / 2; x += 6)
        box(0.55, height, 1, white, x, height / 2, p.d / 2, g);
    } else {
      const band = p.style === "axis-stone" ? white : concrete;
      box(
        p.w + 0.45,
        p.style === "axis-stone" ? 1 : 0.22,
        p.d + 0.45,
        band,
        0,
        height - 0.15,
        0,
        g,
      );
      if (p.style === "axis-stone")
        for (const side of [-1, 1]) {
          for (let x = -15; x <= 15; x += 6)
            box(
              0.34,
              height,
              0.35,
              white,
              x,
              height / 2,
              side * (p.d / 2 + 0.1),
              g,
            );
        }
    }
  }
  for (const dx of [-34, 34]) box(17, 3, 21, dark, AXIS.x + dx, 146.4, AXIS.z);
  label("AXIS TOWERS", 27, 2.5, AXIS.x, 9, AXIS.z + 31, 0, "#173a49");

  // King David: different heights, rounded blue glazing and flowing floor bands.
  for (const t of KING_TOWERS) {
    mesh(rounded(t.w, t.d, t.height), glass, t.x, 0, t.z);
    for (let f = 1; f <= t.floors; f++) {
      const y = (f * (t.height - 4)) / t.floors;
      mesh(rounded(t.w + 0.35, t.d + 0.35, 0.35), white, t.x, y, t.z);
      // Continuous sinuous edge gives the crown/white ribbons their identity.
      const pts = Array.from(
        { length: 25 },
        (_, i) =>
          new THREE.Vector3(
            t.x - t.w / 2 + 5 + (i * (t.w - 10)) / 24,
            y + 0.55 + Math.sin((i / 24) * Math.PI * 2 + f * 0.28) * 0.5,
            t.z + t.d / 2 + 0.12,
          ),
      );
      mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(pts),
          24,
          0.12,
          4,
          false,
        ),
        white,
      );
    }
    for (let x = -t.w / 2 + 7; x < t.w / 2 - 4; x += 4.5)
      for (const side of [-1, 1])
        box(
          0.17,
          t.height,
          0.2,
          concrete,
          t.x + x,
          t.height / 2,
          t.z + (side * t.d) / 2,
        );
    mesh(rounded(t.w - 9, t.d - 9, 4), dark, t.x, t.height - 1, t.z);
    mesh(rounded(t.w + 1, t.d + 1, 0.65), white, t.x, t.height + 3, t.z);
    box(9, 5, 8, concrete, t.x + 3, t.height + 4, t.z - 3);
  }
  label(
    "KING DAVID",
    26,
    2.3,
    KING_TOWERS[0].x,
    4,
    KING_TOWERS[0].z + 22,
    0,
    "#173a49",
  );

  // Heroes Square: a driveable 270-degree flyover above the street network.
  cyl(96, 96, 0.14, lawn, HEROES.x, -0.02, HEROES.z, 64);
  // Joined edge vertices close the outside of bends without flat disks or gaps.
  const deckVertices = [],
    deckUV = [],
    deckIndices = [];
  for (let i = 0; i < FLYOVER_PATH.length; i++) {
    const p = FLYOVER_PATH[i],
      a = FLYOVER_PATH[Math.max(0, i - 1)],
      b = FLYOVER_PATH[Math.min(FLYOVER_PATH.length - 1, i + 1)];
    const heading = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const segment = Math.atan2(
      i ? p[0] - a[0] : b[0] - p[0],
      i ? p[1] - a[1] : b[1] - p[1],
    );
    const width = 6.88 / Math.max(0.65, Math.cos(heading - segment));
    for (const side of [-1, 1]) {
      const x = p[0] + Math.cos(heading) * width * side,
        z = p[1] - Math.sin(heading) * width * side;
      deckVertices.push(x, p[2] + 0.064, z);
      deckUV.push(x / 10, z / 10);
    }
    if (i < FLYOVER_PATH.length - 1)
      deckIndices.push(
        i * 2,
        i * 2 + 2,
        i * 2 + 1,
        i * 2 + 1,
        i * 2 + 2,
        i * 2 + 3,
      );
  }
  const ribbon = new THREE.BufferGeometry();
  ribbon.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(deckVertices, 3),
  );
  ribbon.setAttribute("uv", new THREE.Float32BufferAttribute(deckUV, 2));
  ribbon.setIndex(deckIndices);
  ribbon.computeVertexNormals();
  mesh(ribbon, road);
  const count = deckVertices.length / 3,
    bodyVertices = [...deckVertices];
  for (let i = 0; i < deckVertices.length; i += 3)
    bodyVertices.push(
      deckVertices[i],
      deckVertices[i + 1] - 0.65,
      deckVertices[i + 2],
    );
  const bodyIndices = [];
  for (let i = 0; i < FLYOVER_PATH.length - 1; i++) {
    const j = i * 2;
    bodyIndices.push(
      j,
      j + count,
      j + 2,
      j + 2,
      j + count,
      j + count + 2,
      j + 1,
      j + 3,
      j + 1 + count,
      j + 3,
      j + 3 + count,
      j + 1 + count,
      j + count,
      j + 1 + count,
      j + 2 + count,
      j + 1 + count,
      j + 3 + count,
      j + 2 + count,
    );
  }
  const body = new THREE.BufferGeometry();
  body.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(bodyVertices, 3),
  );
  body.setIndex(bodyIndices);
  body.computeVertexNormals();
  mesh(body, concrete);
  for (let i = 1; i < FLYOVER_PATH.length; i++) {
    const a = FLYOVER_PATH[i - 1],
      b = FLYOVER_PATH[i],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      dy = b[2] - a[2],
      len = Math.hypot(dx, dz),
      angle = Math.atan2(dx, dz);
    const g = new THREE.Group();
    g.position.set((a[0] + b[0]) / 2, (a[2] + b[2]) / 2, (a[1] + b[1]) / 2);
    g.rotation.y = angle;
    root.add(g);
    const dash = box(
      0.17,
      0.02,
      Math.min(len * 0.5, 4.5),
      paint,
      0,
      0.075,
      0,
      g,
    );
    dash.rotation.x = -Math.atan2(dy, len);
  }
  for (const p of FLYOVER_PIERS) {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.angle;
    root.add(g);
    box(p.w, p.h, p.d, concrete, 0, p.h / 2, 0, g);
    box(6.5, 0.6, 3.4, concrete, 0, p.h - 0.2, 0, g);
  }
  for (const r of FLYOVER_RAILS) {
    const g = new THREE.Group();
    g.position.set(r.x, (r.slope.a + r.slope.b) / 2 + 0.53, r.z);
    g.rotation.y = r.angle;
    root.add(g);
    const rail = box(
      r.w,
      1.05,
      Math.hypot(r.d, r.slope.b - r.slope.a),
      white,
      0,
      0,
      0,
      g,
    );
    rail.rotation.x = -Math.atan2(r.slope.b - r.slope.a, r.slope.length);
  }
  cyl(11, 13, 0.5, stone, HEROES.x, 0.2, HEROES.z);
  for (let i = 0; i < 24; i++) {
    const g = new THREE.Group();
    g.position.set(HEROES.x, 1 + i * 1.92, HEROES.z);
    g.rotation.y = i * 0.017;
    root.add(g);
    box(7.1, 1.87, 7.1, i % 4 ? cream : bronze, 0, 0.93, 0, g);
    for (const side of [-1, 1])
      box(0.14, 1.87, 7.2, bronze, side * 2.5, 0.93, 0, g);
  }
  // A park under the raised loop, with paths and a low memorial terrace.
  box(2.5, 0.04, 125, stone, HEROES.x, 0.13, HEROES.z);
  box(125, 0.04, 2.5, stone, HEROES.x, 0.14, HEROES.z);

  // Freedom Square: stepped island, fluted white column and gilded St George.
  cyl(11.8, 11.8, 0.16, lawn, FREEDOM.x, 0.14, FREEDOM.z, 48);
  for (let i = 0; i < 3; i++)
    cyl(
      6.5 - i * 0.8,
      6.5 - i * 0.8,
      0.75,
      stone,
      FREEDOM.x,
      0.38 + i * 0.75,
      FREEDOM.z,
    );
  cyl(2.4, 2.7, 1.4, cream, FREEDOM.x, 2.8, FREEDOM.z);
  cyl(1.2, 1.55, 25, cream, FREEDOM.x, 15.9, FREEDOM.z);
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    beam(
      [FREEDOM.x + Math.sin(a) * 1.5, 3.4, FREEDOM.z + Math.cos(a) * 1.5],
      [FREEDOM.x + Math.sin(a) * 1.17, 28.2, FREEDOM.z + Math.cos(a) * 1.17],
      0.07,
      white,
    );
  }
  cyl(1.85, 1.2, 1.4, gold, FREEDOM.x, 28.8, FREEDOM.z);
  box(4, 0.55, 4, gold, FREEDOM.x, 29.8, FREEDOM.z);
  const statue = new THREE.Group();
  statue.position.set(FREEDOM.x, 30.1, FREEDOM.z);
  statue.rotation.y = -0.5;
  root.add(statue);
  orb(0, 1.8, 0, 1.75, 0.78, 0.65, gold, statue); // Horse, lifted front legs.
  orb(1.3, 2.6, 0, 0.45, 0.95, 0.48, gold, statue);
  orb(1.7, 3.3, 0, 0.62, 0.33, 0.36, gold, statue);
  for (const side of [-1, 1]) {
    beam(
      [-1, 1.6, side * 0.45],
      [-1.35, 0.25, side * 0.55],
      0.17,
      gold,
      statue,
    );
    beam([1, 1.6, side * 0.45], [1.7, 1, side * 0.65], 0.15, gold, statue);
    beam([1.7, 1, side * 0.65], [2.1, 1.3, side * 0.65], 0.12, gold, statue);
  }
  beam([-1.65, 2.1, 0], [-2.3, 1.1, 0.4], 0.14, gold, statue);
  orb(-0.15, 3.1, 0, 0.47, 0.88, 0.35, gold, statue);
  orb(-0.05, 4.14, 0, 0.3, 0.36, 0.3, gold, statue);
  beam([-0.1, 3.65, 0.2], [0.85, 3.6, 0.3], 0.13, gold, statue);
  beam([0.85, 4.5, 0.3], [2.8, -0.1, 0.3], 0.065, gold, statue); // Lance, not an abstract spike.
  orb(1, 0.12, 0.15, 1.4, 0.22, 0.45, gold, statue);
  for (const side of [-1, 1])
    beam([-0.3, 2.9, side * 0.3], [0.3, 1.5, side * 0.8], 0.15, gold, statue);

  // The old city hall anchors the southern side of Freedom Square.
  const h = HALL,
    g = new THREE.Group();
  g.position.set(h.x, 0, h.z);
  root.add(g);
  const rose = mat("#c9907e");
  box(h.w, h.h, h.d, rose, 0, h.h / 2, 0, g);
  for (const y of [1, 7, 13, 19])
    box(h.w + 0.5, 0.5, h.d + 0.5, cream, 0, y, 0, g);
  for (const side of [-1, 1])
    for (let x = -36; x <= 36; x += 6)
      for (const y of [4, 10, 16]) {
        box(2.35, 3.8, 0.2, glass, x, y, side * (h.d / 2 + 0.12), g);
        const arch = mesh(
          new THREE.TorusGeometry(1.35, 0.18, 5, 12, Math.PI),
          cream,
          x,
          y + 1.85,
          side * (h.d / 2 + 0.2),
          g,
        );
        for (const dx of [-1.35, 1.35])
          box(0.28, 3.8, 0.3, cream, x + dx, y, side * (h.d / 2 + 0.2), g);
      }
  box(9, 13, 9, rose, 0, 25.5, 0, g);
  for (const z of [-4.6, 4.6]) {
    const clock = mesh(new THREE.CircleGeometry(2.25, 32), white, 0, 27, z, g);
    if (z < 0) clock.rotation.y = Math.PI;
    beam([0, 27, z * 1.002], [0, 28.6, z * 1.002], 0.08, dark, g);
    beam([0, 27, z * 1.002], [1.3, 26.6, z * 1.002], 0.08, dark, g);
  }
  mesh(new THREE.ConeGeometry(6.5, 7, 4), dark, 0, 35, 0, g).rotation.y =
    Math.PI / 4;
  beam([h.x, 38, h.z], [h.x, 41, h.z], 0.07, bronze);
}
