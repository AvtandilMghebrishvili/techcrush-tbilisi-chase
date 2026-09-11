export const GRID = 140;
export const GRID_RADIUS = 4;
export const ROAD_EDGE = 1650;
export const LIMIT = 1900;
export const MAP_SIZE = (LIMIT + 32) * 2;
export const TOWER = { x: 1070, z: -430, y: 278 };
export const CARS = [
  {
    id: "gt",
    name: "Apex R",
    type: "STREET SPEC",
    color: "#c91820",
    topSpeed: 58,
    acceleration: 22,
    width: 1.96,
    length: 4.5,
    handling: 1,
    damageScale: 1,
    description: "Rounded rear-engine coupe · agile and balanced",
    speedRating: 5,
    gripRating: 3,
    armorRating: 2,
  },
  {
    id: "rally",
    name: "Vector V12",
    type: "TRACK SPEC",
    color: "#eac735",
    topSpeed: 67,
    acceleration: 28,
    width: 2.08,
    length: 4.8,
    handling: 1.18,
    damageScale: 0.8,
    description: "Low angular V12 · sharp turns and hard acceleration",
    speedRating: 4,
    gripRating: 5,
    armorRating: 3,
  },
  {
    id: "suv",
    name: "Veyra W16",
    type: "REINFORCED GT",
    color: "#8da6bb",
    topSpeed: 75,
    acceleration: 32,
    width: 2.15,
    length: 5,
    handling: 0.9,
    damageScale: 0.55,
    description: "Wide hypercar · highest speed and reinforced body",
    speedRating: 3,
    gripRating: 3,
    armorRating: 5,
  },
];
export function carSpec(id) {
  return CARS.find((c) => c.id === id) || CARS[0];
}
export const CAMERAS = [
  { id: "chase", label: "CHASE" },
  { id: "cockpit", label: "COCKPIT" },
  { id: "hood", label: "HOOD" },
  { id: "aerial", label: "HIGH CHASE" },
];
