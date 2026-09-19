import { IS_KUTAISI, IS_BATUMI, IS_RUSTAVI } from "./map-selection.js";
const data = IS_RUSTAVI
  ? await import("./rustavi-district-data.js")
  : IS_BATUMI
    ? await import("./batumi-district-data.js")
    : IS_KUTAISI
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
