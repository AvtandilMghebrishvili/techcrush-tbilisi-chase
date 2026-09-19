import { IS_KUTAISI, IS_BATUMI, IS_RUSTAVI } from "./map-selection.js";
export const GRID = 140;
export const GRID_RADIUS = 4;
export const ROAD_EDGE = IS_KUTAISI || IS_BATUMI || IS_RUSTAVI ? 1650 : 3000;
export const LIMIT = IS_RUSTAVI
  ? 2600
  : IS_BATUMI
    ? 3000
    : IS_KUTAISI
      ? 2100
      : 3100;
export const MAP_SIZE = (LIMIT + 32) * 2;
export const TOWER = { x: 1070, z: -430, y: 278 };
export const CARS = [
  {
    id: "classic",
    name: "Original 458",
    type: "HERITAGE",
    color: "#eac735",
    topSpeed: 64,
    acceleration: 25,
    width: 1.98,
    length: 4.65,
    handling: 1.06,
    damageScale: 0.85,
    description: "The original detailed 458 · restored alongside the new cars",
    speedRating: 4,
    gripRating: 4,
    armorRating: 3,
  },
  {
    id: "gt",
    name: "Apex R",
    type: "REAR-ENGINE COUPE",
    color: "#c91820",
    topSpeed: 58,
    acceleration: 22,
    width: 1.96,
    length: 4.5,
    handling: 1,
    damageScale: 1,
    description: "Rounded rear-engine coupe · agile and balanced",
    speedRating: 3,
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
    description: "Sculpted W16 luxury hypercar · planted and reinforced",
    speedRating: 5,
    gripRating: 3,
    armorRating: 5,
  },
  {
    id: "falcon",
    name: "Falcon RS",
    type: "RALLY HOT HATCH",
    color: "#ff683a",
    topSpeed: 73,
    acceleration: 31,
    width: 2.02,
    length: 4.7,
    handling: 1.12,
    damageScale: 0.73,
    description:
      "Any city level 10 · tall rally hatch, twin lamps and factory wing",
    speedRating: 5,
    gripRating: 5,
    armorRating: 3,
  },
  {
    id: "rioni",
    name: "Rioni GT",
    type: "LONG-HOOD GT",
    color: "#56d7b0",
    topSpeed: 77,
    acceleration: 32,
    width: 2.04,
    length: 5.15,
    handling: 1.04,
    damageScale: 0.65,
    description: "Any city level 10 · long-hood grand tourer",
    speedRating: 5,
    gripRating: 4,
    armorRating: 4,
  },
  {
    id: "coast",
    name: "Coast X",
    type: "OPEN-TOP SPEEDSTER",
    color: "#52a6ff",
    topSpeed: 80,
    acceleration: 34,
    width: 2.14,
    length: 4.85,
    handling: 1.08,
    damageScale: 0.66,
    description:
      "Any city level 10 · open cockpit, roll hoops and low coastal body",
    speedRating: 5,
    gripRating: 4,
    armorRating: 4,
  },
  {
    id: "creator",
    name: "TECHCRUSH Cyber",
    type: "ELECTRIC · 2× REWARDS",
    color: "#aeb7c0",
    topSpeed: 84,
    acceleration: 38,
    width: 2.18,
    length: 5.3,
    handling: 1.08,
    damageScale: 0.62,
    description:
      "YouTuber electric pickup · 2× driving coins and score · +5% stock speed vs Coast X",
    speedRating: 5,
    gripRating: 5,
    armorRating: 4,
  },
];
export function carSpec(id) {
  return CARS.find((c) => c.id === id) || CARS.find((c) => c.id === "gt");
}
export const CAMERAS = [
  { id: "chase", label: "CHASE" },
  { id: "cockpit", label: "COCKPIT" },
  { id: "hood", label: "HOOD" },
  { id: "aerial", label: "HIGH CHASE" },
];
