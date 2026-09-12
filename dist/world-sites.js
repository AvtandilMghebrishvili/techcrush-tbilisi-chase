import { IS_KUTAISI } from "./map-selection.js";
const data = IS_KUTAISI
  ? await import("./kutaisi-world-sites.js")
  : await import("./tbilisi-world-sites.js");
export const {
  ROOFTOP,
  QUEST_BOX,
  SPECIAL_RAMPS,
  STUNT_APRONS,
  STUNT_ZONES,
  BANK_SITE,
  BANK_SOLIDS,
  TOWERS,
  EXPANSION_SOLIDS,
  reservedExpansion,
  roofAt,
} = data;
