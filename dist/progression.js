import {
  EVENT_ID,
  eventPhase,
  eventProgress,
  joinEvent,
  stampEventRun,
  settleEvent,
} from "./event-rules.js";
import { TIME_COURSES } from "./race-timing.js";
import { ticketRewardMultiplier } from "./car-bonuses.js";
import { isPrivateDriverName } from "./private-driver.js";
import {
  mapUnlocked,
  cityLevel,
  cityCommunity,
  MAP_COURSES,
  CITY_IDS,
} from "./map-selection.js";
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
  { name: "Emerald", color: "#62efac", weight: 0 },
  { name: "Ruby", color: "#ff5981", weight: 0 },
  { name: "TECHCRUSH", color: "#ffa83d", weight: 0 },
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
export const BASE_CARS = ["classic", "gt", "rally", "suv"];
export const CITY_CARS = {
  tbilisi: "falcon",
  kutaisi: "rioni",
  batumi: "coast",
};
export const CAR_IDS = [...BASE_CARS, ...Object.values(CITY_CARS), "creator"];
export const carUnlocked = (p, id) =>
  BASE_CARS.includes(id) || (p.unlockedCars || []).includes(id);
export const totalTakedowns = (p) =>
  CITY_IDS.reduce(
    (n, map) =>
      n +
      (map === "tbilisi"
        ? p.community?.takedowns
        : p.maps?.[map]?.community?.takedowns || 0),
    0,
  );
export const highestCityLevel = (p) =>
  Math.max(...CITY_IDS.map((map) => cityLevel(p, map)));
export const MILESTONE_BOXES = {
  mystery: {
    name: "Mystery",
    field: "mysteryBoxes",
    cashMin: 1500,
    cashMax: 3000,
    tiers: [
      [3, 50],
      [4, 40],
      [5, 10],
    ],
  },
  special: {
    name: "Special",
    field: "specialBoxes",
    cashMin: 4000,
    cashMax: 7000,
    tiers: [
      [4, 65],
      [5, 35],
    ],
  },
};
export const BOX_SHOP = {
  street: { name: "Street", field: "boxes", price: 4000 },
  mystery: { name: "Mystery", field: "mysteryBoxes", price: 10000 },
  special: { name: "GREX Special", field: "specialBoxes", price: 16000 },
  platinum: { name: "Platinum", field: "platinumBoxes", price: 22000 },
  creator: { name: "TECHCRUSH", field: "creatorBoxes", price: 35000 },
};
export const totalBoxes = (p) =>
  p.boxes +
  (p.platinumBoxes || 0) +
  (p.creatorBoxes || 0) +
  (p.mysteryBoxes || 0) +
  (p.specialBoxes || 0);
export function syncMilestones(p) {
  p.unlockedCars ||= [];
  p.carBoxes ||= [];
  p.claimedCityCars ||= [];
  p.creatorBoxes ||= 0;
  p.creatorMilestones ||= 0;
  p.mysteryBoxes ||= 0;
  p.specialBoxes ||= 0;
  p.levelMilestones ||= {};
  const highest = highestCityLevel(p);
  const unlocks =
    highest >= 15
      ? [...Object.values(CITY_CARS), "creator"]
      : highest >= 10
        ? Object.values(CITY_CARS)
        : [];
  for (const id of unlocks)
    if (!p.unlockedCars.includes(id)) p.unlockedCars.push(id);
  // Fixed-size per-city high-water marks make reloads and retries idempotent,
  // including retroactive grants and arbitrarily high endless career levels.
  for (const map of CITY_IDS) {
    const earned = Math.floor(cityLevel(p, map) / 5);
    const previous = p.levelMilestones[map] || 0;
    if (earned > previous) {
      p.mysteryBoxes += earned - previous;
      p.specialBoxes += earned - previous;
      p.levelMilestones[map] = earned;
    }
  }
  const earned = Math.floor(totalTakedowns(p) / 10);
  if (earned > p.creatorMilestones) {
    p.creatorBoxes += earned - p.creatorMilestones;
    p.creatorMilestones = earned;
  }
  return p;
}
export const upgradeCost = (tier) => [0, 600, 1500, 3600, 7800][tier] || 0;
export const salvageValue = (tier) =>
  [0, 75, 180, 420, 960, 1400, 2100, 3200, 5000][tier] || 0;
