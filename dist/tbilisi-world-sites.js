import { placeOffRoad, footprintsOverlap } from "./map-clearance.js";
import { CIVIC_SOLIDS, reservedCivic } from "./tbilisi-civic-data.js";

// Original arcade stunt sites. Coordinates are stable IDs, never save-file indices.
export const ROOFTOP = {
  id: "tbilisi-skybox-v1",
  x: 420,
  z: 682,
  w: 44,
  d: 74,
  h: 14,
  angle: 0,
  landmark: true,
  roof: true,
};
export const QUEST_BOX = { x: 420, z: 710, y: ROOFTOP.h };
export const SPECIAL_RAMPS = [
  {
    id: 4,
    name: "SKYBOX · 200+ KM/H",
    x: 420,
    z: 570,
    angle: 0,
    width: 8,
    length: 28,
    height: 5.4,
    lift: 0.32,
    quest: ROOFTOP.id,
  },
  {
    id: 5,
    name: "MTKVARI GAP · 220+ KM/H",
    x: -710,
    z: -440,
    angle: -Math.PI / 2,
    width: 9,
    length: 30,
    height: 6,
    lift: 0.36,
    quest: "mtkvari-gap-v1",
  },
];
export const STUNT_APRONS = [
  { x: 420, z: 543, w: 18, d: 92, angle: 0 },
  { x: -685, z: -440, w: 21, d: 105, angle: -Math.PI / 2 },
  { x: -942, z: -440, w: 30, d: 176, angle: -Math.PI / 2 },
];
export const STUNT_ZONES = [
  ROOFTOP,
  ...STUNT_APRONS,
  { x: 420, z: 623, w: 50, d: 68, angle: 0 },
];
const bankParts = [
  ...[-28, 0, 28].map((x) => ({ x, z: 0, w: 11, d: 15, base: 0, h: 49 })),
  { x: 0, z: -18, w: 91, d: 15, base: 14, h: 25 },
  { x: 0, z: 18, w: 91, d: 15, base: 14, h: 25 },
  { x: -28, z: 0, w: 15, d: 83, base: 26, h: 37 },
  { x: 28, z: 0, w: 15, d: 83, base: 26, h: 37 },
  { x: 0, z: 0, w: 91, d: 15, base: 38, h: 49 },
].map((p) => ({ ...p, angle: 0 }));
// Compressed city landmark: the real headquarters is on Gagarin Street, outside
// this central-city map. Its interlocking volumes are reproduced in a north plaza.
export const BANK_SITE = placeOffRoad({ x: 500, z: 900 }, bankParts);
export const BANK_SOLIDS = bankParts.map((p) => ({
  ...p,
  x: p.x + BANK_SITE.x,
  z: p.z + BANK_SITE.z,
  landmark: true,
  bank: true,
}));
export const TOWERS = [
  { x: 624, z: 712, w: 28, d: 25, h: 72 },
  { x: 738, z: 810, w: 25, d: 29, h: 88 },
].map((p) => ({
  ...p,
  ...placeOffRoad(p, [{ x: 0, z: 0, w: p.w + 4, d: p.d + 4, angle: 0 }]),
  angle: 0,
  landmark: true,
  tower: true,
}));
export const EXPANSION_SOLIDS = [
  ROOFTOP,
  ...BANK_SOLIDS,
  ...TOWERS,
  ...CIVIC_SOLIDS,
];
export function reservedExpansion(rect) {
  return (
    reservedCivic(rect) ||
    [...STUNT_ZONES, ...BANK_SOLIDS, ...TOWERS].some((s) =>
      footprintsOverlap(rect, s, 4),
    )
  );
}
export function roofAt(p, margin = 0) {
  return Math.abs(p.x - ROOFTOP.x) < ROOFTOP.w / 2 - margin &&
    Math.abs(p.z - ROOFTOP.z) < ROOFTOP.d / 2 - margin
    ? ROOFTOP
    : null;
}
