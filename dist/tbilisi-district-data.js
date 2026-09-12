import { placeOffRoad, overlapsRoad } from "./map-clearance.js";
const project = ([lat, lon]) => ({
  x: -(lon - 44.799) * 83140,
  z: (lat - 41.699) * 111320,
});
export const LANDMARKS = {
  baratashvili: project([41.69688, 44.80825]),
  peace: project([41.692994, 44.808033]),
  rike: project([41.6934, 44.8099]),
  tubes: project([41.6945, 44.8104]),
  europe: project([41.691225, 44.811128]),
  baths: project([41.68835, 44.81053]),
  cable: project([41.691961, 44.810626]),
  metekhi: project([41.6903, 44.81185]),
  narikala: project([41.6881, 44.8085]),
  mother: project([41.6882, 44.8047]),
};
export const RIVER = [
  [41.712, 44.805],
  [41.705, 44.8049],
  [41.702, 44.805],
  [41.699, 44.8072],
  [41.69688, 44.80825],
  [41.6954, 44.80855],
  [41.694, 44.80845],
  [41.692994, 44.808033],
  [41.6915, 44.80895],
  [41.69012, 44.81015],
  [41.6885, 44.814],
  [41.686, 44.8175],
  [41.681, 44.823],
].map(project);
export function riverDistance(p) {
  let d = Infinity;
  for (let i = 1; i < RIVER.length; i++) {
    const a = RIVER[i - 1],
      b = RIVER[i],
      dx = b.x - a.x,
      dz = b.z - a.z;
    const t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)),
    );
    d = Math.min(d, Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz));
  }
  return d;
}
export const RIVER_BANKS = [[], []];
RIVER.forEach((p, i) => {
  const a = RIVER[Math.max(0, i - 1)],
    b = RIVER[Math.min(RIVER.length - 1, i + 1)],
    d = Math.hypot(b.x - a.x, b.z - a.z);
  for (const [j, s] of [
    [0, 1],
    [1, -1],
  ])
    RIVER_BANKS[j].push([
      p.x + ((b.z - a.z) / d) * 42 * s,
      p.z - ((b.x - a.x) / d) * 42 * s,
    ]);
});
export const RIVER_POLYGON = [
  ...RIVER_BANKS[0],
  ...RIVER_BANKS[1].slice().reverse(),
  RIVER_BANKS[0][0],
];
export function reservedDistrict(p, padding = 0) {
  const r = LANDMARKS.rike,
    e = LANDMARKS.europe,
    b = LANDMARKS.baths,
    m = LANDMARKS.metekhi;
  return (
    riverDistance(p) < 62 + padding ||
    ((p.x - r.x) / (125 + padding)) ** 2 +
      ((p.z - r.z) / (240 + padding)) ** 2 <
      1 ||
    ((p.x - e.x) / (55 + padding)) ** 2 + ((p.z - e.z) / (86 + padding)) ** 2 <
      1 ||
    Math.hypot(p.x - b.x, p.z - b.z) < 70 + padding ||
    Math.hypot(p.x - m.x, p.z - m.z) < 40 + padding
  );
}
const landmarkParts = {
  tubes: [-1, 1].map((s) => ({
    x: -13,
    z: s * 26,
    w: 132,
    d: 42,
    h: 42,
    angle: s * 0.32,
  })),
  baths: [
    ...[
      [-22, -12, 7],
      [-5, -15, 6],
      [13, -14, 7],
      [-22, 9, 6],
      [-5, 10, 7],
      [14, 10, 6],
      [31, -3, 5],
    ].map(([x, z, r]) => ({ x, z, w: r * 2, d: r * 2, h: 8, angle: 0 })),
    { x: -5, z: 35, w: 28, d: 6, h: 19, angle: 0 },
  ],
  metekhi: [{ x: 0, z: 0, w: 35, d: 38, h: 68, angle: 0 }],
  cable: [{ x: 0, z: 0, w: 24, d: 14, h: 8, angle: 0 }],
};
for (const [key, parts] of Object.entries(landmarkParts))
  Object.assign(
    LANDMARKS[key],
    placeOffRoad(LANDMARKS[key], parts, (p) => riverDistance(p) > 52),
  );
export const RETAINING_WALLS = [];
for (let z = LANDMARKS.rike.z - 125; z < LANDMARKS.rike.z + 170; z += 18) {
  const wall = {
    x: LANDMARKS.rike.x - 132,
    z,
    w: 4.2,
    d: 18,
    h: 9,
    angle: 0,
    landmark: true,
  };
  if (!overlapsRoad(wall, 3)) RETAINING_WALLS.push(wall);
}
const physicalParts = {
  ...landmarkParts,
  // The tube shells are elevated and taper: full-height enclosing boxes used
  // to block empty air beside/below them. These match the 30 rendered sections.
  tubes: [-1, 1].flatMap((sign) =>
    Array.from({ length: 30 }, (_, i) => {
      const u = (i + 0.5) / 30,
        radius = 12 + 7 * Math.cos(u * Math.PI) ** 2,
        cy = 18 + u * 4,
        angle = sign * 0.32,
        dx = 48 - u * 99;
      return {
        x: -13 + Math.cos(angle) * dx,
        z: sign * 26 - Math.sin(angle) * dx,
        w: 99 / 30,
        d: 2 * radius,
        base: cy - radius * 0.81,
        h: cy + radius * 0.81,
        angle,
        tubeSection: { radius, cy },
      };
    }),
  ),
  baths: [
    ...landmarkParts.baths.slice(0, 7).map((p) => ({ ...p, h: 2.2 })),
    ...landmarkParts.baths.slice(0, 7).map((p) => ({
      ...p,
      base: 2.2,
      h: 2.2 + p.w * 0.3,
      dome: { radius: p.w / 2, height: p.w * 0.3 },
    })),
    { x: -5, z: 35, w: 27, d: 5, h: 13, angle: 0 },
    { x: -5, z: 35, w: 11, d: 5.15, h: 18, angle: 0 },
    { x: -5, z: 35, w: 28, d: 6, base: 12.775, h: 13.425, angle: 0 },
  ],
  metekhi: [
    { x: 0, z: 0, w: 20, d: 29, base: 18, h: 40, angle: 0 },
    { x: 0, z: 0, w: 25, d: 32, base: 40, h: 42, angle: 0 },
  ],
  cable: [{ x: 0, z: 0, w: 23, d: 13, h: 7, angle: 0 }],
};
export const DISTRICT_SOLIDS = [
  ...Object.entries(physicalParts).flatMap(([key, parts]) =>
    parts.map((b) => ({
      ...b,
      x: b.x + LANDMARKS[key].x,
      z: b.z + LANDMARKS[key].z,
      landmark: true,
    })),
  ),
  ...RETAINING_WALLS.map((w) => ({ ...w, w: 3, h: 8 })),
];
