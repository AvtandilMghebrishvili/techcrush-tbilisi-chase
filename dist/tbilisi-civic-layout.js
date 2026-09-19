// Original, reference-guided city extension. Metres in the existing Tbilisi frame.
// Existing road/node IDs are retained so saved event artifacts remain stable.
export const HEROES = { x: 1420, z: 1660, radius: 110 };
export const FREEDOM = { x: -209, z: -623 };
export const KING_DAVID = { x: 1170, z: 2100, w: 102, d: 67 };
export const AXIS = { x: 2650, z: 1280, w: 123, d: 81 };
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
  { ...AXIS, w: 143, d: 103, angle: 0 },
  { ...FREEDOM, w: 25, d: 25, angle: 0 },
];
export function civicGroundClearance(x, z) {
  let distance = Infinity;
  // Grade the complete developed district, with a broad transition into hills.
  // Tiny per-building cutouts create vertical cliffs and bury adjoining blocks.
  for (const site of [
    ...CIVIC_RESERVES,
    { x: 1900, z: 1775, w: 2360, d: 1570 },
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
    [
      north,
      [945, 1110],
      [1080, 1240],
      [1260, 1360],
      south,
      [1450, 1485],
      [1442, 1520],
      HEROES_RING[12],
    ],
    26,
    "Merab Kostava Avenue · Heroes approach",
  );
  road([...HEROES_RING, HEROES_RING[0]], 24, "Heroes Square");
  road(
    [
      HEROES_RING[18],
      west,
      [1080, 1660],
      [1010, 1800],
      [1040, 1990],
      [1040, 2185],
      [1300, 2240],
      [1550, 2150],
      HEROES_RING[0],
    ],
    23,
    "Merab Aleksidze Street · King David",
  );
  road(
    [
      HEROES_RING[6],
      [1600, 1660],
      [1730, 1490],
      [1950, 1400],
      [2260, 1380],
      [2530, 1380],
      [2780, 1380],
      [2860, 1230],
      [2720, 1120],
      [2440, 1135],
      [2180, 1200],
      [1950, 1400],
    ],
    25,
    "Ilia Chavchavadze Avenue · Axis Towers",
  );
  road(
    [HEROES_RING[6], [1690, 1610], [1730, 1490]],
    22,
    "Chabua Amirejibi Highway",
  );
  road(FLYOVER_PATH, 14, FLYOVER_NAME);
  return { ...source, nodes, edges };
}
