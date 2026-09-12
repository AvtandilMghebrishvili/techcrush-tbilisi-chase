import { IS_KUTAISI } from "./map-selection.js";
const data = IS_KUTAISI ? await import("./kutaisi-road-data.js") : await import("./tbilisi-road-data.js");
export const ROAD_DATA = data.ROAD_DATA;
