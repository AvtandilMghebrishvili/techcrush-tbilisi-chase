import { TIME_COURSES } from "./race-timing.js";
import { mapUnlocked, cityLevel, MAP_COURSES } from "./map-selection.js";
import {
  newCommunity,
  normalizeName,
  AVATARS,
  validateRun,
  settleCommunity,
} from "./community-rules.js";
// Shared by the game and its save server. Credits have no real-money value.
export const TIERS = [
  { name: "Stock", color: "#84969e", weight: 0 },
  { name: "Bronze", color: "#cd925c", weight: 55 },
  { name: "Silver", color: "#c2d2df", weight: 28 },
  { name: "Gold", color: "#f5cc58", weight: 13 },
  { name: "Diamond", color: "#89efff", weight: 4 },
  { name: "Platinum", color: "#d9b9ff", weight: 0 },
];
export const PARTS = [
  {
    id: "engine",
    name: "Engine",
    icon: "◈",
    effect: "Top speed + acceleration",
    stats: { topSpeed: 2, acceleration: 0.8 },
  },
  {
    id: "ecu",
    name: "ECU tune",
    icon: "▣",
    effect: "Sharper acceleration",
    stats: { acceleration: 1.2 },
  },
  {
    id: "turbo",
    name: "Turbocharger",
    icon: "◎",
    effect: "Boost power + top speed",
    stats: { boostPower: 3, boostSpeed: 2 },
  },
  {
    id: "tank",
    name: "Nitro tank",
    icon: "▥",
    effect: "Longer turbo duration",
    stats: { nitroDrain: -2 },
  },
  {
    id: "cooler",
    name: "Intercooler",
    icon: "▤",
    effect: "Faster recharge + recovery",
    stats: { nitroRegen: 1.8, boostDelay: -0.08 },
  },
  {
    id: "gearbox",
    name: "Gearbox",
    icon: "⚙",
    effect: "Acceleration + top speed",
    stats: { acceleration: 0.8, topSpeed: 1.3 },
  },
  {
    id: "tires",
    name: "Sport tires",
    icon: "◉",
    effect: "Grip + steering response",
    stats: { handling: 0.045, grip: 0.25 },
  },
  {
    id: "rims",
    name: "Forged rims",
    icon: "✺",
    effect: "Lighter wheels + speed",
    stats: { acceleration: 0.5, topSpeed: 0.8 },
  },
  {
    id: "spoiler",
    name: "Rear spoiler",
    icon: "⌁",
    effect: "Downforce + high-speed control",
    stats: { handling: 0.04, topSpeed: 0.7 },
  },
  {
    id: "brakes",
    name: "Brake kit",
    icon: "⊕",
    effect: "Stronger braking",
    stats: { braking: 3 },
  },
  {
    id: "armor",
    name: "Body reinforcement",
    icon: "⬡",
    effect: "Less collision damage",
    stats: { protection: 0.075 },
  },
  {
    id: "suspension",
    name: "Suspension",
    icon: "↕",
    effect: "Softer landings + handling",
    stats: { landingProtection: 0.12, handling: 0.025 },
  },
  {
    id: "exhaust",
    name: "Race exhaust",
    icon: "≋",
    effect: "Boost thrust + speed",
    stats: { boostPower: 1.2, topSpeed: 0.7 },
  },
  {
    id: "weight",
    name: "Carbon panels",
    icon: "◇",
    effect: "Less weight + acceleration",
    stats: { acceleration: 0.6, topSpeed: 1 },
  },
];
export const CAR_IDS = ["classic", "gt", "rally", "suv"];
export const upgradeCost = (tier) => [0, 600, 1500, 3600, 7800][tier] || 0;
export const salvageValue = (tier) => [0, 75, 180, 420, 960, 1400][tier] || 0;
export const partKey = (id, tier) => `${id}:${tier}`;
export function newProfile() {
  return {
    schema: 4,
    maps: { kutaisi: { level: 1, community: newCommunity() } },
    platinumBoxes: 0,
    quests: { completed: [] },
    driver: { name: "", avatar: "red", listed: false },
    community: newCommunity(),
    activeRun: null,
    credits: 1000,
    level: 1,
    boxes: 1,
    inventory: {},
    cars: { classic: {}, gt: {}, rally: {}, suv: {} },
    selectedCar: "classic",
    settled: [],
    lastBox: null,
  };
}
export function migrateProfile(profile) {
  const p = structuredClone(profile);
  p.schema = 4;
  p.quests = { completed: [], ...p.quests };
  p.driver ||= { name: "", avatar: "red", listed: false };
  p.community = { ...newCommunity(p.level), ...p.community };
  p.activeRun ||= null;
  p.maps ||= {};
  p.maps.kutaisi = { level: 1, community: newCommunity(), ...p.maps.kutaisi };
  p.platinumBoxes ||= 0;
  for (const id of CAR_IDS) p.cars[id] ||= {};
  return p;
}
export function upgradedSpec(base, equipment = {}) {
  const spec = {
    ...base,
    boostPower: 19,
    boostSpeed: 20,
    nitroDrain: 25,
    nitroRegen: 10,
    boostDelay: 0.85,
    braking: 34,
    grip: 8.5,
    landingScale: 1,
  };
  for (const part of PARTS) {
    const grade = Math.max(0, Math.min(5, Math.floor(equipment[part.id] || 0)));
    const tier = grade === 5 ? 4.5 : grade;
    for (const [stat, value] of Object.entries(part.stats)) {
      if (stat === "protection") spec.damageScale *= 1 - value * tier;
      else if (stat === "landingProtection")
        spec.landingScale *= 1 - value * tier;
      else spec[stat] = (spec[stat] || 0) + value * tier;
    }
  }
  return spec;
}
export function pursuitTuning(level = 1) {
  level = Math.max(1, Math.floor(level));
  const growth = (level - 1) / (level + 7);
  const endurance = (level - 1) / (level + 45);
  return {
    level,
    maxSpeed: 43 + growth * 37 + endurance * 12,
    acceleration: 15.5 + growth * 15 + endurance * 6,
    repath: 0.55 - growth * 0.34,
    lead: 1.8 + growth * 1.3,
    ramRecovery: 2.6 - growth * 1.5,
    waveInterval: 35 - growth * 19 - endurance * 5,
    maxUnits: 12 + Math.min(10, Math.floor((level - 1) / 2)),
    initialUnits: 3 + Math.min(4, Math.floor((level - 1) / 3)),
    sight: 260 + growth * 100,
    flank: level >= 3,
    roadblockRange: 100 + growth * 80,
  };
}
export function rollBox(rng = Math.random) {
  return Array.from({ length: 3 }, () => {
    const part =
      PARTS[Math.min(PARTS.length - 1, Math.floor(rng() * PARTS.length))];
    const roll = rng() * 100;
    let threshold = 0,
      tier = 4;
    for (let n = 1; n <= 4; n++) {
      threshold += TIERS[n].weight;
      if (roll < threshold) {
        tier = n;
        break;
      }
    }
    return { part: part.id, tier };
  });
}
export function applyProgressAction(
  profile,
  action,
  rng = Math.random,
  context = {},
) {
  const p = migrateProfile(profile);
  const car = CAR_IDS.includes(action.car) ? action.car : p.selectedCar;
  const item = PARTS.find((x) => x.id === action.part);
  if (action.type === "driver") {
    const name = normalizeName(action.name);
    if (!AVATARS.includes(action.avatar) || typeof action.listed !== "boolean")
      throw Error("Choose a valid driver profile.");
    p.driver = { name, avatar: action.avatar, listed: action.listed };
  } else if (action.type === "begin-run") {
    if (!context.runId || !Number.isFinite(context.now))
      throw Error("Start your chase online.");
    if (!CAR_IDS.includes(action.car)) throw Error("Choose a valid car.");
    const map = action.map || "tbilisi";
    if (!mapUnlocked(p, map))
      throw Error("Clear Tbilisi level 3 to unlock Kutaisi.");
    if (action.course && !action.course.startsWith(map + "-"))
      throw Error("This timing course belongs to another city.");
    if (map === "kutaisi" && action.course !== MAP_COURSES.kutaisi)
      throw Error("Reload Kutaisi to use its current course.");
    p.activeRun = {
      id: context.runId,
      startedAt: context.now,
      level: cityLevel(p, map),
      map,
      car: action.car,
      ...(TIME_COURSES.includes(action.course)
        ? {
            course: action.course,
            buildPoints: PARTS.reduce(
              (sum, part) => sum + (p.cars[action.car][part.id] || 0),
              0,
            ),
          }
        : {}),
    };
  } else if (action.type === "select") {
    if (!CAR_IDS.includes(action.car)) throw Error("Unknown car");
    p.selectedCar = car;
  } else if (action.type === "paint") {
    if (
      !CAR_IDS.includes(action.car) ||
      typeof action.color !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(action.color)
    )
      throw Error("Choose a valid paint color and car.");
    p.cars[car].paint = action.color.toLowerCase();
  } else if (action.type === "open-box") {
    if (p.boxes < 1) throw Error("Complete a level to earn another box.");
    p.boxes--;
    const items = rollBox(rng);
    for (const reward of items) {
      const key = partKey(reward.part, reward.tier);
      p.inventory[key] = (p.inventory[key] || 0) + 1;
    }
    p.lastBox = { id: action.id, items };
  } else if (action.type === "open-platinum-box") {
    if (p.platinumBoxes < 1)
      throw Error("Find a secret stunt box in Kutaisi first.");
    p.platinumBoxes--;
    const items = Array.from({ length: 3 }, () => ({
      part: PARTS[Math.min(PARTS.length - 1, Math.floor(rng() * PARTS.length))]
        .id,
      tier: 5,
    }));
    for (const reward of items) {
      const key = partKey(reward.part, 5);
      p.inventory[key] = (p.inventory[key] || 0) + 1;
    }
    p.lastBox = { id: action.id, items, kind: "platinum" };
  } else if (
    action.type === "upgrade" ||
    action.type === "equip" ||
    action.type === "sell"
  ) {
    if (!item) throw Error("Unknown upgrade.");
    const equipped = p.cars[car][item.id] || 0;
    const tier = action.type === "upgrade" ? equipped + 1 : Number(action.tier);
    if (!Number.isInteger(tier) || tier < 1 || tier > 5)
      throw Error("Choose a valid part tier.");
    if (action.type === "upgrade" && tier === 5)
      throw Error(
        "Platinum parts are found in Kutaisi secret boxes. Install an owned part.",
      );
    const key = partKey(item.id, tier);
    if (action.type === "sell") {
      if (!(p.inventory[key] > 0))
        throw Error("This part is not in your inventory.");
      p.inventory[key]--;
      p.credits += salvageValue(tier);
    } else {
      if (tier <= equipped)
        throw Error("This car already has an equal or better part.");
      if (action.type === "upgrade") {
        const cost = upgradeCost(tier);
        if (p.credits < cost) throw Error("Not enough credits.");
        p.credits -= cost;
      } else {
        if (!(p.inventory[key] > 0))
          throw Error("This part is not in your inventory.");
        p.inventory[key]--;
      }
      if (equipped)
        p.inventory[partKey(item.id, equipped)] =
          (p.inventory[partKey(item.id, equipped)] || 0) + 1;
      p.cars[car][item.id] = tier;
    }
  } else if (action.type === "settle") {
    if (
      typeof action.runId !== "string" ||
      action.runId.length < 8 ||
      action.runId.length > 100
    )
      throw Error("Invalid run.");
    if (p.settled.includes(action.runId)) return p;
    const level = Number(action.level);
    const map = p.activeRun?.map || "tbilisi";
    if (
      level !== cityLevel(p, map) ||
      !["won", "busted", "wrecked", "abandoned"].includes(action.result)
    )
      throw Error("This run does not match the current level.");
    if (action.metrics) {
      if (
        !p.activeRun ||
        p.activeRun.id !== action.runId ||
        p.activeRun.level !== level
      )
        throw Error(
          "This chase has already ended or was replaced in another tab.",
        );
      const metrics = validateRun(
        action.metrics,
        p.activeRun,
        action.result,
        context.now,
      );
      const runProfile =
        map === "kutaisi"
          ? {
              ...p,
              level: p.maps.kutaisi.level,
              community: p.maps.kutaisi.community,
            }
          : p;
      settleCommunity(runProfile, metrics, action.result, level, context.now);
      runProfile.community.lastTime =
        action.result === "won" && metrics.timing
          ? {
              ...metrics.timing,
              level,
              car: p.activeRun.car,
              buildPoints: p.activeRun.buildPoints,
              score: metrics.score,
              runId: p.activeRun.id,
              recordedAt: context.now,
              map,
            }
          : null;
      if (map === "kutaisi") {
        p.maps.kutaisi = {
          level: runProfile.level,
          community: runProfile.community,
        };
        for (const key of ["credits", "boxes", "platinumBoxes", "quests"])
          p[key] = runProfile[key];
      }
      p.lastRunMap = map;
      p.activeRun = null;
    } else {
      // Already-open pre-community clients may finish their old chase. They do
      // not create leaderboard entries or achievements and cannot settle a ticket.
      const cash = Number(action.cash);
      if (
        p.activeRun ||
        p.driver.name ||
        !Number.isFinite(cash) ||
        cash < 0 ||
        cash > 250000
      )
        throw Error("Reload the game to start a new online chase.");
      p.credits += Math.floor(cash);
      if (action.result === "won") {
        p.credits += 1800 + p.level * 250;
        p.level++;
        p.boxes++;
      }
    }
    p.settled.push(action.runId);
    p.settled = p.settled.slice(-128);
  } else throw Error("Unknown garage action.");
  return p;
}
