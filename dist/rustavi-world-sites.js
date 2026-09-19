import { footprintsOverlap } from "./map-clearance.js";
import { EXAM_YARD, HALL_PLAZA } from "./rustavi-district-data.js";
// An original industrial stunt yard, west of the old-town riverbank.
export const ROOFTOP = {
  id: "rustavi-skybox-v1",
  x: 910,
  z: 100,
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
    name: "STEELWORKS SKYBOX · 200+ KM/H",
    x: 910,
    z: -12,
    angle: 0,
    width: 8,
    length: 28,
    height: 5.4,
    lift: 0.32,
    quest: ROOFTOP.id,
  },
  {
    id: 5,
    name: "DRIVING ACADEMY · HILL START",
    x: EXAM_YARD.x + 58,
    z: EXAM_YARD.z - 22,
    angle: 0,
    width: 6,
    length: 18,
    height: 1.2,
    lift: 0.1,
  },
];
export const STUNT_APRONS = [{ x: 910, z: -54, w: 18, d: 122, angle: 0 }];
export const STUNT_ZONES = [
  ROOFTOP,
  ...STUNT_APRONS,
  { x: 910, z: 42, w: 50, d: 68, angle: 0 },
];
export const BANK_SITE = { x: 9999, z: 9999 };
export const BANK_SOLIDS = [];
export const TOWERS = [];
export const EXPANSION_SOLIDS = [ROOFTOP];
export const reservedExpansion = (r) =>
  footprintsOverlap(r, HALL_PLAZA, 3) ||
  STUNT_ZONES.some((s) => footprintsOverlap(r, s, 4));
export const roofAt = (p, margin = 0) =>
  Math.abs(p.x - ROOFTOP.x) < ROOFTOP.w / 2 - margin &&
  Math.abs(p.z - ROOFTOP.z) < ROOFTOP.d / 2 - margin
    ? ROOFTOP
    : null;
