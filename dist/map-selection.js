// A city is fixed for the page lifetime; switching releases the old world and audio.
export const CITY_IDS = ["tbilisi", "kutaisi", "batumi"];
const requested =
  typeof location !== "undefined"
    ? new URL(location.href).searchParams.get("map")
    : null;
export const ACTIVE_MAP = CITY_IDS.includes(requested) ? requested : "tbilisi";
export const IS_KUTAISI = ACTIVE_MAP === "kutaisi";
export const IS_BATUMI = ACTIVE_MAP === "batumi";
export const CITY_NAME = ACTIVE_MAP.toUpperCase();
export const MAP_COURSES = {
  tbilisi: "tbilisi-2.0",
  kutaisi: "kutaisi-2.0",
  batumi: "batumi-1.0",
};
export const cityLevel = (profile, map = ACTIVE_MAP) =>
  map === "tbilisi" ? profile.level : profile.maps?.[map]?.level || 1;
export const cityCommunity = (profile, map = ACTIVE_MAP) =>
  map === "tbilisi" ? profile.community : profile.maps?.[map]?.community;
export const mapUnlocked = (_profile, map) => CITY_IDS.includes(map);
