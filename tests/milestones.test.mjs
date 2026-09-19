import { EVENT_END } from "../dist/event-rules.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  newProfile,
  migrateProfile,
  applyProgressAction,
  carUnlocked,
  CAR_IDS,
  CITY_CARS,
  MILESTONE_BOXES,
} from "../dist/progression.js";
import { CITY_IDS, cityLevel, cityCommunity } from "../dist/map-selection.js";
import { handleApi, keyHash } from "../server/api.mjs";
import { openLocalDatabase } from "../server/local-db.mjs";
const setLevel = (p, map, level) => {
  if (map === "tbilisi") p.level = level;
  else p.maps[map].level = level;
};
const metrics = {
  time: 80,
  score: 18000,
  checkpoints: 6,
  takedowns: 0,
  trafficWrecks: 0,
  distance: 2500,
  driftSeconds: 8,
  jumps: 1,
  topSpeed: 250,
};
function win(profile, map) {
  const p = applyProgressAction(
    profile,
    { type: "begin-run", map, car: "classic" },
    undefined,
    {
      runId: `milestone-${map}-${cityLevel(profile, map)}`,
      now: EVENT_END + 1000,
    },
  );
  const action = {
    type: "settle",
    runId: p.activeRun.id,
    level: cityLevel(p, map),
    result: "won",
    metrics,
    autoOpenBox: true,
  };
  const next = applyProgressAction(p, action, () => 0.8, {
    now: EVENT_END + 100000,
  });
  assert.deepEqual(
    applyProgressAction(next, action),
    next,
    "settlement replay cannot duplicate milestone rewards",
  );
  return next;
}
for (const map of CITY_IDS)
  test(`${map}: entering 10 unlocks ordinary fleet, entering 15 unlocks TECHCRUSH`, () => {
    let p = newProfile();
    setLevel(p, map, 9);
    p = migrateProfile(p);
    assert(!carUnlocked(p, "falcon"));
    assert(!carUnlocked(p, "creator"));
    assert.throws(
      () => applyProgressAction(p, { type: "select", car: "creator" }),
      /Unlock/,
    );
    p = win(p, map);
    assert.equal(cityLevel(p, map), 10);
    for (const id of CAR_IDS.filter((id) => id !== "creator"))
      assert(carUnlocked(p, id), id);
    assert(!carUnlocked(p, "creator"));
    assert.deepEqual(
      new Set(cityCommunity(p, map).lastReward.unlockedCars),
      new Set(Object.values(CITY_CARS)),
    );
    assert.equal(cityCommunity(p, map).lastReward.mysteryBoxes, 1);
    assert.equal(cityCommunity(p, map).lastReward.specialBoxes, 1);
    assert.equal(p.lastBox.kind, "level", "ordinary immediate box still opens");
    setLevel(p, map, 14);
    p = migrateProfile(p);
    assert(!carUnlocked(p, "creator"));
    p = win(p, map);
    assert(carUnlocked(p, "creator"));
    assert.deepEqual(cityCommunity(p, map).lastReward.unlockedCars, [
      "creator",
    ]);
    assert.equal(
      applyProgressAction(p, { type: "select", car: "creator" }).selectedCar,
      "creator",
    );
  });
