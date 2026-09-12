import { STUNT_APRONS } from "../dist/world-sites.js";
import { IS_KUTAISI } from "../dist/map-selection.js";
import { BRIDGE_DECKS, PEACE_DECK, BANK_CAPS } from "../dist/bridge-data.js";
import ClipperLib from "clipper-lib";
import { writeFile } from "node:fs/promises";
import { ROADS, NODES } from "../dist/city-map.js";
import { RIVER_POLYGON } from "../dist/district-data.js";
function network(padding) {
  const polygons = ROADS.map((r) => {
    const rx = Math.cos(r.angle) * (r.width / 2 + padding),
      rz = -Math.sin(r.angle) * (r.width / 2 + padding);
    return [
      [
        [r.start.x + rx, r.start.z + rz],
        [r.end.x + rx, r.end.z + rz],
        [r.end.x - rx, r.end.z - rz],
        [r.start.x - rx, r.start.z - rz],
      ],
    ];
  });
  for (const n of NODES) {
    const radius =
      Math.max(...n.links.map((l) => ROADS[l.road].width)) / 2 + padding;
    polygons.push([
      Array.from({ length: 24 }, (_, i) => [
        n.x + Math.cos((i * Math.PI) / 12) * radius,
        n.z + Math.sin((i * Math.PI) / 12) * radius,
      ]),
    ]);
  }
  for (const a of STUNT_APRONS)
    polygons.push([
      [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([sx, sz]) => [
        a.x +
          Math.cos(a.angle) * sx * (a.w / 2 + padding) +
          Math.sin(a.angle) * sz * (a.d / 2 + padding),
        a.z -
          Math.sin(a.angle) * sx * (a.w / 2 + padding) +
          Math.cos(a.angle) * sz * (a.d / 2 + padding),
      ]),
    ]);
  return clip(polygons, [], "ctUnion");
}
function clip(subject, other, operation) {
  const c = new ClipperLib.Clipper(),
    result = new ClipperLib.PolyTree();
  const paths = (polygons) =>
    polygons.flat().map((r) =>
      r.map(([x, y]) => ({
        X: Math.round(x * 1000),
        Y: Math.round(y * 1000),
      })),
    );
  c.AddPaths(paths(subject), ClipperLib.PolyType.ptSubject, true);
  if (other.length) c.AddPaths(paths(other), ClipperLib.PolyType.ptClip, true);
  c.Execute(
    ClipperLib.ClipType[operation],
    result,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  );
  return ClipperLib.JS.PolyTreeToExPolygons(result).map((p) =>
    [p.outer, ...p.holes].map((r) => {
      const ring = r.map((p) => [p.X / 1000, p.Y / 1000]);
      ring.push(ring[0]);
      return ring;
    }),
  );
}
const asphalt = network(0),
  sidewalk = clip(network(4.5), asphalt, "ctDifference");
const ground = clip(
  [
    [
      [
        [-2400, -2400],
        [2400, -2400],
        [2400, 2400],
        [-2400, 2400],
        [-2400, -2400],
      ],
    ],
  ],
  [[RIVER_POLYGON]],
  "ctDifference",
);
const supportRects = [...BRIDGE_DECKS, PEACE_DECK, ...BANK_CAPS].map((b) => [
  [
    ...[
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([sx, sz]) => [
      b.x +
        (Math.cos(b.angle) * sx * b.width) / 2 +
        (Math.sin(b.angle) * sz * b.length) / 2,
      b.z -
        (Math.sin(b.angle) * sx * b.width) / 2 +
        (Math.cos(b.angle) * sz * b.length) / 2,
    ]),
  ],
]);
// Physics uses exactly the rendered bank caps, road/sidewalk surfaces and decks.
const openWater = clip(
  [[RIVER_POLYGON]],
  [...network(4.5), ...supportRects],
  "ctDifference",
);
const rounded = JSON.parse(
  JSON.stringify({ asphalt, sidewalk, ground, openWater }, (_, v) =>
    typeof v === "number" ? +v.toFixed(4) : v,
  ),
);
await writeFile(
  IS_KUTAISI
    ? "dist/kutaisi-road-surface-data.js"
    : "dist/tbilisi-road-surface-data.js",
  "// Derived from OpenStreetMap road-data.js; ODbL 1.0. Rebuild with scripts/build-road-surface.mjs.\nexport const ROAD_SURFACE = " +
    JSON.stringify(rounded) +
    ";\n",
);
console.log(
  "Unified road surface:",
  asphalt.length,
  "components,",
  asphalt.reduce((n, p) => n + p.length - 1, 0),
  "block islands",
);
