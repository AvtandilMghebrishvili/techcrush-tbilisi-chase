import { BATUMI_GEO } from "./batumi-geo-data.js";
import { placeOffRoad } from "./map-clearance.js";
export const project = (lat, lon) => ({
  x: -(lon - 41.621) * 83180,
  z: (lat - 41.64) * 111320,
});
export const RIVER = BATUMI_GEO.coast.map(([x, z]) => ({ x, z }));
export const RIVER_BANKS = [BATUMI_GEO.coast, []];
export const RIVER_POLYGON = BATUMI_GEO.sea;
export function inSea(p) {
  let inside = false;
  for (
    let i = 0, j = RIVER_POLYGON.length - 1;
    i < RIVER_POLYGON.length;
    j = i++
  ) {
    const a = RIVER_POLYGON[i],
      b = RIVER_POLYGON[j];
    if (
      a[1] > p.z !== b[1] > p.z &&
      p.x < ((b[0] - a[0]) * (p.z - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
export function riverDistance(p) {
  let best = Infinity;
  for (let i = 1; i < RIVER.length; i++) {
    const a = RIVER[i - 1],
      b = RIVER[i],
      dx = b.x - a.x,
      dz = b.z - a.z,
      u = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz),
        ),
      );
    best = Math.min(best, Math.hypot(p.x - a.x - dx * u, p.z - a.z - dz * u));
  }
  return best;
}
const site = (name, lat, lon, w, d, h, style, angle = 0) => ({
  name,
  ...project(lat, lon),
  w,
  d,
  h,
  style,
  angle,
  landmark: true,
  batumi: true,
});
// Reference locations, with clearance adjustments for widened playable roads.
export const BATUMI_SITES = [
  site("ALPHABET TOWER", 41.6555, 41.6392, 22, 22, 130, "alphabet"),
  site("ALI & NINO", 41.6566, 41.6438, 14, 8, 8, "ali"),
  site("PANORAMIC WHEEL", 41.656, 41.642, 52, 12, 55, "wheel"),
  site("BATUMI LIGHTHOUSE", 41.6552, 41.641, 7, 7, 21, "lighthouse"),
  site("EUROPE SQUARE · MEDEA", 41.651, 41.6355, 12, 12, 22, "medea"),
  site("PIAZZA", 41.6491, 41.6412, 24, 24, 34, "piazza"),
  site("SHERATON", 41.6497, 41.6286, 33, 29, 110, "sheraton"),
  site("RADISSON BLU", 41.654, 41.6375, 53, 25, 89, "radisson"),
  site("BATUMI TOWER", 41.653, 41.635, 30, 28, 170, "tower"),
  site("ORBI TWIN TOWERS", 41.634, 41.6095, 74, 38, 140, "twins"),
  site("HILTON", 41.6478, 41.6254, 43, 30, 90, "hilton"),
  site("DANCING FOUNTAINS", 41.6357, 41.6107, 40, 24, 3, "fountain"),
  site("CHACHA TOWER", 41.6529, 41.6443, 16, 16, 25, "chacha"),
];
for (const s of BATUMI_SITES) {
  const p = placeOffRoad(
    s,
    [{ x: 0, z: 0, w: s.w + 2, d: s.d + 2, angle: s.angle }],
    (q) => !inSea(q) && riverDistance(q) > 12,
  );
  s.x = p.x;
  s.z = p.z;
}
export const LANDMARKS = {
  alphabet: BATUMI_SITES[0],
  ali: BATUMI_SITES[1],
  wheel: BATUMI_SITES[2],
  rike: project(41.6545, 41.6395),
  boulevard: project(41.649, 41.627),
  park: project(41.6448, 41.6267),
  peace: { x: 9999, z: 9999 },
  tubes: { x: 9999, z: 9999 },
  mother: { x: 9999, z: 9999 },
  narikala: { x: 9999, z: 9999 },
  metekhi: { x: 9999, z: 9999 },
  airport: project(41.6103, 41.5997),
};
export const DISTRICT_SOLIDS = BATUMI_SITES.flatMap((s) => {
  if (
    [
      "ali",
      "wheel",
      "medea",
      "alphabet",
      "lighthouse",
      "fountain",
      "chacha",
    ].includes(s.style)
  )
    return [
      {
        ...s,
        w: s.style === "wheel" ? 5 : s.w,
        d: s.style === "wheel" ? 5 : s.d,
        h: s.style === "wheel" ? 8 : s.style === "ali" ? 1 : s.h,
      },
    ];
  if (s.style === "twins")
    return [-1, 1].map((side) => ({ ...s, x: s.x + side * 24, w: 26, d: 38 }));
  return [s];
});
export const RETAINING_WALLS = [];
export const reservedDistrict = (p, padding = 0) =>
  inSea(p) ||
  riverDistance(p) < 30 + padding ||
  BATUMI_SITES.some(
    (s) =>
      Math.hypot(p.x - s.x, p.z - s.z) < Math.hypot(s.w, s.d) / 2 + padding + 9,
  );