test("bonus boxes arrive on entering each fifth level, independently in every city, without per-level loops", () => {
  let p = newProfile();
  for (const map of CITY_IDS) {
    setLevel(p, map, 4);
    p = migrateProfile(p);
    const before = p.mysteryBoxes;
    p = win(p, map);
    assert.equal(p.mysteryBoxes, before + 1);
    assert.equal(p.specialBoxes, p.mysteryBoxes);
    p = win(p, map);
    assert.equal(cityCommunity(p, map).lastReward.mysteryBoxes, 0);
  }
  assert.equal(p.mysteryBoxes, CITY_IDS.length);
  assert.deepEqual(p.carBoxes, []);
  setLevel(p, "batumi", 1000000);
  p = migrateProfile(p);
  assert.equal(p.mysteryBoxes, 200000 + CITY_IDS.length - 1);
  assert.equal(Object.keys(p.levelMilestones).length, CITY_IDS.length);
  assert.deepEqual(migrateProfile(p), p);
});
test("legacy migration preserves claimed and pending cars, equipment, wallet, inventory and retroactive milestones", () => {
  const old = newProfile();
  old.schema = 5;
  delete old.levelMilestones;
  delete old.mysteryBoxes;
  delete old.specialBoxes;
  old.level = 6;
  old.maps.kutaisi.level = 15;
  old.maps.batumi.level = 6;
  old.unlockedCars = ["falcon"];
  old.claimedCityCars = ["tbilisi"];
  old.community.takedowns = 10;
  old.cars.gt = { engine: 4, stars: { engine: 3 }, paint: "#123456" };
  old.inventory = { "rims:4": 7 };
  old.credits = 12345;
  const original = structuredClone(old);
  let p = migrateProfile(old);
  assert.deepEqual(old, original);
  assert.equal(p.schema, 6);
  assert.equal(p.credits, 12345);
  assert.deepEqual(p.cars.gt, old.cars.gt);
  assert.deepEqual(p.inventory, old.inventory);
  assert.equal(p.mysteryBoxes, 5);
  assert.equal(p.specialBoxes, 5);
  for (const id of CAR_IDS) assert(carUnlocked(p, id));
  assert(p.carBoxes.includes("batumi"));
  p = applyProgressAction(p, { type: "claim-car-box", map: "batumi" });
  p = applyProgressAction(
    p,
    { type: "open-mystery-box", id: "legacy-open-01" },
    () => 0,
  );
  const once = structuredClone(p);
  for (let i = 0; i < 10; i++) p = migrateProfile(p);
  assert.deepEqual(p, once);
  // Old eligibility remains honored even below the new level threshold.
  const early = newProfile();
  early.schema = 5;
  early.level = 6;
  early.community.takedowns = 10;
  const upgraded = migrateProfile(early);
  assert(carUnlocked(upgraded, "creator"));
  assert.deepEqual(upgraded.carBoxes, ["tbilisi"]);
  assert(
    carUnlocked(
      applyProgressAction(upgraded, { type: "claim-car-box", map: "tbilisi" }),
      "falcon",
    ),
  );
});
test("new takedown boxes do not bypass the level-15 car lock", () => {
  let p = newProfile();
  p.community.takedowns = 20;
  p = migrateProfile(p);
  assert.equal(p.creatorBoxes, 2);
  assert(!carUnlocked(p, "creator"));
  p = applyProgressAction(
    p,
    { type: "open-creator-box", id: "creator-locked-01" },
    () => 0.999,
  );
  assert.equal(p.inventory["weight:8"], 3);
  assert.throws(
    () =>
      applyProgressAction(p, {
        type: "equip",
        car: "creator",
        part: "weight",
        tier: 8,
      }),
    /Unlock/,
  );
});
for (const [kind, box] of Object.entries(MILESTONE_BOXES))
  test(`${kind}: one coin award plus three independent high-tier parts, with exact odds boundaries`, () => {
    const ranges =
      kind === "mystery"
        ? [
            [0, 3],
            [0.4999, 3],
            [0.5, 4],
            [0.8999, 4],
            [0.9, 5],
            [0.99999, 5],
          ]
        : [
            [0, 4],
            [0.6499, 4],
            [0.65, 5],
            [0.99999, 5],
          ];
    for (const [r, tier] of ranges) {
      let p = newProfile();
      p.level = 5;
      p = migrateProfile(p);
      const initial = p.credits;
      const rolls = [r, 0, r, 0, r, 0, r];
      p = applyProgressAction(
        p,
        { type: `open-${kind}-box`, id: `${kind}-boundary` },
        () => rolls.shift(),
      );
      assert.equal(p[box.field], 0);
      assert.equal(p.lastBox.credits, p.credits - initial);
      assert(
        p.lastBox.credits >= box.cashMin && p.lastBox.credits <= box.cashMax,
      );
      assert.deepEqual(p.lastBox.items, [
        { part: "engine", tier },
        { part: "engine", tier },
        { part: "engine", tier },
      ]);
      assert.equal(p.inventory[`engine:${tier}`], 3);
      assert.throws(
        () =>
          applyProgressAction(p, {
            type: `open-${kind}-box`,
            id: "no-extra-box",
          }),
        /Reach level/,
      );
      p = applyProgressAction(p, {
        type: "claim-loot",
        car: "classic",
        boxId: p.lastBox.id,
        index: 0,
        choice: "equip",
      });
      assert.equal(p.cars.classic.engine, tier);
      assert.equal(p.inventory[`engine:${tier}`], 2);
      assert.throws(
        () =>
          applyProgressAction(p, {
            type: "claim-loot",
            car: "classic",
            boxId: p.lastBox.id,
            index: 0,
            choice: "sell",
          }),
        /already/,
      );
    }
  });
test("real API persists migrated milestone boxes, retries once, and rejects concurrent stale spending", async () => {
  const db = openLocalDatabase(":memory:"),
    token = "d".repeat(64);
  let p = newProfile();
  p.schema = 5;
  p.level = 10;
  await db
    .prepare(
      "INSERT INTO garages(key_hash,profile,version,updated_at) VALUES(?,?,0,0)",
    )
    .bind(await keyHash(token), JSON.stringify(p))
    .run();
  const req = async (path, body) => {
    const response = await handleApi(
      new Request("https://game.test" + path, {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      db,
    );
    return { status: response.status, ...(await response.json()) };
  };
  const a = await req("/api/profile");
  assert.equal(a.profile.mysteryBoxes, 2);
  assert(carUnlocked(a.profile, "coast"));
  assert(!carUnlocked(a.profile, "creator"));
  const action = {
    id: "milestone-api-open-01",
    version: a.version,
    action: { type: "open-special-box" },
  };
  const b = await req("/api/action", action);
  assert.equal(b.status, 200);
  assert.equal(b.profile.specialBoxes, 1);
  assert(b.profile.lastBox.credits >= 4000);
  const retry = await req("/api/action", action);
  assert.deepEqual(retry.profile, b.profile);
  assert.equal(retry.version, b.version);
  const conflict = await req("/api/action", {
    ...action,
    id: "milestone-api-open-02",
  });
  assert.equal(conflict.status, 409);
  const reload = await req("/api/profile");
  assert.deepEqual(reload.profile, b.profile);
  const [c, d] = await Promise.all([
    req("/api/action", {
      id: "milestone-api-race-01",
      version: b.version,
      action: { type: "open-special-box" },
    }),
    req("/api/action", {
      id: "milestone-api-race-02",
      version: b.version,
      action: { type: "open-special-box" },
    }),
  ]);
  assert.deepEqual([c.status, d.status].sort(), [200, 409]);
  const final = await req("/api/profile");
  assert.equal(final.profile.specialBoxes, 0);
  assert.equal(final.profile.mysteryBoxes, 2);
  assert.equal(final.profile.schema, 6);
});
