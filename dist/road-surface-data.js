import { IS_KUTAISI, IS_BATUMI } from "./map-selection.js";
const data = IS_BATUMI
  ? await import("./batumi-road-surface-data.js")
  : IS_KUTAISI
    ? await import("./kutaisi-road-surface-data.js")
    : await import("./tbilisi-road-surface-data.js");
export const ROAD_SURFACE = data.ROAD_SURFACE;
