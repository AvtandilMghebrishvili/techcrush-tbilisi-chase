import { EXTRA_ROOFTOP_LAYOUTS } from "./extra-rooftops.js";
import {
  cashBannerIds,
  CASH_BANNER_REWARD,
  DECOR_REWARD,
  DECOR_REWARD_LIMIT,
} from "./banner-rules.js";
import { TIME_COURSES } from "./race-timing.js";
import { carRewardMultiplier, ticketRewardMultiplier } from "./car-bonuses.js";
export const STUNT_REWARDS = {
  ...Object.fromEntries(
    Object.entries(EXTRA_ROOFTOP_LAYOUTS).flatMap(([map, sites]) =>
      sites.map((p, i) => [
        `${map}-skybox-${i + 2}-v1`,
        { map, cash: 2500, boxes: 0, platinum: 1, name: p[3] + " Skybox" },
      ]),
    ),
  ),
  "rustavi-skybox-v1": {
    cash: 2500,
    boxes: 0,
    platinum: 1,
    name: "Steelworks skybox",
    map: "rustavi",
  },
  "batumi-skybox-v1": {
    cash: 3500,
    boxes: 0,
    platinum: 1,
    map: "batumi",
    name: "Coast skybox",
  },
  "tbilisi-skybox-v1": { cash: 2500, boxes: 1, name: "Skybox" },
  "mtkvari-gap-v1": { cash: 1500, boxes: 1, name: "Mtkvari gap" },
  "kutaisi-skybox-v1": {
    cash: 2500,
    boxes: 0,
    platinum: 1,
    map: "kutaisi",
    name: "Rioni Skybox",
  },
  "rioni-gap-v1": {
    cash: 1500,
    boxes: 0,
    platinum: 1,
    map: "kutaisi",
    name: "Rioni Gap",
  },
};
// Shared community rules. Public standings use banked runs, never private keys.
export function levelRewards(level = 1, car) {
  const n = Math.max(1, Math.floor(level));
  const bonus = carRewardMultiplier(car);
  return {
    score: (1 + (n - 1) * 0.15) * bonus,
    cash: (1 + (n - 1) * 0.1) * bonus,
  };
}
export const creditAward = (base, level, car) =>
  Math.round(base * levelRewards(level).cash) * carRewardMultiplier(car);
