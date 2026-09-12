import test from "node:test";
import assert from "node:assert/strict";
import {
  newProfile,
  migrateProfile,
  applyProgressAction,
  carUnlocked,
  CITY_CARS,
  CAR_IDS,
  PARTS,
  upgradedSpec,
  pursuitTuning,
} from "../dist/progression.js";
import {
  CITY_IDS,
  MAP_COURSES,
  mapUnlocked,
  cityLevel,
} from "../dist/map-selection.js";
import { carSpec } from "../dist/config.js";
import { handleApi, keyHash } from "../server/api.mjs";
import { openLocalDatabase } from "../server/local-db.mjs";
import { resultPage } from "../server/result-page.mjs";
const metrics = (map) => ({
  time: 80,
  score: 18000,
  checkpoints: 6,
  takedowns: 10,
  trafficWrecks: 1,
  distance: 2500,
  driftSeconds: 8,
  jumps: 1,
  topSpeed: 250,
  quests: [],
  timing: { course: MAP_COURSES[map], elapsedMs: 85000, rewinds: 1 },
});
test("three cities are open; bonus and takedown boxes persist while cars await the new level requirements", () => {
  let p = newProfile();
  p.credits = 12345;
  p.cars.gt = { engine: 4, stars: { engine: 3 }, paint: "#123456" };
  p.inventory = { "rims:4": 7 };
  for (const map of CITY_IDS) {
    assert(mapUnlocked(p, map));
    if (map === "tbilisi") p.level = 5;
    else p.maps[map].level = 5;
    p = applyProgressAction(
      p,
      { type: "begin-run", map, car: "gt", course: MAP_COURSES[map] },
      undefined,
      { runId: map + "-test-run", now: 1000 },
    );
    const action = {
      type: "settle",
      runId: p.activeRun.id,
      level: 5,
      result: "won",
      metrics: metrics(map),
    };
    p = applyProgressAction(p, action, undefined, { now: 100000 });
    assert.equal(cityLevel(p, map), 6);
    assert(!p.carBoxes.includes(map));
    assert.deepEqual(
      applyProgressAction(p, action),
      p,
      "replayed settlement adds no reward",
    );
    assert(!carUnlocked(p, CITY_CARS[map]));
    assert.throws(
      () => applyProgressAction(p, { type: "select", car: CITY_CARS[map] }),
      /Unlock/,
    );
    assert.throws(() => applyProgressAction(p, { type: "claim-car-box", map }));
  }
  assert(!carUnlocked(p, "creator"));
  assert.equal(p.mysteryBoxes, 3);
  assert.equal(p.specialBoxes, 3);
  assert.equal(p.creatorBoxes, 3);
  assert.equal(p.creatorMilestones, 3);
  assert.deepEqual(p.cars.gt, {
    engine: 4,
    stars: { engine: 3 },
    paint: "#123456",
  });
  assert.equal(p.inventory["rims:4"], 7);
  for (let i = 0; i < 5; i++) p = migrateProfile(p);
  assert.equal(p.creatorBoxes, 3);
  assert.deepEqual(p.carBoxes, []);
});
test("creator drops can repeat, advanced tiers are exclusive and fused performance remains finite", () => {
  let p = newProfile();
  p.level = 15;
  p.community.takedowns = 10;
  p = migrateProfile(p);
  p = applyProgressAction(
    p,
    { type: "open-creator-box", id: "creator-test" },
    () => 0.999,
  );
  assert.equal(p.lastBox.items.length, 3);
  assert.equal(p.lastBox.items[0].tier, 8);
  assert.deepEqual(p.lastBox.items[0], p.lastBox.items[2]);
  assert.equal(p.creatorBoxes, 0);
  assert.throws(
    () =>
      applyProgressAction(p, {
        type: "equip",
        car: "classic",
        part: "weight",
        tier: 8,
      }),
    /YouTuber/,
  );
  p = applyProgressAction(p, {
    type: "equip",
    car: "creator",
    part: "weight",
    tier: 8,
  });
  assert.equal(p.inventory["weight:8"], 2);
  assert.throws(() =>
    applyProgressAction(p, { type: "upgrade", car: "creator", part: "weight" }),
  );
  for (const id of CAR_IDS) {
    const tier = id === "creator" ? 8 : 5,
      eq = Object.fromEntries(PARTS.map((x) => [x.id, tier]));
    eq.stars = Object.fromEntries(PARTS.map((x) => [x.id, 5]));
    const s = upgradedSpec(carSpec(id), eq);
    assert(s.topSpeed + s.boostSpeed <= 190);
    assert(s.damageScale >= 0.12);
    assert(s.nitroDrain >= 6);
    assert(s.landingScale >= 0.1);
  }
  assert.deepEqual(
    pursuitTuning(9, 82, "batumi"),
    pursuitTuning(9, 82, "kutaisi"),
  );
});
test("Batumi uses the real shared database, stores its rank separately, and serves a private-aware visual PNG result", async () => {
  const db = openLocalDatabase(":memory:"),
    token = "c".repeat(64),
    hash = await keyHash(token);
  let p = newProfile();
  p.maps.batumi.level = 5;
  p.driver = { name: "ქუთაისელი მრბოლელი", avatar: "cyan", listed: true };
  await db
    .prepare(
      "INSERT INTO garages(key_hash,profile,version,updated_at) VALUES(?,?,0,0)",
    )
    .bind(hash, JSON.stringify(p))
    .run();
  let version = 0;
  const api = async (action) => {
    const r = await handleApi(
      new Request("https://game.test/api/action", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ version, id: crypto.randomUUID(), action }),
      }),
      db,
    );
    const data = await r.json();
    assert.equal(r.status, 200, JSON.stringify(data));
    version = data.version;
    return data.profile;
  };
  p = await api({
    type: "begin-run",
    map: "batumi",
    car: "gt",
    course: MAP_COURSES.batumi,
  });
  const run = p.activeRun.id;
  p.activeRun.startedAt = Date.now() - 100000;
  await db
    .prepare("UPDATE garages SET profile=? WHERE key_hash=?")
    .bind(JSON.stringify(p), hash)
    .run();
  p = await api({
    type: "settle",
    runId: run,
    level: 5,
    result: "won",
    metrics: metrics("batumi"),
  });
  assert.equal(p.level, 1);
  assert.equal(p.maps.batumi.level, 6);
  const rank = await (
    await handleApi(
      new Request("https://game.test/api/leaderboard?map=batumi", {
        headers: { Authorization: "Bearer " + token },
      }),
      db,
    )
  ).json();
  assert.equal(rank.total, 1);
  assert.equal(rank.me.level, 6);
  const html = await resultPage(
    new Request("https://game.test/result/" + run),
    db,
  );
  assert.equal(html.status, 200);
  assert((await html.text()).includes(run + "/image.png"));
  const image = await resultPage(
    new Request("https://game.test/result/" + run + "/image.png"),
    db,
  );
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/png");
  const png = new Uint8Array(await image.arrayBuffer());
  assert.deepEqual([...png.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const dv = new DataView(png.buffer);
  assert.equal(dv.getUint32(16), 1200);
  assert.equal(dv.getUint32(20), 630);
  assert(png.length < 150000, "compressed social card");
  await api({
    type: "driver",
    name: "ქუთაისელი მრბოლელი",
    avatar: "cyan",
    listed: false,
  });
  assert.equal(
    (
      await resultPage(
        new Request("https://game.test/result/" + run + "/image.png"),
        db,
      )
    ).status,
    404,
  );
});
