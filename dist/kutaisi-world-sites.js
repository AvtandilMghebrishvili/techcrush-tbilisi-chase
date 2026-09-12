import { footprintsOverlap } from "./map-clearance.js";
// Original stunt construction on dry side streets. Main traffic lanes stay open.
export const ROOFTOP = {
  id: "kutaisi-skybox-v1",
  x: 1540,
  z: -800,
  w: 42,
  d: 74,
  h: 14,
  angle: 0,
  landmark: true,
  roof: true,
};
export const QUEST_BOX = { x: ROOFTOP.x, z: ROOFTOP.z + 22, y: ROOFTOP.h };
export const SPECIAL_RAMPS = [
  {
    id: 4,
    name: "RIONI SKYBOX · 200+ KM/H",
    x: 1540,
    z: -912,
    angle: 0,
    width: 8,
    length: 28,
    height: 5.4,
    lift: 0.32,
    quest: ROOFTOP.id,
  },
  {
    id: 5,
    name: "RIONI GAP · 220+ KM/H",
    x: -144,
    z: -665,
    angle: Math.PI / 2,
    width: 9,
    length: 30,
    height: 6,
    lift: 0.36,
    quest: "rioni-gap-v1",
  },
];
export const RIVER_TARGET = {
  x: 83,
  z: -665,
  name: "RIONI GAP · LAND UPRIGHT",
};
export const STUNT_APRONS = [
  { x: 1540, z: -954, w: 18, d: 122, angle: 0 },
  { x: -186, z: -665, w: 21, d: 110, angle: Math.PI / 2 },
  { x: 116, z: -665, w: 30, d: 120, angle: Math.PI / 2 },
];
export const STUNT_ZONES = [
  ROOFTOP,
  ...STUNT_APRONS,
  { x: 1540, z: -858, w: 50, d: 68, angle: 0 },
];
export const BANK_SITE = { x: 9999, z: 9999 };
export const BANK_SOLIDS = [];
export const TOWERS = [];
export const EXPANSION_SOLIDS = [ROOFTOP];
export const reservedExpansion = (rect) =>
  STUNT_ZONES.some((s) => footprintsOverlap(rect, s, 4));
export const roofAt = (p, margin = 0) =>
  Math.abs(p.x - ROOFTOP.x) < ROOFTOP.w / 2 - margin &&
  Math.abs(p.z - ROOFTOP.z) < ROOFTOP.d / 2 - margin
    ? ROOFTOP
    : null;
