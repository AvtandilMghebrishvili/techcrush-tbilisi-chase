import { ROAD_DATA } from "./road-data.js";
import { LANDMARKS } from "./district-data.js";

// Deck and barrier dimensions are shared with the renderer; railings never break.
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
const peace = {
  name: "PEACE BRIDGE",
  x: LANDMARKS.peace.x,
  z: LANDMARKS.peace.z,
  angle: Math.PI / 2 + 0.12,
  length: 150,
  width: 8,
};
const rails = [...BRIDGE_DECKS, peace].flatMap((b) =>
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
export const BRIDGE_BARRIERS = rails.flatMap((rail) => {
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
