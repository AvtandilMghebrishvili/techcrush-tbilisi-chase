import {
  HEROES,
  FREEDOM,
  KING_DAVID,
  AXIS,
  CIVIC_RESERVES,
  FLYOVER_PATH,
} from "./tbilisi-civic-layout.js";
import {
  footprintsOverlap,
  overlapsRoad,
  placeOffRoad,
} from "./map-clearance.js";
export { HEROES, FREEDOM, KING_DAVID, AXIS };
export const TOWER_PARTS = [];
// The slab-by-slab collision footprints follow both opposite twists exactly.
for (const [i, dx] of [-34, 34].entries()) {
  TOWER_PARTS.push({
    x: AXIS.x + dx,
    z: AXIS.z,
    w: 53,
    d: 61,
    base: 0,
    h: 8,
    angle: 0,
    style: "podium",
  });
  for (let f = 0; f < 37; f++)
    TOWER_PARTS.push({
      x: AXIS.x + dx,
      z: AXIS.z,
      w: 37,
      d: 39,
      base: 8 + f * 3.7,
      h: 8 + (f + 1) * 3.7,
      angle: ((i ? -1 : 1) * (f * 2 - 36) * Math.PI) / 180,
      style: i ? "axis-stone" : "axis-glass",
      floor: f,
    });
}
// Rounded rectangle towers are represented by a center and side strips, not a large enclosing box.
export const KING_TOWERS = [
  {
    x: KING_DAVID.x - 28,
    z: KING_DAVID.z,
    w: 43,
    d: 43,
    floors: 32,
    height: 112,
  },
  {
    x: KING_DAVID.x + 32,
    z: KING_DAVID.z + 7,
    w: 39,
    d: 40,
    floors: 19,
    height: 68,
  },
];
for (const t of KING_TOWERS) {
  TOWER_PARTS.push({
    x: t.x,
    z: t.z,
    w: t.w - 10,
    d: t.d,
    base: 0,
    h: t.height,
    angle: 0,
    style: "king-solid",
  });
  TOWER_PARTS.push({
    x: t.x,
    z: t.z,
    w: t.w,
    d: t.d - 10,
    base: 0,
    h: t.height,
    angle: 0,
    style: "king-solid",
  });
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      TOWER_PARTS.push({
        x: t.x + sx * (t.w / 2 - 5),
        z: t.z + sz * (t.d / 2 - 5),
        w: 10,
        d: 10,
        base: 0,
        h: t.height,
        angle: 0,
        cylinder: { radius: 5 },
        style: "king-solid",
      });
}
export const HALL = {
  ...placeOffRoad({ x: FREEDOM.x, z: FREEDOM.z - 115 }, [
    { x: 0, z: 0, w: 82, d: 22, angle: 0 },
  ]),
  w: 82,
  d: 22,
  h: 19,
  angle: 0,
};
export const FLYOVER_PIERS = [];
for (let i = 3; i < FLYOVER_PATH.length - 3; i += 4) {
  const p = FLYOVER_PATH[i],
    q = FLYOVER_PATH[i + 1];
  const angle = Math.atan2(q[0] - p[0], q[1] - p[1]);
  for (const side of [-1, 1]) {
    const b = {
      x: p[0] + Math.cos(angle) * side * 10,
      z: p[1] - Math.sin(angle) * side * 10,
      w: 2.2,
      d: 3.4,
      base: 0,
      h: p[2] - 0.5,
      angle,
    };
    if (!overlapsRoad(b, 2)) FLYOVER_PIERS.push(b);
  }
}
export const FLYOVER_RAILS = [];
for (let i = 1; i < FLYOVER_PATH.length; i++) {
  const a = FLYOVER_PATH[i - 1],
    b = FLYOVER_PATH[i],
    length = Math.hypot(b[0] - a[0], b[1] - a[1]),
    angle = Math.atan2(b[0] - a[0], b[1] - a[1]);
  // Open the low-speed merge mouths; a barrier here would bisect the ground lane.
  if (Math.max(a[2] || 0, b[2] || 0) < 1.8) continue;
  for (const side of [-1, 1])
    FLYOVER_RAILS.push({
      id: `heroes-flyover-${i}-${side}`,
      barrier: true,
      breakSpeed: 50,
      entrance: Math.min(a[2] || 0, b[2] || 0) < 4.5,
      side,
      x: (a[0] + b[0]) / 2 + Math.cos(angle) * side * 7.15,
      z: (a[1] + b[1]) / 2 - Math.sin(angle) * side * 7.15,
      w: 0.38,
      d: length + 0.2,
      angle,
      base: Math.min(a[2] || 0, b[2] || 0),
      h: Math.max(a[2] || 0, b[2] || 0) + 1.05,
      slope: { a: a[2] || 0, b: b[2] || 0, length },
      flyoverRail: true,
    });
}
export const CIVIC_SOLIDS = [
  ...TOWER_PARTS,
  ...FLYOVER_PIERS,
  ...FLYOVER_RAILS,
  HALL,
  { x: HALL.x, z: HALL.z, w: 9, d: 9, base: 19, h: 38, angle: 0 },
  { ...FREEDOM, w: 13, d: 13, h: 2.3, angle: 0, cylinder: { radius: 6.5 } },
  {
    ...FREEDOM,
    w: 4.8,
    d: 4.8,
    base: 2.3,
    h: 31,
    angle: 0,
    cylinder: { radius: 2.4 },
  },
  { ...HEROES, w: 9, d: 9, h: 48, angle: 0 },
  { ...HEROES, w: 26, d: 26, h: 0.45, angle: 0, cylinder: { radius: 13 } },
].map((b) => ({ ...b, landmark: true, civic: true }));
export function reservedCivic(rect) {
  return [...CIVIC_RESERVES, HALL].some((s) => footprintsOverlap(rect, s, 5));
}
