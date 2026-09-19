// Original, reference-guided city extension. Metres in the existing Tbilisi frame.
// Existing road/node IDs are retained so saved event artifacts remain stable.
export const HEROES = { x: 0, z: 1050, radius: 110 };
export const FREEDOM = { x: -209, z: -623 };
export const KING_DAVID = { x: -280, z: 850, w: 102, d: 67 };
export const AXIS = { x: 110, z: 670, w: 123, d: 81 };
export const BANK_TARGET = { x: -755, z: 400 };
export const RIVERSIDE_BRIDGE_NAMES = [
  "Riverside North Bridge",
  "Riverside Central Bridge",
  "Riverside South Bridge",
];
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
    { x: -360, z: 600, w: 1480, d: 1280 },
    // Keep the already released artifact's quiet approach on the old street.
    { x: 1010, z: 1510, w: 350, d: 1120 },
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
  const south = polar(Math.PI, 225),
    west = polar(-Math.PI / 2, 225);
  // New playable blocks fill the owner's marked riverside gap. Original core
  // nodes/edges remain untouched; every crossing below has an explicit deck.
  road(
    [
      source.nodes[451],
      [170, 530],
      [240, 560],
      [240, 717],
      [100, 717],
      south,
      [30, 875],
      [22, 910],
      HEROES_RING[12],
    ],
    26,
    "Kostava · Heroes approach",
  );
  road([...HEROES_RING, HEROES_RING[0]], 24, "Heroes Square");
  road([HEROES_RING[18], west, [-385, 1050]], 24, "Heroes riverside approach");
  road(
    [HEROES_RING[0], [-230, 1160], [-385, 1050]],
    23,
    "Heroes waterfront loop",
  );
  road(
    [source.nodes[171], [-120, 450], [-150, 600], [-150, 717], [100, 717]],
    24,
    "Ilia Chavchavadze Avenue · Axis Towers",
  );
  road(
    [[-385, 805], [-120, 805], south],
    24,
    "Merab Aleksidze Street · King David",
  );
  road(
    [
      [-120, 805],
      [-150, 717],
    ],
    22,
    "Axis / King David link",
  );
  road(
    [source.nodes[445], [-270, 200], [-300, 350], [-120, 450]],
    22,
    "Riverside city link",
  );
  road(
    [
      [-300, 350],
      [-395, 350],
    ],
    22,
    "Quay south approach",
  );
  road(
    [
      [-150, 600],
      [-385, 600],
    ],
    24,
    "Quay central approach",
  );
  road(
    [
      source.nodes[502],
      [-505, 150],
      [-395, 350],
      [-385, 600],
      [-385, 805],
      [-385, 1000],
      [-385, 1050],
    ],
    26,
    "Mtkvari west-bank boulevard",
  );
  road(
    [
      source.nodes[545],
      [-810, -80],
      [-710, 150],
      [-690, 215],
      [-650, 350],
      [-636, 465],
      [-615, 600],
      [-615, 750],
      [-615, 1000],
    ],
    26,
    "Mtkvari east-bank boulevard",
  );
  road(
    [
      [-385, 1000],
      [-615, 1000],
    ],
    30,
    RIVERSIDE_BRIDGE_NAMES[0],
  );
  road(
    [
      [-385, 600],
      [-615, 600],
    ],
    30,
    RIVERSIDE_BRIDGE_NAMES[1],
  );
  road(
    [
      [-505, 150],
      [-710, 150],
    ],
    28,
    RIVERSIDE_BRIDGE_NAMES[2],
  );
  road(
    [
      [-615, 1000],
      [-785, 900],
      [-895, 750],
      [-970, 600],
      [-1000, 465],
      [-1020, 350],
      [-1060, 150],
      [-1000, -80],
      [-810, -80],
    ],
    24,
    "Riverside outer avenue",
  );
  road(
    [
      [-615, 750],
      [-780, 750],
      [-895, 750],
    ],
    22,
    "Riverside gardens street",
  );
  road(
    [
      [-615, 600],
      [-860, 600],
      [-970, 600],
    ],
    24,
    "Riverside central street",
  );
  road(
    [
      [-636, 465],
      [-860, 465],
      [-1000, 465],
    ],
    24,
    "Bank of Georgia esplanade",
  );
  road(
    [
      [-780, 750],
      [-860, 600],
      [-860, 465],
      [-860, 260],
      [-1060, 150],
    ],
    22,
    "Riverside neighbourhood street",
  );
  road(
    [
      [-860, 260],
      [-690, 215],
    ],
    20,
    "Bank riverside access",
  );
  // Retain the exact released artifact segment, without the old distant
  // landmark district. This quiet service loop carries no new building lots.
  road(
    [
      source.nodes[217],
      [880, 1130],
      [940, 1500],
      [1010, 1800],
      [1040, 1990],
      [1130, 1950],
      [1080, 1550],
      [880, 1130],
    ],
    23,
    "North service road",
  );
  road(FLYOVER_PATH, 14, FLYOVER_NAME);
  return { ...source, nodes, edges };
}
