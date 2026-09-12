// A map is fixed for the lifetime of a page. Switching cities saves, then reloads:
// old WebGL/audio/route caches are released instead of retaining two worlds.
export const ACTIVE_MAP =
  typeof location !== "undefined" &&
  new URL(location.href).searchParams.get("map") === "kutaisi"
    ? "kutaisi"
    : "tbilisi";
export const IS_KUTAISI = ACTIVE_MAP === "kutaisi";
export const CITY_NAME = IS_KUTAISI ? "KUTAISI" : "TBILISI";
export const MAP_COURSES = { tbilisi: "tbilisi-1.16", kutaisi: "kutaisi-1.1" };
export const cityLevel = (profile, map = ACTIVE_MAP) =>
  map === "kutaisi" ? profile.maps?.kutaisi?.level || 1 : profile.level;
export const cityCommunity = (profile, map = ACTIVE_MAP) =>
  map === "kutaisi" ? profile.maps?.kutaisi?.community : profile.community;
export const mapUnlocked = (profile, map) =>
  map === "tbilisi" || (map === "kutaisi" && profile.level >= 4);
