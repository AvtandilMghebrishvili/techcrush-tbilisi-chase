import { IS_KUTAISI, IS_BATUMI, IS_RUSTAVI } from "./map-selection.js";
const data = IS_RUSTAVI
  ? await import("./rustavi-world-sites.js")
  : IS_BATUMI
    ? await import("./batumi-world-sites.js")
    : IS_KUTAISI
      ? await import("./kutaisi-world-sites.js")
      : await import("./tbilisi-world-sites.js");
export const {
  ROOFTOP,
  ROOFTOPS,
  ROOFTOP_QUESTS,
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
