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
export const DISTRICT_SOLIDS = [
  ...[-1, 1].map((s) => ({
    x: LANDMARKS.tubes.x - 13,
    z: LANDMARKS.tubes.z + s * 26,
    w: 91,
    d: 31,
    h: 39,
    angle: s * 0.32,
    landmark: true,
  })),
  ...[
    [-22, -12, 7],
    [-5, -15, 6],
    [13, -14, 7],
    [-22, 9, 6],
    [-5, 10, 7],
    [14, 10, 6],
    [31, -3, 5],
  ].map(([x, z, r]) => ({
    x: LANDMARKS.baths.x + x,
    z: LANDMARKS.baths.z + z,
    w: r * 2,
    d: r * 2,
    h: 7,
    angle: 0,
    landmark: true,
  })),
  {
    x: LANDMARKS.baths.x - 5,
    z: LANDMARKS.baths.z + 35,
    w: 27,
    d: 5,
    h: 19,
    angle: 0,
    landmark: true,
  },
  {
    x: LANDMARKS.metekhi.x,
    z: LANDMARKS.metekhi.z,
    w: 35,
    d: 38,
    h: 58,
    angle: 0,
    landmark: true,
  },
];
