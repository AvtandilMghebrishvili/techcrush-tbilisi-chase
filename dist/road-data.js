import { IS_KUTAISI, IS_BATUMI } from "./map-selection.js";
const data = IS_BATUMI
  ? await import("./batumi-road-data.js")
  : IS_KUTAISI
    ? await import("./kutaisi-road-data.js")
    : await import("./tbilisi-road-data.js");
export const ROAD_DATA = data.ROAD_DATA;
