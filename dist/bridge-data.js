import { ROAD_DATA } from "./road-data.js";
import { LANDMARKS, RIVER_BANKS } from "./district-data.js";

// Deck and barrier dimensions are shared with the renderer.
export const BRIDGE_DECKS = [
  {
    name: "BARATASHVILI BRIDGE",
    x: -770.57,
    z: -237.75,
    angle: -1.45,
    length: 145,
    width: 31,
  },
  ...ROAD_DATA.edges
    .filter((r) => r[3] === "Metekhi Bridge")
    .map(([a, b, width]) => {
      const p = ROAD_DATA.nodes[a],
        q = ROAD_DATA.nodes[b],
        dx = q[0] - p[0],
        dz = q[1] - p[1];
      return {
        name: "METEKHI BRIDGE",
        x: (p[0] + q[0]) / 2,
        z: (p[1] + q[1]) / 2,
        angle: Math.atan2(dx, dz),
        length: Math.hypot(dx, dz) + 1,
        width: width + 2,
      };
    }),
];
export const PEACE_DECK = {
  name: "PEACE BRIDGE",
  x: LANDMARKS.peace.x,
  z: LANDMARKS.peace.z,
  angle: Math.PI / 2 + 0.12,
  length: 150,
  width: 8,
};
export const BANK_CAPS = RIVER_BANKS.flatMap((bank) =>
  bank.slice(1).map((b, i) => {
    const a = bank[i];
    return {
      x: (a[0] + b[0]) / 2,
      z: (a[1] + b[1]) / 2,
      width: 2.6,
      length: Math.hypot(b[0] - a[0], b[1] - a[1]),
      angle: Math.atan2(b[0] - a[0], b[1] - a[1]),
    };
  }),
);
const rails = [...BRIDGE_DECKS, PEACE_DECK].flatMap((b) =>
  [-1, 1].map((side) => ({
    x: b.x + Math.cos(b.angle) * side * (b.width / 2 - 0.2),
    z: b.z - Math.sin(b.angle) * side * (b.width / 2 - 0.2),
    w: 0.34,
    d: b.length,
    h: 1.5,
    angle: b.angle,
    barrier: true,
    name: b.name,
  })),
);
// Leave road-width openings at the bank junctions. Rendering uses these exact
// segments too, so every visible railing is solid and none blocks a legal exit.
const crossingRoads = ROAD_DATA.edges.map(([a, b, width]) => {
  const p = ROAD_DATA.nodes[a],
    q = ROAD_DATA.nodes[b],
    dx = q[0] - p[0],
    dz = q[1] - p[1];
  return {
    x: p[0],
    z: p[1],
    dx,
    dz,
    width,
    len: Math.hypot(dx, dz),
    angle: Math.atan2(dx, dz),
  };
});
const railSpans = rails.flatMap((rail) => {
  const pieces = [],
    count = Math.ceil(rail.d),
    step = rail.d / count;
  let start = null;
  const point = (t) => ({
    x: rail.x + Math.sin(rail.angle) * t,
    z: rail.z + Math.cos(rail.angle) * t,
  });
  for (let i = 0; i <= count; i++) {
    const t = -rail.d / 2 + (i + 0.5) * step,
      p = point(t);
    const crossing =
      i === count ||
      crossingRoads.some((r) => {
        if (Math.abs(Math.cos(r.angle - rail.angle)) > 0.94) return false;
        const u = Math.max(
          0,
          Math.min(
            1,
            ((p.x - r.x) * r.dx + (p.z - r.z) * r.dz) / (r.len * r.len),
          ),
        );
        return (
          Math.hypot(p.x - r.x - r.dx * u, p.z - r.z - r.dz * u) <
          r.width / 2 + 1
        );
      });
    if (!crossing && start === null) start = -rail.d / 2 + i * step;
    if (crossing && start !== null) {
      const end = -rail.d / 2 + i * step;
      if (end - start > 0.5)
        pieces.push({ ...rail, ...point((start + end) / 2), d: end - start });
      start = null;
    }
  }
  return pieces;
});
// Local fracture panels leave the rest of the bridge intact. Normal speed,
// not glancing travel speed, must exceed 122 km/h to break a section.
export const BRIDGE_BARRIERS = railSpans
  .flatMap((rail) => {
    const count = Math.ceil(rail.d / 6),
      d = rail.d / count;
    return Array.from({ length: count }, (_, i) => {
      const t = -rail.d / 2 + d * (i + 0.5);
      return {
        ...rail,
        x: rail.x + Math.sin(rail.angle) * t,
        z: rail.z + Math.cos(rail.angle) * t,
        d,
        breakSpeed: 34,
      };
    });
  })
  .map((rail, id) => ({ ...rail, id }));
