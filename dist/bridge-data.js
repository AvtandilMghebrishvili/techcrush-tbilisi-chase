import { RIVERSIDE_BRIDGE_NAMES } from "./tbilisi-civic-layout.js";
import { onMetekhiLayby, LAYBY_RAILS } from "./metekhi-layby.js";
import { onAsphalt } from "./road-clearance.js";
import { IS_KUTAISI, IS_BATUMI, IS_RUSTAVI } from "./map-selection.js";
const { KUTAISI_GEO } = IS_KUTAISI ? await import("./kutaisi-geo-data.js") : {};
const { RUSTAVI_GEO } = IS_RUSTAVI ? await import("./rustavi-geo-data.js") : {};
import { ROAD_DATA } from "./road-data.js";
import { LANDMARKS, RIVER_BANKS } from "./district-data.js";

// Deck and barrier dimensions are shared with the renderer.
export const BRIDGE_DECKS = IS_RUSTAVI
  ? RUSTAVI_GEO.bridges
  : IS_BATUMI
    ? []
    : IS_KUTAISI
      ? KUTAISI_GEO.bridges.filter((b) => b.name !== "WHITE BRIDGE")
      : [
          {
            name: "BARATASHVILI BRIDGE",
            x: -770.57,
            z: -237.75,
            angle: -1.45,
            length: 145,
            width: 31,
          },
          ...ROAD_DATA.edges
            .filter(
              (r) =>
                r[3] === "Metekhi Bridge" ||
                RIVERSIDE_BRIDGE_NAMES.includes(r[3]),
            )
            .map(([a, b, width, name]) => {
              const p = ROAD_DATA.nodes[a],
                q = ROAD_DATA.nodes[b],
                dx = q[0] - p[0],
                dz = q[1] - p[1];
              return {
                name: name.toUpperCase(),
                x: (p[0] + q[0]) / 2,
                z: (p[1] + q[1]) / 2,
                angle: Math.atan2(dx, dz),
                length: Math.hypot(dx, dz) + 1,
                width: width + 2,
              };
            }),
        ];
export const PEACE_DECK =
  IS_BATUMI || IS_RUSTAVI
    ? { name: "NO BRIDGE", x: 9999, z: 9999, width: 1, length: 1, angle: 0 }
    : IS_KUTAISI
      ? KUTAISI_GEO.bridges.find((b) => b.name === "WHITE BRIDGE")
      : {
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
    bridgeRail: true,
    deckX: b.x,
    deckZ: b.z,
    deckLength: b.length,
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
      onAsphalt(p) ||
      onMetekhiLayby(p, 0.2) ||
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
// Local panels keep the rest intact; shared angle-aware rules soften entrances.
export const BRIDGE_BARRIERS = [...railSpans, ...LAYBY_RAILS]
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
        breakSpeed: 50,
        entrance:
          rail.deckLength / 2 -
            Math.abs(
              (rail.x - rail.deckX) * Math.sin(rail.angle) +
                (rail.z - rail.deckZ) * Math.cos(rail.angle) +
                t,
            ) <
          Math.min(30, rail.deckLength * 0.22),
      };
    });
  })
  .map((rail, id) => ({ ...rail, id }));
