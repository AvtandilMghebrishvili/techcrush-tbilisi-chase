import test from "node:test";
import assert from "node:assert/strict";
import {
  newProfile,
  migrateProfile,
  applyProgressAction,
  carUnlocked,
  upgradedSpec,
  PARTS,
  BOX_TYPES,
  totalBoxes,
} from "../dist/progression.js";
import { carSpec } from "../dist/config.js";
import {
  levelRewards,
  creditAward,
  validateRun,
} from "../dist/community-rules.js";
import { cityCommunity, cityLevel } from "../dist/map-selection.js";
import { ChaseSimulation, vehicle } from "../dist/simulation.js";
import { stepAirborne } from "../dist/stunts.js";
import { breakReward } from "../dist/banner-rules.js";
const metrics = {
  time: 80,
  score: 18000,
  checkpoints: 6,
  takedowns: 0,
  trafficWrecks: 1,
  distance: 2500,
  driftSeconds: 8,
  jumps: 1,
  topSpeed: 250,
};
const at = Date.parse("2026-09-19T12:00:00Z");
function finish(
  p,
  car = "batmobile",
  kills = 0,
  map = "tbilisi",
  rng = () => 0,
) {
  const runId = "bat-run-" + p.settled.length + "-" + car;
  p = applyProgressAction(p, { type: "begin-run", car, map }, undefined, {
    runId,
    now: at,
    preview: map === "rustavi",
  });
  const action = {
    type: "settle",
    runId,
    level: cityLevel(p, map),
    result: "won",
    metrics: {
      ...metrics,
      takedowns: kills,
      score:
        metrics.score * (car === "batmobile" ? 3 : car === "creator" ? 2 : 1),
    },
  };
  const next = applyProgressAction(p, action, rng, { now: at + 100000 });
  assert.deepEqual(
    applyProgressAction(next, action, rng, { now: at + 100001 }),
    next,
    "repeat settlement is inert",
  );
  return next;
}
function profile() {
  const p = newProfile();
  p.level = 25;
  return migrateProfile(p);
}
test("Batmobile unlocks at level 25 in each city; additive migration keeps all existing state", () => {
  for (const map of ["tbilisi", "kutaisi", "batumi", "rustavi"]) {
    let p = newProfile();
    if (map === "tbilisi") p.level = 24;
    else p.maps[map].level = 24;
    p = migrateProfile(p);
    assert(!carUnlocked(p, "batmobile"));
    assert.throws(
      () =>
        applyProgressAction(
          p,
          { type: "begin-run", car: "batmobile", map },
          undefined,
          { runId: "locked-bat", now: at },
        ),
      /Unlock/,
    );
    if (map === "tbilisi") p.level = 25;
    else p.maps[map].level = 25;
    delete p.cars.batmobile;
    delete p.batBoxes;
    delete p.batTakedowns;
    p.cars.creator = { engine: 8, stars: { engine: 3 }, paint: "#aabbcc" };
    p.inventory = { "engine:8": 6 };
    const before = structuredClone(p),
      next = migrateProfile(p);
    assert(carUnlocked(next, "batmobile"));
    assert.deepEqual(p, before);
    for (const key of [
      "credits",
      "inventory",
      "community",
      "maps",
      "quests",
      "driver",
      "settled",
      "activeRun",
    ])
      assert.deepEqual(next[key], p[key], key);
    assert.deepEqual(next.cars.creator, p.cars.creator);
    assert.deepEqual(next.cars.batmobile, {});
    assert.equal(next.batBoxes, 0);
    assert.equal(next.batTakedowns, 0);
    assert.deepEqual(migrateProfile(next), next);
  }
});
test("Batmobile scores 3x and banks 5x ordinary driving cash in every map, without changing Cyber", () => {
  for (const map of ["tbilisi", "kutaisi", "batumi", "rustavi"]) {
    let p = profile();
    const a = finish(p, "coast", 2, map),
      b = finish(p, "batmobile", 2, map),
      c = finish(p, "creator", 2, map);
    assert.equal(b.credits - p.credits, 5 * (a.credits - p.credits));
    assert.equal(c.credits - p.credits, 2 * (a.credits - p.credits));
    assert.equal(
      cityCommunity(b, map).bestScore,
      3 * cityCommunity(a, map).bestScore,
    );
    assert.equal(cityCommunity(b, map).lastReward.multiplier, 5);
    assert.equal(b.batTakedowns, 2);
    assert.equal(c.batTakedowns, 0);
  }
  const normal = new ChaseSimulation(),
    bat = new ChaseSimulation();
  normal.start("coast", { level: 3 });
  bat.start("batmobile", { level: 3 });
  for (const sim of [normal, bat]) {
    const c = sim.police[0];
    c.health = 1;
    c.hitCooldown = 0;
    sim.damagePolice(c, 50);
    breakReward(sim, { bannerId: sim.cashBannerIds[0] });
    breakReward(sim, {});
  }
  assert.equal(bat.score, normal.score * 3);
  assert.equal(bat.runCash, normal.runCash * 5);
  assert.equal(creditAward(150, 3, "batmobile"), creditAward(150, 3) * 5);
  assert.deepEqual(levelRewards(1, "batmobile"), { score: 3, cash: 5 });
});
test("Batmobile milestones span runs, award every 5 and 10 exactly once, and any box kind is possible", () => {
  let p = profile();
  p = finish(p, "batmobile", 4);
  assert.equal(p.batBoxes, 0);
  const before = p;
  p = finish(p, "batmobile", 1);
  assert.equal(p.batTakedowns, 5);
  assert.equal(p.community.lastReward.batBonus.cash, 5000);
  assert.deepEqual(p.community.lastReward.batBonus.randomBoxes, { street: 1 });
  assert.equal(p.boxes - before.boxes, 2);
  assert.equal(p.batBoxes, 0);
  p = finish(p, "creator", 5);
  assert.equal(p.batTakedowns, 5);
  p = finish(p, "batmobile", 5);
  assert.equal(p.batTakedowns, 10);
  assert.equal(p.batBoxes, 1);
  assert.equal(p.community.lastReward.batBoxes, 1);
  assert.equal(p.community.lastReward.batBonus.cash, 5000);
  const kinds = Object.keys(BOX_TYPES);
  for (let i = 0; i < kinds.length; i++) {
    const p = finish(
      profile(),
      "batmobile",
      5,
      "tbilisi",
      () => (i + 0.5) / kinds.length,
    );
    assert.deepEqual(p.community.lastReward.batBonus.randomBoxes, {
      [kinds[i]]: 1,
    });
  }
  assert.equal(totalBoxes({ ...newProfile(), batBoxes: 3 }), 4);
});
test("BAT boxes drop three elite parts, support bulk opening and fit both elite cars without free purchases", () => {
  let p = profile();
  p.batBoxes = 10;
  const before = p.credits;
  p = applyProgressAction(
    p,
    { type: "open-boxes", kind: "bat", count: 10, id: "bat-box-batch" },
    () => 0.999,
  );
  assert.equal(p.batBoxes, 0);
  assert.equal(p.credits, before);
  assert.equal(p.inventory["weight:8"], 30);
  assert.equal(p.lastBox.items[0].quantity, 30);
  p = applyProgressAction(p, {
    type: "equip",
    car: "batmobile",
    part: "weight",
    tier: 8,
  });
  assert.equal(p.cars.batmobile.weight, 8);
  assert.equal(p.inventory["weight:8"], 29);
  p = applyProgressAction(p, {
    type: "fuse",
    car: "batmobile",
    part: "weight",
  });
  assert.equal(p.cars.batmobile.stars.weight, 1);
  assert.throws(
    () => applyProgressAction(p, { type: "buy-box", kind: "bat", count: 1 }),
    /valid/,
  );
  assert.throws(
    () =>
      applyProgressAction(p, {
        type: "equip",
        car: "gt",
        part: "weight",
        tier: 8,
      }),
    /Batmobile/,
  );
});
test("Batmobile armor and police impacts have independent 30% and 40% factors", () => {
  for (const tier of [0, 3, 8]) {
    const eq = Object.fromEntries(PARTS.map((p) => [p.id, tier]));
    eq.stars = Object.fromEntries(PARTS.map((p) => [p.id, 5]));
    assert(
      Math.abs(
        upgradedSpec(carSpec("batmobile"), eq).damageScale /
          upgradedSpec(carSpec("creator"), eq).damageScale -
          0.7,
      ) < 1e-9,
    );
  }
  const damage = (car, credit) => {
    const s = new ChaseSimulation();
    s.start(car);
    const cop = s.police[0];
    cop.health = 100;
    cop.hitCooldown = 0;
    s.damagePolice(cop, 10, credit);
    return 100 - cop.health;
  };
  assert(
    Math.abs(damage("batmobile", true) / damage("creator", true) - 1.4) < 1e-9,
  );
  assert.equal(damage("batmobile", false), damage("creator", false));
});
test("only Batmobile uses airborne turbo; tank empties, gravity remains and release preserves momentum", () => {
  const fly = (car, boost) => {
    const p = vehicle(50000, 50000, 0);
    Object.assign(p, {
      carId: car,
      performance: upgradedSpec(carSpec(car)),
      airborne: true,
      y: 250,
      vy: 0,
      vz: 50,
      rollRate: 0,
      pitchRate: 0,
    });
    for (let i = 0; i < 60; i++)
      stepAirborne(p, { boost, throttle: 0 }, 1 / 60, [], () => {});
    return p;
  };
  const normal = fly("creator", true),
    coast = fly("batmobile", false),
    boost = fly("batmobile", true);
  assert.equal(normal.vz, 50);
  assert.equal(normal.nitro, 100);
  assert(boost.z > coast.z + 3);
  assert(boost.vz > coast.vz + 10);
  assert.equal(boost.y, coast.y);
  assert(boost.y < 250);
  assert.equal(Math.round(boost.nitro), 75);
  const speed = boost.vz;
  stepAirborne(boost, {}, 1 / 60, [], () => {});
  assert.equal(boost.vz, speed);
  assert(!boost.boosting);
  boost.nitro = 0.01;
  stepAirborne(boost, { boost: true }, 1 / 60, [], () => {});
  assert.equal(boost.nitro, 0);
  assert(boost.nitroLocked);
  stepAirborne(boost, { boost: true }, 1 / 60, [], () => {});
  assert(!boost.boosting);
});

