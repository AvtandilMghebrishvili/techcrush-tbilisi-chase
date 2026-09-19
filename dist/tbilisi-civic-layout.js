// Original, reference-guided city extension. Metres in the existing Tbilisi frame.
// Existing road/node IDs are retained so saved event artifacts remain stable.
export const HEROES = { x: 975, z: 1160, radius: 110 };
export const FREEDOM = { x: -209, z: -623 };
export const KING_DAVID = { x: 980, z: 1420, w: 102, d: 67 };
export const AXIS = { x: 1210, z: 1035, w: 123, d: 81 };
export const FLYOVER_NAME = "Heroes Square Flyover";
const polar = (a, r, y = 0) => [
  HEROES.x + Math.sin(a) * r,
  HEROES.z + Math.cos(a) * r,
  y,
];
export const HEROES_RING = Array.from({ length: 24 }, (_, i) =>
  polar((i * Math.PI) / 12, HEROES.radius),
);
const approach = (points, startHeight, endHeight) =>
  Array.from({ length: 17 }, (_, i) => {
    const t = i / 16,
      u = 1 - t;
    return [
      HEROES.x +
        u * u * u * points[0][0] +
        3 * u * u * t * points[1][0] +
        3 * u * t * t * points[2][0] +
        t * t * t * points[3][0],
      HEROES.z +
        u * u * u * points[0][1] +
        3 * u * u * t * points[1][1] +
        3 * u * t * t * points[2][1] +
        t * t * t * points[3][1],
      startHeight + (endHeight - startHeight) * t * t * (3 - 2 * t),
    ];
  });
export const FLYOVER_PATH = [
  ...approach(
    [
      [0, -225],
      [0, -155],
      [-65, -77],
      [0, -77],
    ],
    0,
    7.4,
  ).slice(0, -1),
  ...Array.from({ length: 37 }, (_, i) =>
    polar(Math.PI - (i * Math.PI) / 24, 77, 7.4),
  ),
  ...approach(
    [
      [-77, 0],
      [-77, -65],
      [-155, 0],
      [-225, 0],
    ],
    7.4,
    0,
  ).slice(1),
];
export const CIVIC_RESERVES = [
  { ...HEROES, w: 285, d: 285, angle: 0 },
  { ...KING_DAVID, w: 122, d: 89, angle: 0 },
  // Reserve the complete street frontage, including the open forecourt.
  { ...AXIS, z: AXIS.z + 7, w: 158, d: 110, angle: 0 },
  { ...FREEDOM, w: 25, d: 25, angle: 0 },
];
export function civicGroundClearance(x, z) {
  let distance = Infinity;
  // Grade the complete developed district, with a broad transition into hills.
  // Tiny per-building cutouts create vertical cliffs and bury adjoining blocks.
  for (const site of [
    ...CIVIC_RESERVES,
    { x: 1020, z: 1220, w: 780, d: 790 },
    // Keep the already released artifact's quiet approach on the old street.
    { x: 1030, z: 1710, w: 140, d: 640 },
  ])
    distance = Math.min(
      distance,
      Math.hypot(
        Math.max(0, Math.abs(x - site.x) - site.w / 2),
        Math.max(0, Math.abs(z - site.z) - site.d / 2),
      ),
    );
  const t = Math.max(0, Math.min(1, distance / 320));
  return t * t * (3 - 2 * t);
}
export function extendTbilisiNetwork(source) {
  const nodes = source.nodes.map((p) => [...p]),
    edges = source.edges.map((e) => [...e]);
  const node = (p) => {
    const id = nodes.findIndex(
      (q) =>
        Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.5 &&
        Math.abs((q[2] || 0) - (p[2] || 0)) < 0.2,
    );
    if (id >= 0) return id;
    return nodes.push([...p]) - 1;
  };
  const road = (points, width, name) => {
    const ids = points.map(node);
    for (let i = 1; i < ids.length; i++)
      if (ids[i] !== ids[i - 1]) edges.push([ids[i - 1], ids[i], width, name]);
  };
  const north = source.nodes[217]; // Merab Kostava endpoint in the archived graph.
  const south = polar(Math.PI, 225),
    west = polar(-Math.PI / 2, 225);
  road(
    [north, [900, 930], south, [1005, 985], [997, 1020], HEROES_RING[12]],
    26,
    "Merab Kostava Avenue · Heroes approach",
  );
  road([...HEROES_RING, HEROES_RING[0]], 24, "Heroes Square");
  road(
    [
      HEROES_RING[18],
      west,
      [750, 1320],
      [850, 1378],
      [1110, 1378],
      [1150, 1300],
      HEROES_RING[0],
    ],
    23,
    "Merab Aleksidze Street · King David",
  );
  road(
    [HEROES_RING[6], [1310, 1160], [1310, 1082], [1100, 1082], south],
    25,
    "Ilia Chavchavadze Avenue · Axis Towers",
  );
  road([source.nodes[581], [650, 1030], west], 22, "Chabua Amirejibi Highway");
  // A second connection to the existing city avoids a single long access road.
  road([source.nodes[213], [900, 930]], 22, "Kostava connector");
  // This section hosts an existing event artifact. Its road and collectible
  // stay exactly where released, even though the landmarks move south.
  road(
    [
      [1110, 1378],
      [1185, 1500],
      [1080, 1660],
      [1010, 1800],
      [1040, 1990],
      [1180, 1990],
      [1220, 1750],
      [1185, 1500],
    ],
    23,
    "Aleksidze · hillside loop",
  );
  road(FLYOVER_PATH, 14, FLYOVER_NAME);
  return { ...source, nodes, edges };
}
