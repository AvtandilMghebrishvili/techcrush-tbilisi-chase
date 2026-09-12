import { KUTAISI_GEO } from "./kutaisi-geo-data.js";
import { placeOffRoad, overlapsRoad } from "./map-clearance.js";
export const project = (lat, lon) => ({
  x: -(lon - 42.704) * 82380,
  z: (lat - 42.269) * 111320,
});
export const RIVER = KUTAISI_GEO.river.map(([x, z]) => ({ x, z }));
export function riverDistance(p) {
  let d = Infinity;
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
    d = Math.min(d, Math.hypot(p.x - a.x - dx * u, p.z - a.z - dz * u));
  }
  return d;
}
export const RIVER_BANKS = [[], []];
RIVER.forEach((p, i) => {
  const a = RIVER[Math.max(0, i - 1)],
    b = RIVER[Math.min(RIVER.length - 1, i + 1)],
    d = Math.hypot(b.x - a.x, b.z - a.z);
  const half =
    p.z > 300 ? 24 : p.z > -100 ? 32 : Math.min(69, 32 + (-p.z - 100) * 0.07);
  for (const [j, s] of [
    [0, 1],
    [1, -1],
  ])
    RIVER_BANKS[j].push([
      p.x + ((b.z - a.z) / d) * half * s,
      p.z - ((b.x - a.x) / d) * half * s,
    ]);
});
export const RIVER_POLYGON = [
  ...RIVER_BANKS[0],
  ...RIVER_BANKS[1].slice().reverse(),
  RIVER_BANKS[0][0],
];
const point = (name, lat, lon, w, d, h, style, angle = 0) => ({
  name,
  ...project(lat, lon),
  w,
  d,
  h,
  style,
  angle,
});
export const KUTAISI_SITES = [
  {
    ...KUTAISI_GEO.features.fountain,
    name: "COLCHIS FOUNTAIN",
    w: 25,
    d: 25,
    h: 7,
    style: "fountain",
    angle: 0,
  },
  point("LADO MESKHISHVILI THEATRE", 42.2721, 42.70545, 68, 35, 19, "theatre"),
  point(
    "BAGRATI CATHEDRAL",
    42.27729,
    42.70439,
    40,
    56,
    49,
    "cathedral",
    -0.03,
  ),
  point("OPERA & BALLET THEATRE", 42.27059, 42.70268, 51, 26, 17, "opera"),
  point("OKROS CHARDAKHI", 42.26997, 42.70062, 20, 14, 11, "palace"),
  point("GREEN BAZAAR", 42.27229, 42.701, 46, 32, 13, "market"),
  point("KUTAISI SYNAGOGUE", 42.27399, 42.70728, 25, 34, 20, "synagogue"),
  point("ROYAL QUARTER", 42.2689, 42.70218, 22, 27, 21, "royal"),
];
// Landmarks retain their observed neighbourhood; widened arcade carriageways
// take priority over facade corners. Renderer and collisions share these solids.
for (const p of KUTAISI_SITES) {
  const loc = placeOffRoad(
    p,
    [{ x: 0, z: 0, w: p.w + 2, d: p.d + 2, angle: p.angle }],
    (q) => riverDistance(q) > 42,
  );
  p.x = loc.x;
  p.z = loc.z;
}
const fountain = KUTAISI_SITES[0],
  bagrati = KUTAISI_SITES[2];
export const LANDMARKS = {
  ...KUTAISI_GEO.features,
  fountain,
  bagrati,
  rike: project(42.2785, 42.7103),
  tubes: { x: 9999, z: 9999 },
  peace: {
    x: KUTAISI_GEO.bridges.find((b) => b.name === "WHITE BRIDGE").x,
    z: KUTAISI_GEO.bridges.find((b) => b.name === "WHITE BRIDGE").z,
  },
  mother: { x: 9999, z: 9999 },
  narikala: { x: 9999, z: 9999 },
  metekhi: { x: 9999, z: 9999 },
  park: project(42.27145, 42.6954),
  boulevard: project(42.271, 42.7035),
};
export function reservedDistrict(p, padding = 0) {
  return (
    riverDistance(p) < 76 + padding ||
    KUTAISI_SITES.some(
      (s) =>
        Math.hypot(p.x - s.x, p.z - s.z) <
        Math.hypot(s.w, s.d) / 2 + padding + 6,
    ) ||
    Math.hypot(p.x - LANDMARKS.boulevard.x, p.z - LANDMARKS.boulevard.z) <
      67 + padding ||
    ((p.x - LANDMARKS.rike.x) / 100) ** 2 +
      ((p.z - LANDMARKS.rike.z) / 150) ** 2 <
      1 ||
    Math.hypot(p.x - LANDMARKS.park.x, p.z - LANDMARKS.park.z) < 82 + padding
  );
}
export const RETAINING_WALLS = [];
export const DISTRICT_SOLIDS = KUTAISI_SITES.flatMap((s) => {
  const common = { angle: s.angle, landmark: true, kutaisi: true };
  if (s.style === "fountain")
    return [
      {
        ...common,
        x: s.x,
        z: s.z,
        w: s.w,
        d: s.d,
        h: 1.4,
        base: 0,
        cylinder: { radius: s.w / 2 },
      },
    ];
  if (s.style === "cathedral")
    return [
      { ...common, x: s.x, z: s.z, w: 40, d: 56, h: 4 },
      { ...common, x: s.x, z: s.z, w: 25, d: 51, base: 4, h: 29 },
      { ...common, x: s.x, z: s.z, w: 38, d: 20, base: 4, h: 29 },
    ];
  return [{ ...s, ...common, cornices: [s.h * 0.5, s.h + 0.3] }];
});