export const partKey = (id, tier) => `${id}:${tier}`;
// Fusion is permanent tuning of a car's part slot; changing rarity keeps it.
export const FUSION_COSTS = [5, 10, 15, 20, 25];
export const FUSION_BONUSES = [0, 0.3, 0.5, 0.7, 0.9, 1.1];
export const partStars = (equipment, id) =>
  Math.max(0, Math.min(5, Math.floor(Number(equipment?.stars?.[id]) || 0)));
export const partPower = (equipment, id) => {
  const tier = Math.max(0, Math.min(8, Math.floor(equipment[id] || 0)));
  return (
    (tier > 4 ? 4 + (tier - 4) * 0.5 : tier) *
    (1 + FUSION_BONUSES[partStars(equipment, id)])
  );
};
export function newProfile() {
  return {
    schema: 6,
    maps: {
      kutaisi: { level: 1, community: newCommunity() },
      batumi: { level: 1, community: newCommunity() },
      rustavi: { level: 1, community: newCommunity() },
    },
    unlockedCars: [],
    carBoxes: [],
    claimedCityCars: [],
    creatorBoxes: 0,
    creatorMilestones: 0,
    mysteryBoxes: 0,
    specialBoxes: 0,
    levelMilestones: {},
    platinumBoxes: 0,
    quests: { completed: [] },
    driver: { name: "", avatar: "red", listed: false },
    community: newCommunity(),
    activeRun: null,
    credits: 1000,
    level: 1,
    boxes: 1,
    inventory: {},
    cars: Object.fromEntries(CAR_IDS.map((id) => [id, {}])),
    selectedCar: "classic",
    settled: [],
    lastBox: null,
  };
}
export function migrateProfile(profile) {
  const p = structuredClone(profile);
  const legacy = (p.schema || 1) < 6;
  p.schema = 6;
  p.quests = { completed: [], ...p.quests };
  p.driver ||= { name: "", avatar: "red", listed: false };
  p.community = { ...newCommunity(p.level), ...p.community };
  p.activeRun ||= null;
  p.maps ||= {};
  p.maps.kutaisi = { level: 1, community: newCommunity(), ...p.maps.kutaisi };
  p.maps.batumi = { level: 1, community: newCommunity(), ...p.maps.batumi };
  p.maps.rustavi = { level: 1, community: newCommunity(), ...p.maps.rustavi };
  p.cars ||= {};
  p.platinumBoxes ||= 0;
  for (const id of CAR_IDS) p.cars[id] ||= {};
  // Honor cars and unclaimed car boxes earned under the previous rules once.
  if (legacy) {
    p.unlockedCars ||= [];
    p.carBoxes ||= [];
    p.claimedCityCars ||= [];
    for (const map of Object.keys(CITY_CARS))
      if (
        cityLevel(p, map) >= 6 &&
        !p.claimedCityCars.includes(map) &&
        !p.carBoxes.includes(map) &&
        !carUnlocked(p, CITY_CARS[map])
      )
        p.carBoxes.push(map);
    if (totalTakedowns(p) >= 10 && !carUnlocked(p, "creator"))
      p.unlockedCars.push("creator");
  }
  return syncMilestones(p);
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
    const tier = partPower(equipment, part.id);
    for (const [stat, value] of Object.entries(part.stats)) {
      if (stat === "protection") spec.damageScale *= 1 - value * tier;
      else if (stat === "landingProtection")
        spec.landingScale *= 1 - value * tier;
      else spec[stat] = (spec[stat] || 0) + value * tier;
    }
  }
  spec.landingScale = Math.max(0.1, spec.landingScale);
  spec.damageScale = Math.max(0.12, spec.damageScale);
  spec.topSpeed = Math.min(145, spec.topSpeed);
  spec.boostSpeed = Math.min(45, spec.boostSpeed);
  spec.nitroDrain = Math.max(6, spec.nitroDrain);
  spec.boostDelay = Math.max(0.12, spec.boostDelay);
  return spec;
}
export function pursuitTuning(level = 1, playerSpeed = 58, map = "tbilisi") {
  level = Math.max(1, Math.floor(level));
  const growth = (level - 1) / (level + 7);
  const endurance = (level - 1) / (level + 45);
  return {
    level,
    // +20% of the player's normal speed per level. A physical ceiling avoids
    // runaway velocities on unlimited levels; tactics/counts keep escalating.
    maxSpeed: Math.min(
      145,
      Math.max(45, playerSpeed) * (1 + 0.2 * (level - 1)),
    ),
    acceleration: 24 + growth * 24 + endurance * 6,
    repath: 0.55 - growth * 0.34,
    lead: 1.8 + growth * 1.3,
    ramRecovery: 2.6 - growth * 1.5,
    waveInterval: (map !== "tbilisi" ? 23 : 29) - growth * 12 - endurance * 3,
    maxUnits: 12 + Math.min(10, Math.floor((level - 1) / 2)),
    initialUnits:
      (map !== "tbilisi" ? 6 : 4) + Math.min(4, Math.floor((level - 1) / 3)),
    sight: (map !== "tbilisi" ? 350 : 290) + growth * 100,
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
  delete p.previewAccess;
  const car = CAR_IDS.includes(action.car) ? action.car : p.selectedCar;
  if (
    ["select", "begin-run", "paint", "upgrade", "equip", "fuse"].includes(
      action.type,
    ) &&
    !carUnlocked(p, car)
  )
    throw Error("Unlock this car by reaching its required level in any city.");
  const item = PARTS.find((x) => x.id === action.part);
  if (action.type === "event-notice-seen") {
    if (action.event !== EVENT_ID || !Number.isFinite(context.now))
      throw Error("Unknown event notice.");
    p.eventNotices ||= {};
    p.eventNotices[EVENT_ID] ||= context.now;
  } else if (action.type === "join-event") {
    joinEvent(p, action, context.now);
  } else if (action.type === "driver") {
    const name = normalizeName(action.name);
    if (!AVATARS.includes(action.avatar) || typeof action.listed !== "boolean")
      throw Error("Choose a valid driver profile.");
    p.driver = {
      name,
      avatar: action.avatar,
      listed: isPrivateDriverName(name) ? false : action.listed,
    };
  } else if (action.type === "buy-box") {
    const box = BOX_SHOP[action.kind];
    if (!box) throw Error("Choose a valid supply box.");
    if (p.credits < box.price)
      throw Error(`You need ${box.price.toLocaleString()} CR for this box.`);
    p.credits -= box.price;
    p[box.field] = (p[box.field] || 0) + 1;
    p.lastPurchase = { kind: action.kind, price: box.price };
  } else if (action.type === "begin-run") {
    if (!context.runId || !Number.isFinite(context.now))
      throw Error("Start your chase online.");
    if (!CAR_IDS.includes(action.car)) throw Error("Choose a valid car.");
    const map = action.map || "tbilisi";
    if (
      !(context.preview === true && map === "rustavi") &&
      !mapUnlocked(p, map, context.now)
    )
      throw Error("Choose a valid city.");
    if (action.course && !action.course.startsWith(map + "-"))
      throw Error("This timing course belongs to another city.");
    if (action.course && !TIME_COURSES.includes(action.course))
      throw Error("Reload to use a supported course.");
    if (
      context.exclusiveEvent === true &&
      context.preview !== true &&
      eventPhase(context.now) === "live" &&
      !eventProgress(p)
    )
      throw Error("Join CITY WARS before starting a chase.");
    p.activeRun = {
      id: context.runId,
      startedAt: context.now,
      level: cityLevel(p, map),
      map,
      car: action.car,
      rewardVersion: 1,
      ...(TIME_COURSES.includes(action.course)
        ? {
            course: action.course,
            buildPoints: PARTS.reduce(
              (sum, part) =>
                sum +
                (p.cars[action.car][part.id] || 0) +
                partStars(p.cars[action.car], part.id),
              0,
            ),
          }
        : {}),
    };
    stampEventRun(p, action, p.activeRun, context.now);
  } else if (action.type === "checkpoint-progress") {
    const checkpoint = Number(action.checkpoint),
      ticket = p.activeRun;
    if (
      !ticket ||
      typeof action.runId !== "string" ||
      action.runId !== ticket.id ||
      !Number.isInteger(checkpoint) ||
      checkpoint < 1 ||
      checkpoint > 6 ||
      checkpoint < (ticket.savedCheckpoint || 0) ||
      !Number.isFinite(context.now) ||
      context.now - ticket.startedAt < checkpoint * 250
    )
      throw Error("Checkpoint progress could not be verified.");
    ticket.savedCheckpoint = checkpoint;
    const community = cityCommunity(p, ticket.map);
    if (ticket.level > community.furthestLevel) {
      community.furthestLevel = ticket.level;
      community.checkpoints = checkpoint;
    } else if (ticket.level === community.furthestLevel) {
      community.checkpoints = Math.max(community.checkpoints, checkpoint);
    }
    community.rankAt = context.now;
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
  } else if (action.type === "claim-car-box") {
    if (!p.carBoxes.includes(action.map))
      throw Error(
        "This legacy car box has already been claimed or was not earned.",
      );
    p.carBoxes = p.carBoxes.filter((m) => m !== action.map);
    p.claimedCityCars.push(action.map);
    const reward = CITY_CARS[action.map];
    if (!p.unlockedCars.includes(reward)) p.unlockedCars.push(reward);
    p.lastCarReward = { map: action.map, car: reward };
  } else if (["open-mystery-box", "open-special-box"].includes(action.type)) {
    const kind = action.type === "open-mystery-box" ? "mystery" : "special";
    const box = MILESTONE_BOXES[kind];
    if (p[box.field] < 1)
      throw Error(
        "Reach level 5, 10, 15 and beyond in any city to earn milestone boxes.",
      );
    p[box.field]--;
    const credits =
      box.cashMin + Math.floor(rng() * (box.cashMax - box.cashMin + 1));
    const items = Array.from({ length: 3 }, () => {
      const part =
        PARTS[Math.min(PARTS.length - 1, Math.floor(rng() * PARTS.length))].id;
      const roll = rng() * 100;
      let threshold = 0,
        tier = box.tiers.at(-1)[0];
      for (const [grade, weight] of box.tiers) {
        threshold += weight;
        if (roll < threshold) {
          tier = grade;
          break;
        }
      }
      const key = partKey(part, tier);
      p.inventory[key] = (p.inventory[key] || 0) + 1;
      return { part, tier };
    });
    p.credits += credits;
    p.lastBox = { id: action.id, items, kind, credits };
  } else if (action.type === "open-creator-box") {
    if (p.creatorBoxes < 1)
      throw Error("Destroy 10 patrol cars to earn a TECHCRUSH box.");
    p.creatorBoxes--;
    const items = Array.from({ length: 3 }, () => ({
      part: PARTS[Math.min(PARTS.length - 1, Math.floor(rng() * PARTS.length))]
        .id,
      tier: 5 + Math.min(3, Math.floor(rng() * 4)),
    }));
    for (const r of items) {
      const k = partKey(r.part, r.tier);
      p.inventory[k] = (p.inventory[k] || 0) + 1;
    }
    p.lastBox = { id: action.id, items, kind: "creator" };
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
  } else if (action.type === "claim-loot") {
    const drop = p.lastBox;
    if (
      !drop ||
      drop.id !== action.boxId ||
      !Number.isInteger(action.index) ||
      !drop.items[action.index] ||
      !["equip", "sell"].includes(action.choice)
    )
      throw Error("Choose a reward from your current box.");
    const reward = drop.items[action.index];
    if (reward.claimed) throw Error("This reward has already been used.");
    const next = applyProgressAction(
      p,
      {
        type: action.choice,
        car,
        part: reward.part,
        tier: reward.tier,
      },
      rng,
      context,
    );
    next.lastBox.items[action.index].claimed = action.choice;
    return next;
  } else if (action.type === "fuse") {
    if (!item) throw Error("Unknown upgrade.");
    const equipment = p.cars[car],
      tier = equipment[item.id] || 0;
    const stars = partStars(equipment, item.id),
      cost = FUSION_COSTS[stars];
    if (!tier) throw Error("Install this part before fusing duplicates.");
    if (!cost) throw Error("This part already has five fusion stars.");
    const key = partKey(item.id, tier);
    if ((p.inventory[key] || 0) < cost)
      throw Error(
        `Collect ${cost} spare ${TIERS[tier].name} ${item.name} parts.`,
      );
    p.inventory[key] -= cost;
    equipment.stars = { ...equipment.stars, [item.id]: stars + 1 };
  } else if (
    action.type === "upgrade" ||
    action.type === "equip" ||
    action.type === "sell"
  ) {
    if (!item) throw Error("Unknown upgrade.");
    const equipped = p.cars[car][item.id] || 0;
    const tier = action.type === "upgrade" ? equipped + 1 : Number(action.tier);
    if (!Number.isInteger(tier) || tier < 1 || tier > 8)
      throw Error("Choose a valid part tier.");
    if (action.type === "upgrade" && tier >= 5)
      throw Error(
        "Platinum parts come from stunt and milestone boxes. Install an owned part.",
      );
    if (action.type !== "sell" && tier > 5 && car !== "creator")
      throw Error(
        "Emerald, Ruby and TECHCRUSH parts fit the YouTuber Car only.",
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
    const beforeMilestones = {
      mystery: p.mysteryBoxes,
      special: p.specialBoxes,
      creator: p.creatorBoxes,
      cars: [...p.unlockedCars],
    };
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
        map !== "tbilisi"
          ? {
              ...p,
              level: p.maps[map].level,
              community: p.maps[map].community,
            }
          : p;
      settleCommunity(
        runProfile,
        metrics,
        action.result,
        level,
        context.now,
        ticketRewardMultiplier(p.activeRun),
      );
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
      if (map !== "tbilisi") {
        p.maps[map] = {
          level: runProfile.level,
          community: runProfile.community,
        };
        for (const key of ["credits", "boxes", "platinumBoxes", "quests"])
          p[key] = runProfile[key];
      }
      settleEvent(
        p,
        p.activeRun,
        { ...metrics, artifacts: action.metrics.artifacts },
        action.result,
        context.now,
      );
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
    if (action.result === "won" && action.autoOpenBox === true && p.boxes > 0) {
      p.boxes--;
      const items = rollBox(rng);
      for (const reward of items) {
        const key = partKey(reward.part, reward.tier);
        p.inventory[key] = (p.inventory[key] || 0) + 1;
      }
      p.lastBox = { id: action.runId, kind: "level", items };
    }
    syncMilestones(p);
    if (action.metrics) {
      Object.assign(cityCommunity(p, map).lastReward, {
        mysteryBoxes: p.mysteryBoxes - beforeMilestones.mystery,
        specialBoxes: p.specialBoxes - beforeMilestones.special,
        creatorBoxes: p.creatorBoxes - beforeMilestones.creator,
        unlockedCars: p.unlockedCars.filter(
          (id) => !beforeMilestones.cars.includes(id),
        ),
      });
    }
    p.settled.push(action.runId);
    p.settled = p.settled.slice(-128);
  } else throw Error("Unknown garage action.");
  return p;
}
