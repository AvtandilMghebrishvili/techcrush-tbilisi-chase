import { footprintsOverlap } from "./map-clearance.js";
// Original service yard additions, away from the public carriageway.
export const ROOFTOP = {
  id: "batumi-skybox-v1",
  x: -2270,
  z: -1090,
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
    name: "COAST SKYBOX · 200+ KM/H",
    x: ROOFTOP.x,
    z: ROOFTOP.z - 112,
    angle: 0,
    width: 8,
    length: 28,
    height: 5.4,
    lift: 0.32,
    quest: ROOFTOP.id,
  },
];
export const RIVER_TARGET = {
  x: ROOFTOP.x,
  z: ROOFTOP.z,
  name: "COAST SKYBOX",
};
export const STUNT_APRONS = [
  { x: ROOFTOP.x, z: ROOFTOP.z - 154, w: 18, d: 122, angle: 0 },
];
export const STUNT_ZONES = [
  ROOFTOP,
  ...STUNT_APRONS,
  { x: ROOFTOP.x, z: ROOFTOP.z - 58, w: 50, d: 68, angle: 0 },
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
