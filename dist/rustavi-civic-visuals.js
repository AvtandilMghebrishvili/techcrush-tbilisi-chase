import * as THREE from "./vendor/three.module.js";
import { HEROES, HEROES_PARKS, civicPoint } from "./rustavi-civic-data.js";
import { RUSTAVI_SITES, HALL_PLAZA } from "./rustavi-district-data.js";
import { registerBreakable } from "./breakable-props.js";
import { nearestRoad } from "./city-map.js";
import { roadClear, onAsphalt } from "./road-clearance.js";

// Authored civic architecture. Everything static is merged into the parent city's
// spatial batches; lighting uses existing shared day/night materials, no new loop.
export function buildCivicDetails(v, root, kit) {
  const { add, box, cylinder, beam, label, stone, cream, iron, windows } = kit;
  const material = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...extra });
  const terracotta = material("#ad7163"),
    slate = material("#344653"),
    grass = material("#6c8052"),
    paving = material("#c9c6b5"),
    white = material("#f1eee0"),
    dark = material("#192b32"),
    glass = material("#63aea1", {
      metalness: 0.55,
      roughness: 0.24,
      emissive: "#28d4a0",
      emissiveIntensity: 0,
    }),
    glow = material("#cbeac3", { emissive: "#48ff91", emissiveIntensity: 0 }),
    lamp = material("#fff1c9", { emissive: "#ffd692", emissiveIntensity: 0 });
  v.nightWindowMaterials.push(glass);
  v.streetLampMaterials.push(glow, lamp);
  const groupAt = (s) => {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.angle || 0;
    root.add(g);
    return g;
  };
  const arch = (x, y, r, thickness, z, m, g) =>
    add(new THREE.TorusGeometry(r, thickness, 5, 18, Math.PI), m, x, y, z, g);
  const disc = (r, y, m, x, z, g, segments = 32) => {
    const o = add(new THREE.CircleGeometry(r, segments), m, x, y, z, g);
    o.rotation.x = -Math.PI / 2;
    o.castShadow = false;
    return o;
  };
  const strip = (points, m, g, thickness = 0.2) => {
    for (let i = 1; i < points.length; i++)
      beam(points[i - 1], points[i], thickness, m, g);
  };

  const monument = groupAt({ ...HEROES, angle: 0 });
  // An octagonal stepped island, four splayed white fins and a green glass core.
  for (let i = 0; i < 3; i++) {
    const base = add(
      new THREE.CylinderGeometry(5.5 - i * 0.4, 5.5 - i * 0.4, 0.24, 8),
      i ? cream : stone,
      0,
      0.12 + i * 0.24,
      0,
      monument,
    );
    base.rotation.y = Math.PI / 8;
  }
  add(
    new THREE.CylinderGeometry(0.95, 1.65, 22.5, 4),
    glass,
    0,
    12,
    0,
    monument,
  ).rotation.y = Math.PI / 4;
  for (let side = 0; side < 4; side++) {
    const a = (side * Math.PI) / 2 + Math.PI / 4;
    const fin = new THREE.Group();
    fin.rotation.y = a;
    monument.add(fin);
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(4.9, 0.78, 0),
      new THREE.Vector3(0.9, 1, 0),
      new THREE.Vector3(1.15, 5.5, 0),
      new THREE.Vector3(0.75, 23.8, 0),
    );
    const vertices = [],
      indices = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24,
        p = curve.getPoint(t),
        width = 1.35 - t * 0.85;
      vertices.push(
        p.x - 0.16,
        p.y,
        -width / 2,
        p.x + 0.16,
        p.y,
        -width / 2,
        p.x + 0.16,
        p.y,
        width / 2,
        p.x - 0.16,
        p.y,
        width / 2,
      );
      if (i)
        for (let k = 0; k < 4; k++) {
          const b = i * 4 + k,
            c = i * 4 + ((k + 1) % 4);
          indices.push(b - 4, c - 4, b, c - 4, c, b);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    add(geo, white, 0, 0, 0, fin);
    beam([1.5, 3, 0.7], [0.65, 23.7, 0.45], 0.07, iron, fin);
    for (let y = 4; y <= 23; y += 2)
      beam(
        [1.45 - y * 0.03, y, -0.7],
        [1.45 - y * 0.03, y, 0.7],
        0.045,
        white,
        fin,
      );
    disc(1.0, 0.74, grass, Math.sin(a) * 3.5, Math.cos(a) * 3.5, monument, 12);
    disc(0.48, 0.755, glow, Math.sin(a) * 3.9, Math.cos(a) * 3.9, monument, 12);
    box(
      0.25,
      0.5,
      0.3,
      lamp,
      Math.sin(a) * 0.9,
      23.7,
      Math.cos(a) * 0.9,
      monument,
    );
  }

  for (const park of HEROES_PARKS) {
    const g = groupAt(park),
      r = park.d / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-park.w / 2 + r, -r);
    shape.lineTo(park.w / 2 - r, -r);
    shape.absarc(park.w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(-park.w / 2 + r, r);
    shape.absarc(-park.w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
    const slab = add(
      new THREE.ShapeGeometry(shape, 16),
      paving,
      0,
      0.205,
      0,
      g,
    );
    slab.rotation.x = -Math.PI / 2;
    slab.castShadow = false;
    box(park.w - park.d, 0.022, park.d - 1, grass, 0, 0.228, 0, g);
    box(park.w - 3, 0.018, 2.2, white, 0, 0.246, 0, g);
    box(2.5, 0.018, park.d, white, 0, 0.246, 0, g);
    // Low edging and path lights are kept inside the median, outside traffic lanes.
    for (const side of [-1, 1])
      box(park.w - park.d, 0.17, 0.22, cream, 0, 0.225, side * (r - 0.14), g);
    for (const end of [-1, 1])
      for (const side of [-1, 1]) {
        const point = nearestRoad(
          civicPoint(park, end * (park.w / 2 - 7), side * (park.d / 2 + 6)),
        );
        if (point.distance > 6) continue;
        const crossing = groupAt({ ...point, angle: point.road.angle });
        for (let i = -2; i <= 2; i++) {
          const center = civicPoint(
            { ...point, angle: point.road.angle },
            0,
            i * 0.85,
          );
          if (onAsphalt(center))
            box(
              point.road.width * 0.8,
              0.012,
              0.4,
              white,
              0,
              0.079,
              i * 0.85,
              crossing,
            );
        }
      }
    cylinder(1.9, 0.35, stone, 0, 0.25, 0, g);
    disc(1.55, 0.43, glass, 0, 0, g);
    cylinder(0.17, 0.85, white, 0, 0.8, 0, g);
    for (let along = -park.w / 2 + 10; along < park.w / 2 - 7; along += 13)
      for (const side of [-1, 1]) {
        const point = civicPoint(park, along, side * 1.7),
          pole = new THREE.Group();
        pole.position.set(point.x, 0, point.z);
        root.add(pole);
        const prop = registerBreakable(
          v,
          pole,
          point.x,
          point.z,
          3.3,
          0.12,
          "metal",
        );
        cylinder(0.075, 3, iron, 0, 1.5, 0, pole);
        cylinder(0.32, 0.1, iron, 0, 3.1, 0, pole);
        const head = cylinder(0.18, 0.4, lamp, 0, 2.85, 0, pole);
        v.streetLamps.push({ head, propId: prop.definition.id });
        const bp = civicPoint(park, along + 3.2, side * 2.3),
          bench = new THREE.Group();
        bench.position.set(bp.x, 0, bp.z);
        bench.rotation.y = park.angle;
        root.add(bench);
        registerBreakable(v, bench, bp.x, bp.z, 1, 0.8, "wood");
        for (const x of [-0.7, 0.7])
          box(0.08, 0.5, 0.45, iron, x, 0.25, 0, bench);
        for (const z of [-0.18, 0, 0.18])
          box(2, 0.1, 0.13, terracotta, 0, 0.55, z, bench);
        box(2, 0.4, 0.08, terracotta, 0, 0.86, side * 0.24, bench);
      }
  }
  // Same photographed long wings: cream lower floors, red attic band, dark roofs,
  // arched upper windows and real projecting balcony rails.
  for (const s of RUSTAVI_SITES.filter((s) => s.style === "heroes-apartment")) {
    const g = groupAt(s),
      floors = Math.round(s.h / 3.8);
    box(s.w, s.h, s.d, cream, 0, s.h / 2, 0, g);
    box(s.w, 3.4, s.d + 0.05, terracotta, 0, s.h - 1.7, 0, g);
    box(s.w + 0.35, 0.32, s.d + 0.35, slate, 0, s.h + 0.16, 0, g);
    for (const y of [0.4, s.h - 3.4, s.h - 0.15])
      box(s.w + 0.18, 0.14, s.d + 0.18, white, 0, y, 0, g);
    for (let x = -s.w / 2 + 2; x < s.w / 2 - 1; x += 3.7) {
      for (let j = 0; j < floors; j++)
        for (const side of [-1, 1]) {
          const y = 1.8 + j * 3.8,
            z = side * (s.d / 2 + 0.04);
          box(1.25, 1.95, 0.05, windows, x, y, z, g);
          box(0.06, 1.9, 0.06, white, x, y, z + side * 0.035, g);
          if (j === floors - 1) {
            arch(x, y + 0.9, 0.72, 0.095, z + side * 0.05, white, g);
            for (const edge of [-1, 1])
              box(
                0.12,
                1.9,
                0.08,
                white,
                x + edge * 0.73,
                y,
                z + side * 0.07,
                g,
              );
          } else if (j && Math.round((x + s.w / 2) / 3.7) % 3 === 0) {
            box(2, 0.12, 0.72, stone, x, y - 1, z + side * 0.28, g);
            box(2, 0.07, 0.06, iron, x, y - 0.3, z + side * 0.62, g);
            for (let k = -3; k <= 3; k++)
              box(
                0.04,
                0.7,
                0.04,
                iron,
                x + k * 0.27,
                y - 0.65,
                z + side * 0.62,
                g,
              );
          }
        }
    }
    for (let x = -s.w / 2 + 3; x < s.w / 2; x += 12)
      box(0.8, 0.8, 0.8, slate, x, s.h + 0.7, 0, g);
  }

  const hall = RUSTAVI_SITES.find((s) => s.style === "hall"),
    g = groupAt(hall),
    z = hall.d / 2;
  for (const side of [-1, 1])
    box(
      (hall.w - 37) / 2,
      21,
      hall.d,
      cream,
      side * (37 / 2 + (hall.w - 37) / 4),
      10.5,
      0,
      g,
    );
  box(37, 25, hall.d - 2.1, stone, 0, 12.5, -1.05, g);
  // Five full-height recessed arches in a separate front stone wall.
  const facade = new THREE.Shape();
  facade.moveTo(-18.5, 0);
  facade.lineTo(18.5, 0);
  facade.lineTo(18.5, 24.5);
  facade.lineTo(-18.5, 24.5);
  facade.closePath();
  for (let i = -2; i <= 2; i++) {
    const x = i * 6.7,
      r = 2.45,
      hole = new THREE.Path();
    hole.moveTo(x - r, 5.5);
    hole.lineTo(x - r, 16.6);
    hole.absarc(x, 16.6, r, Math.PI, 0, true);
    hole.lineTo(x + r, 5.5);
    hole.closePath();
    facade.holes.push(hole);
    box(4.8, 13.4, 0.08, dark, x, 12.15, z - 0.98, g);
    box(3.4, 8.5, 0.09, windows, x, 12.3, z - 0.88, g);
    for (const y of [8.6, 12, 15.4])
      box(3.5, 0.14, 0.12, white, x, y, z - 0.8, g);
    box(0.12, 8.4, 0.12, white, x, 12.3, z - 0.8, g);
    box(4.7, 0.36, 1.3, cream, x, 6.8, z - 0.38, g);
    box(2.5, 3.4, 0.15, windows, x, 2.2, z + 0.04, g);
    for (const edge of [-1, 1])
      box(0.22, 3.8, 0.23, white, x + edge * 1.4, 2.2, z + 0.15, g);
  }
  add(
    new THREE.ExtrudeGeometry(facade, { depth: 0.75, bevelEnabled: false }),
    cream,
    0,
    0,
    z - 0.75,
    g,
  );
  for (const side of [-1, 1])
    for (let x = 22; x <= 31; x += 4.5)
      for (let y = 3; y < 20; y += 4.8) {
        box(2.1, 2.8, 0.12, windows, side * x, y, z + 0.07, g);
        for (const dx of [-1.18, 1.18])
          box(0.13, 3, 0.18, white, side * x + dx, y, z + 0.14, g);
        box(2.55, 0.18, 0.3, white, side * x, y + 1.55, z + 0.18, g);
      }
  for (const y of [0.6, 5.4, 20.5])
    box(hall.w + 0.7, 0.28, hall.d + 0.6, stone, 0, y, 0, g);
  box(hall.w + 0.9, 0.42, hall.d + 0.7, stone, 0, 21, 0, g);
  box(38, 0.5, hall.d + 0.8, cream, 0, 24.5, 0, g);
  for (let x = -18; x <= 18; x += 0.9)
    box(0.35, 0.42, 0.52, white, x, 24.05, z + 0.35, g);
  const pediment = new THREE.Shape();
  pediment.moveTo(-18.9, 0);
  pediment.lineTo(18.9, 0);
  pediment.lineTo(0, 4.1);
  pediment.closePath();
  add(
    new THREE.ExtrudeGeometry(pediment, { depth: 0.8, bevelEnabled: false }),
    cream,
    0,
    24.8,
    z - 0.3,
    g,
  );
  strip(
    [
      [-19.2, 24.8, z + 0.6],
      [0, 29, z + 0.6],
      [19.2, 24.8, z + 0.6],
    ],
    stone,
    g,
    0.25,
  );
  const clock = add(
    new THREE.CircleGeometry(0.95, 32),
    white,
    0,
    26.5,
    z + 0.53,
    g,
  );
  beam([0, 26.5, z + 0.56], [0.1, 27.15, z + 0.56], 0.055, iron, g);
  beam([0, 26.5, z + 0.56], [0.5, 26.35, z + 0.56], 0.055, iron, g);
  // Georgian flag with the five-cross motif at the central entrance.
  beam([0, 7.3, z + 0.7], [0, 12, z + 1], 0.045, iron, g);
  box(2.4, 1.6, 0.025, white, 1.2, 11.05, z + 1, g);
  const red = material("#d42e41");
  box(0.22, 1.6, 0.03, red, 1.2, 11.05, z + 1.025, g);
  box(2.4, 0.22, 0.03, red, 1.2, 11.05, z + 1.025, g);
  for (const dx of [-0.62, 0.62])
    for (const dy of [-0.43, 0.43]) {
      box(0.36, 0.1, 0.035, red, 1.2 + dx, 11.05 + dy, z + 1.03, g);
      box(0.1, 0.36, 0.035, red, 1.2 + dx, 11.05 + dy, z + 1.03, g);
    }
  label("RUSTAVI CITY HALL", 18, 0.8, 0, 4.8, z + 0.12, 0, g);
  // One repeated paving texture, not thousands of tile meshes. The existing
  // connected streets form a level shared-space approach across the open square.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#aeadab";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "#939694";
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  // The interlocking pale circles echo the supplied city-hall paving photograph.
  ctx.strokeStyle = "#dbd9cd";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(128, 128, 100, 0, Math.PI * 2);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(HALL_PLAZA.w / 8, HALL_PLAZA.d / 8);
  const court = material("#ffffff", { map: texture, roughness: 0.86 });
  const courtGroup = groupAt(HALL_PLAZA);
  const plane = add(
    new THREE.PlaneGeometry(HALL_PLAZA.w, HALL_PLAZA.d),
    court,
    0,
    0.205,
    0,
    courtGroup,
  );
  plane.rotation.x = -Math.PI / 2;
  plane.castShadow = false;
  // A flat border and entrance axis keep the centre entirely free to drive.
  for (const side of [-1, 1]) {
    box(
      0.5,
      0.015,
      HALL_PLAZA.d,
      white,
      side * (HALL_PLAZA.w / 2 - 0.6),
      0.219,
      0,
      courtGroup,
    );
    box(
      HALL_PLAZA.w,
      0.015,
      0.5,
      white,
      0,
      0.219,
      side * (HALL_PLAZA.d / 2 - 0.6),
      courtGroup,
    );
  }
}
