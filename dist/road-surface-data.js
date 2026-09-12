import { IS_KUTAISI } from "./map-selection.js";
const data = IS_KUTAISI ? await import("./kutaisi-road-surface-data.js") : await import("./tbilisi-road-surface-data.js");
export const ROAD_SURFACE = data.ROAD_SURFACE;
