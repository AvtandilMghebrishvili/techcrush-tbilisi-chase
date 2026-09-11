export const GRID = 140;
export const GRID_RADIUS = 4;
export const ROAD_EDGE = GRID * GRID_RADIUS;
export const LIMIT = ROAD_EDGE + 58;
export const MAP_SIZE = (LIMIT + 32) * 2;
export const TOWER = { x: -70, z: 210 };
export const CARS = [
  {
    id: "gt",
    name: "Rustaveli GT",
    type: "SPORT COUPE",
    color: "#eecb39",
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
    name: "Mtatsminda Rally",
    type: "RALLY HATCH",
    color: "#3dd6ca",
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
    name: "Caucasus 4×4",
    type: "ARMORED SUV",
    color: "#cf4945",
    topSpeed: 43,
    acceleration: 13.5,
    handling: 0.86,
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