test("air-turbo top speed remains bounded and a legal maximum-speed run can bank", () => {
  const p = vehicle(50000, 50000, 0),
    equipment = Object.fromEntries(PARTS.map((x) => [x.id, 8]));
  equipment.stars = Object.fromEntries(PARTS.map((x) => [x.id, 5]));
  Object.assign(p, {
    carId: "batmobile",
    performance: upgradedSpec(carSpec("batmobile"), equipment),
    airborne: true,
    y: 200,
    vy: 0,
    vz: 189,
    vx: 0,
    rollRate: 0,
    pitchRate: 0,
  });
  for (let i = 0; i < 120; i++)
    stepAirborne(p, { boost: true }, 1 / 60, [], () => {});
  assert(p.speed <= 190);
  assert(p.speed > 180);
  assert.doesNotThrow(() =>
    validateRun(
      { ...metrics, topSpeed: p.speed * 3.6 },
      {
        id: "bat-speed-test",
        car: "batmobile",
        level: 25,
        rewardVersion: 1,
        startedAt: at,
      },
      "won",
      at + 100000,
    ),
  );
});

test("live fifth-patrol bonus rewinds with run cash and is awarded once again after rewind", () => {
  const s = new ChaseSimulation();
  s.start("batmobile", { level: 25, batTakedowns: 4 });
  const c = s.police[0];
  c.health = 1;
  c.hitCooldown = 0;
  s.timeline.frames = [];
  s.timeline.recordAt = 0;
  s.timeline.capture(s);
  s.damagePolice(c, 50);
  assert.equal(s.runCash, 5000 + creditAward(350, 25, "batmobile"));
  const cash = s.runCash;
  s.damagePolice(c, 50);
  assert.equal(s.runCash, cash);
  s.timeline.restore(s, 0);
  assert.equal(s.runCash, 0);
  assert.equal(s.takedowns, 0);
  s.damagePolice(s.police[0], 50);
  assert.equal(s.runCash, cash);
});