export const clearReward = (level) => creditAward(1800 + level * 250, level);
export function weekKey(now = Date.now()) {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export const AVATARS = ["red", "cyan", "gold", "violet", "green", "orange"];
export function normalizeName(value) {
  if (typeof value !== "string") throw Error("Choose a driver name.");
  const name = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (
    [...name].length < 2 ||
    [...name].length > 20 ||
    !/^[\p{L}\p{M}\p{N} _.'-]+$/u.test(name)
  )
    throw Error("Use 2–20 letters or numbers. Georgian names are welcome.");
  return name;
}
export function newCommunity(level = 1) {
  return {
    runs: 0,
    wins: 0,
    bestScore: 0,
    totalScore: 0,
    furthestLevel: level,
    checkpoints: 0,
    totalCheckpoints: 0,
    takedowns: 0,
    distance: 0,
    driftSeconds: 0,
    jumps: 0,
    topSpeed: 0,
    streak: 0,
    bestStreak: 0,
    badges: [],
    week: "",
    weekScore: 0,
    weekWins: 0,
    lastDaily: "",
    lastReward: null,
    lastTime: null,
  };
}
export const ACHIEVEMENTS = [
  {
    id: "first-escape",
    name: "First escape",
    detail: "Clear your first level",
    metric: "wins",
    target: 1,
    reward: 250,
  },
  {
    id: "gate-runner",
    name: "Gate runner",
    detail: "Bank 30 checkpoints",
    metric: "totalCheckpoints",
    target: 30,
    reward: 400,
  },
  {
    id: "cop-breaker",
    name: "Patrol breaker",
    detail: "Take down 10 patrols",
    metric: "takedowns",
    target: 10,
    reward: 400,
  },
  {
    id: "drift-club",
    name: "Drift club",
    detail: "Drift for 60 seconds",
    metric: "driftSeconds",
    target: 60,
    reward: 400,
  },
  {
    id: "air-time",
    name: "Air time",
    detail: "Land 10 jumps upright",
    metric: "jumps",
    target: 10,
    reward: 400,
  },
  {
    id: "speed-club",
    name: "300 club",
    detail: "Reach 300 km/h",
    metric: "topSpeed",
    target: 300,
    reward: 500,
  },
  {
    id: "city-legend",
    name: "City legend",
    detail: "Reach level 5",
    metric: "furthestLevel",
    target: 5,
    reward: 750,
  },
  {
    id: "untouchable",
    name: "Untouchable",
    detail: "Clear 3 levels in a row",
    metric: "bestStreak",
    target: 3,
    reward: 600,
  },
];
export function driverTitle(c) {
  return c.furthestLevel >= 10
    ? "TBILISI LEGEND"
    : c.furthestLevel >= 5
      ? "MOST WANTED"
      : c.wins >= 3
        ? "ESCAPE ARTIST"
        : c.wins
          ? "STREET RACER"
          : "ROOKIE";
}
// Server-side plausibility checks. Browser physics is not an authoritative anti-cheat server.
export function validateRun(metrics, ticket, result, now = Date.now()) {
  if (!metrics || typeof metrics !== "object")
    throw Error("Run details are missing.");
  const m = {};
  const limits = {
    time: 21600,
    score: 1e9,
    checkpoints: 6,
    takedowns: 5000,
    trafficWrecks: 5000,
    distance: 4e6,
    driftSeconds: 21600,
    jumps: 5000,
    topSpeed: 650,
  };
  for (const [key, max] of Object.entries(limits)) {
    const value = metrics[key];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > max
    )
      throw Error("This run contains invalid results.");
    m[key] = value;
  }
  for (const key of [
    "score",
    "checkpoints",
    "takedowns",
    "trafficWrecks",
    "jumps",
  ])
    if (!Number.isInteger(m[key]))
      throw Error("This run contains invalid counters.");
  const banners = metrics.cashBanners ?? [],
    decor = metrics.decorWrecks ?? 0;
  const allowed = cashBannerIds(ticket.id);
  if (
    !Array.isArray(banners) ||
    banners.length > 3 ||
    new Set(banners).size !== banners.length ||
    banners.some((id) => !allowed.includes(id)) ||
    !Number.isInteger(decor) ||
    decor < 0 ||
    decor > DECOR_REWARD_LIMIT ||
    decor > m.time * 12 + 5
  )
    throw Error("Invalid roadside rewards.");
  m.cashBanners = banners;
  m.decorWrecks = decor;
  // GREX can legitimately destroy the whole bounded patrol pool in one tick.
  // Older clients omit this counter; they keep their original validation limits.
  const pulses = metrics.grexPulses ?? [];
  if (
    !Array.isArray(pulses) ||
    pulses.length > 3 ||
    new Set(pulses).size !== pulses.length ||
    pulses.some((id) => !Number.isInteger(id) || id < 0 || id > 2)
  )
    throw Error("Invalid GREX activations.");
  m.grexPulses = pulses;
  const grexAllowance =
    pulses.length * (12 + Math.min(10, Math.floor((ticket.level - 1) / 2)));
  const elapsed = Math.max(0, (now - ticket.startedAt) / 1000);
  if (
    m.time > elapsed + 2 ||
    m.time > 21600 ||
    m.driftSeconds > m.time + 0.1 ||
    m.distance > m.time * 190 + 40 ||
    m.jumps > m.time / 0.3 + 1 ||
    m.takedowns > m.time * 2 + 1 + grexAllowance ||
    m.trafficWrecks > m.time * 3 + 1 ||
    (result === "won" && (m.checkpoints !== 6 || m.time < 8)) ||
    m.score >
      (m.distance * 3.5 +
        m.time * 450 +
        m.checkpoints * 1800 +
        6000 +
        grexAllowance * 750) *
        levelRewards(ticket.level).score *
        ticketRewardMultiplier(ticket)
  )
    throw Error("This run could not be verified. Please start a new chase.");
  const quests = metrics.quests ?? [];
  if (
    !Array.isArray(quests) ||
    quests.length >
      Object.values(STUNT_REWARDS).filter(
        (q) => (q.map || "tbilisi") === (ticket.map || "tbilisi"),
      ).length ||
    new Set(quests).size !== quests.length ||
    quests.some(
      (id) =>
        !Object.hasOwn(STUNT_REWARDS, id) ||
        (STUNT_REWARDS[id].map || "tbilisi") !== (ticket.map || "tbilisi"),
    )
  )
    throw Error("Invalid stunt challenge.");
  if (
    quests.length &&
    (m.jumps < quests.length || m.time < 3 || m.topSpeed < 180)
  )
    throw Error("The stunt landing could not be verified.");
  m.quests = quests;
  if (metrics.timing != null) {
    const t = metrics.timing;
    if (
      !t ||
      !TIME_COURSES.includes(t.course) ||
      ticket.course !== t.course ||
      !Number.isSafeInteger(t.elapsedMs) ||
      t.elapsedMs < 0 ||
      t.elapsedMs > 21600000 ||
      t.elapsedMs + 250 < m.time * 1000 ||
      t.elapsedMs > elapsed * 1000 + 2000 ||
      !Number.isSafeInteger(t.rewinds) ||
      t.rewinds < 0 ||
      t.rewinds > t.elapsedMs / 100 + 1
    )
      throw Error("Invalid level timing. Please start a new chase.");
    m.timing = {
      course: t.course,
      elapsedMs: Math.ceil(t.elapsedMs / 10) * 10,
      rewinds: t.rewinds,
    };
  }
  return m;
}
export function settleCommunity(
  p,
  m,
  result,
  level,
  now = Date.now(),
  multiplier = 1,
) {
  const c = p.community,
    won = result === "won",
    day = new Date(now).toISOString().slice(0, 10),
    week = weekKey(now);
  const cash =
    multiplier *
    ((m.cashBanners?.length || 0) * CASH_BANNER_REWARD +
      (m.decorWrecks || 0) * DECOR_REWARD +
      creditAward(150, level) * m.checkpoints +
      creditAward(350, level) * m.takedowns +
      creditAward(120, level) * m.trafficWrecks +
      (won ? creditAward(800, level) : 0));
  const bonus = won ? clearReward(level) * multiplier : 0;
  p.credits += cash + bonus;
  c.runs++;
  c.wins += Number(won);
  c.totalScore += m.score;
  c.bestScore = Math.max(c.bestScore, m.score);
  c.totalCheckpoints += m.checkpoints;
  c.takedowns += m.takedowns;
  c.distance += Math.floor(m.distance);
  c.driftSeconds += m.driftSeconds;
  c.jumps += m.jumps;
  c.topSpeed = Math.max(c.topSpeed, m.topSpeed);
  c.streak = won ? c.streak + 1 : 0;
  c.bestStreak = Math.max(c.bestStreak, c.streak);
  if (week !== c.week) {
    c.week = week;
    c.weekScore = 0;
    c.weekWins = 0;
  }
  c.weekScore += m.score;
  c.weekWins += Number(won);
  if (won) {
    p.level++;
    p.boxes++;
  }
  const reached = won ? level + 1 : level;
  if (reached > c.furthestLevel) {
    c.furthestLevel = reached;
    c.checkpoints = won ? 0 : m.checkpoints;
  } else if (reached === c.furthestLevel)
    c.checkpoints = Math.max(c.checkpoints, won ? 0 : m.checkpoints);
  const daily = won && c.lastDaily !== day ? 500 * multiplier : 0;
  if (daily) c.lastDaily = day;
  const streakBox = won && c.streak % 3 === 0 ? 1 : 0;
  p.boxes += streakBox;
  const unlocked = ACHIEVEMENTS.filter(
    (a) => !c.badges.includes(a.id) && c[a.metric] >= a.target,
  );
  c.badges.push(...unlocked.map((a) => a.id));
  const badgeCash = unlocked.reduce((n, a) => n + a.reward, 0) * multiplier;
  p.credits += daily + badgeCash;
  const stuntIds = (m.quests || []).filter(
    (id) => !p.quests.completed.includes(id),
  );
  const stuntCash =
    multiplier * stuntIds.reduce((sum, id) => sum + STUNT_REWARDS[id].cash, 0);
  const stuntBoxes = stuntIds.reduce((n, id) => n + STUNT_REWARDS[id].boxes, 0);
  const platinumBoxes = stuntIds.reduce(
    (n, id) => n + (STUNT_REWARDS[id].platinum || 0),
    0,
  );
  p.platinumBoxes = (p.platinumBoxes || 0) + platinumBoxes;
  p.quests.completed.push(...stuntIds);
  p.credits += stuntCash;
  p.boxes += stuntBoxes;
  c.lastReward = {
    multiplier,
    cash: cash + bonus + daily + badgeCash + stuntCash,
    stunts: stuntIds,
    runCash: cash,
    clear: bonus,
    daily,
    boxes: Number(won) + streakBox + stuntBoxes,
    platinumBoxes,
    badges: unlocked.map((a) => a.id),
    score: m.score,
    streak: c.streak,
  };
  return c.lastReward;
}
