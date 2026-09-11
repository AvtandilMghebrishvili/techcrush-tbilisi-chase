export const GRID = 140;
export const GRID_RADIUS = 4;
export const ROAD_EDGE = 1650;
export const LIMIT = 1900;
export const MAP_SIZE = (LIMIT + 32) * 2;
export const TOWER = { x: 1070, z: -430, y: 278 };
export const CARS = [
  {
    id: "gt",
    name: "458 Stradale",
    type: "STREET SPEC",
    color: "#c91820",
    topSpeed: 50,
    acceleration: 16,
    handling: 1,
    damageScale: 1,
    description: "Fast on the straights",
    speedRating: 5,
    gripRating: 3,
    armorRating: 2,
  },
  {
    id: "rally",
    name: "458 Track",
    type: "TRACK SPEC",
    color: "#eac735",
    topSpeed: 47,
    acceleration: 18,
    handling: 1.18,
    damageScale: 0.8,
    description: "Quick off the line. Sharp in turns.",
    speedRating: 4,
    gripRating: 5,
    armorRating: 3,
  },
  {
    id: "suv",
    name: "458 Touring",
    type: "REINFORCED GT",
    color: "#8da6bb",
    topSpeed: 45,
    acceleration: 14.5,
    handling: 0.9,
    damageScale: 0.55,
    description: "Built to take a hit",
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
