import { RUSTAVI_GEO } from "./rustavi-geo-data.js";
import { placeOffRoad, footprintsOverlap } from "./map-clearance.js";
import {
  HEROES,
  HEROES_BLOCKS,
  HEROES_PARKS,
  civicPoint,
} from "./rustavi-civic-data.js";
export const project = (lat, lon) => ({
  x: -(lon - 44.985) * 41600,
  z: (lat - 41.55) * 55660,
});
export const RIVER = RUSTAVI_GEO.river.map(([x, z]) => ({ x, z }));
export function riverDistance(p) {
  let best = Infinity;
  for (let i = 1; i < RIVER.length; i++) {
    const a = RIVER[i - 1],
      b = RIVER[i],
      dx = b.x - a.x,
      dz = b.z - a.z;
    const t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)),
    );
    best = Math.min(best, Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz));
  }
  return best;
}
export const RIVER_BANKS = [[], []];
RIVER.forEach((p, i) => {
  const a = RIVER[Math.max(0, i - 1)],
    b = RIVER[Math.min(RIVER.length - 1, i + 1)],
    d = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  for (const [j, s] of [
    [0, 1],
    [1, -1],
  ])
    RIVER_BANKS[j].push([
      p.x + ((b.z - a.z) / d) * 36 * s,
      p.z - ((b.x - a.x) / d) * 36 * s,
    ]);
});
export const RIVER_POLYGON = [
  ...RIVER_BANKS[0],
  ...RIVER_BANKS[1].slice().reverse(),
  RIVER_BANKS[0][0],
];
const site = (name, lat, lon, w, d, h, style, angle = 0) => ({
  name,
  ...project(lat, lon),
  w,
  d,
  h,
  style,
  angle,
  landmark: true,
});
export const RUSTAVI_SITES = [
  site("RUSTAVI NEW MONUMENT", 41.54305, 45.00993, 9, 9, 4, "diamond"),
  site("CITY HALL", 41.54365, 45.01143, 67, 23, 25, "hall", -0.55),
  site(
    "RUSTAVI DRAMA THEATRE",
    41.540878,
    45.009796,
    51,
    29,
    21,
    "theatre",
    -0.55,
  ),
  site("HORSES OF RUSTAVI", 41.5577, 44.9919, 16, 11, 4, "horses"),
  site("SHOTA RUSTAVELI", 41.56261, 44.9787, 8, 8, 3, "poet"),
  site("MOTORPARK PIT BUILDING", 41.5724, 44.948, 78, 20, 13, "pits", -0.42),
  site("SERVICE AGENCY", 41.56355, 44.9541, 73, 25, 13, "agency"),
  site("METALLURGICAL HERITAGE", 41.5312, 45.0135, 70, 42, 28, "industry"),
  {
    ...HEROES,
    w: 7,
    d: 7,
    h: 0.72,
    cylinder: { radius: 5.1 },
    style: "heroes",
    landmark: true,
  },
  ...HEROES_BLOCKS,
];
const placed = [];
for (const s of RUSTAVI_SITES) {
  // This small plinth fits the mapped traffic island; relocating it would destroy the square.
  if (s.style === "heroes") {
    placed.push(s);
    continue;
  }
  const p = placeOffRoad(
    s,
    [{ x: 0, z: 0, w: s.w + 3, d: s.d + 3, angle: s.angle }],
    (q) =>
      riverDistance(q) > 48 &&
      !placed.some((other) => footprintsOverlap({ ...s, ...q }, other, 4)),
  );
  s.x = p.x;
  s.z = p.z;
  placed.push(s);
}
// A deliberately open civic forecourt. Keep the new monument on the hall axis;
// the separate Heroes Square memorial stays in its photographed traffic island.
export const HALL_PLAZA = {
  ...civicPoint(RUSTAVI_SITES[1], 0, 58),
  w: 116,
  d: 90,
  angle: RUSTAVI_SITES[1].angle,
};
Object.assign(RUSTAVI_SITES[0], civicPoint(RUSTAVI_SITES[1], 0, 42), {
  angle: RUSTAVI_SITES[1].angle,
});
export const EXAM_YARD = {
  ...project(41.5644, 44.9556),
  w: 175,
  d: 135,
  angle: 0,
};
export const TRACK_ZONE = {
  ...project(41.57, 44.947),
  w: 610,
  d: 640,
  angle: 0,
};
const nowhere = { x: 9999, z: 9999 };
export const LANDMARKS = {
  monument: RUSTAVI_SITES[0],
  hall: RUSTAVI_SITES[1],
  theatre: RUSTAVI_SITES[2],
  track: RUSTAVI_SITES[5],
  agency: RUSTAVI_SITES[6],
  heroes: RUSTAVI_SITES[8],
  rike: project(41.54, 45.003),
  park: project(41.539, 45.004),
  boulevard: project(41.557, 44.984),
  peace: nowhere,
  tubes: nowhere,
  mother: nowhere,
  narikala: nowhere,
  metekhi: nowhere,
};
export const CIVIC_SQUARE = HALL_PLAZA;
export const GRANDSTAND_STEPS = Array.from({ length: 5 }, (_, row) => ({
  name: "MOTORPARK GRANDSTAND",
  x: LANDMARKS.track.x,
  z: LANDMARKS.track.z + 30 + row * 3.2,
  w: 90,
  d: 3.2,
  h: 1.25 + row * 1.3,
  angle: 0,
  landmark: true,
}));
export const DISTRICT_SOLIDS = [
  ...RUSTAVI_SITES,
  ...GRANDSTAND_STEPS,
  ...HEROES_PARKS.map((p) => ({
    x: p.x,
    z: p.z,
    w: 3.8,
    d: 3.8,
    h: 1.25,
    angle: p.angle,
    cylinder: { radius: 1.9 },
    landmark: true,
    name: "PARK FOUNTAIN",
  })),
  {
    ...HEROES,
    w: 3.3,
    d: 3.3,
    h: 24,
    cylinder: { radius: 1.65 },
    landmark: true,
    name: "MEMORIAL GLASS CORE",
  },
].map((s) => ({ ...s }));
export const RETAINING_WALLS = [];
export function reservedDistrict(p, padding = 0) {
  return (
    riverDistance(p) < 44 + padding ||
    RUSTAVI_SITES.some(
      (s) =>
        Math.hypot(p.x - s.x, p.z - s.z) <
        Math.hypot(s.w, s.d) / 2 + padding + 12,
    ) ||
    [
      EXAM_YARD,
      TRACK_ZONE,
      CIVIC_SQUARE,
      ...HEROES_PARKS,
      { ...HEROES, w: 245, d: 285, angle: HEROES.angle },
    ].some((s) =>
      footprintsOverlap(
        {
          ...p,
          w: p.w || padding * 2,
          d: p.d || padding * 2,
          angle: p.angle || 0,
        },
        s,
        12,
      ),
    )
  );
}
