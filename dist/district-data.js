import { IS_KUTAISI } from "./map-selection.js";
const data = IS_KUTAISI
  ? await import("./kutaisi-district-data.js")
  : await import("./tbilisi-district-data.js");
export const {
  LANDMARKS,
  RIVER,
  riverDistance,
  RIVER_BANKS,
  RIVER_POLYGON,
  reservedDistrict,
  RETAINING_WALLS,
  DISTRICT_SOLIDS,
} = data;
