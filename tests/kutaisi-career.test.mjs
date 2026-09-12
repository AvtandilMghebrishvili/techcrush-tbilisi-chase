import test from "node:test";
import assert from "node:assert/strict";
import {
  newProfile,
  migrateProfile,
  applyProgressAction,
  rollBox,
  upgradedSpec,
  PARTS,
} from "../dist/progression.js";
import {
  cityLevel,
  cityCommunity,
  mapUnlocked,
  MAP_COURSES,
} from "../dist/map-selection.js";
import { carSpec } from "../dist/config.js";
import { handleApi, keyHash } from "../server/api.mjs";
import { openLocalDatabase } from "../server/local-db.mjs";
import { resultPage } from "../server/result-page.mjs";
const metrics = (map = "kutaisi", quests = []) => ({
  time: 80,
  score: 18000,
  checkpoints: 6,
  takedowns: 1,
  trafficWrecks: 0,
  distance: 2500,
  driftSeconds: 10,
  jumps: 2,
  topSpeed: 250,
  quests,
  timing: { course: MAP_COURSES[map], elapsedMs: 85000, rewinds: 0 },
});
const begin = (p, map = "kutaisi", id = "kutaisi-test-run") =>
  applyProgressAction(
    p,
    { type: "begin-run", map, car: "gt", course: MAP_COURSES[map] },
    undefined,
    { runId: id, now: 1000 },
  );
const settle = (p, quests = []) =>
  applyProgressAction(
    p,
    {
      type: "settle",
      level: p.activeRun.level,
      runId: p.activeRun.id,
      result: "won",
      metrics: metrics(p.activeRun.map, quests),
    },
    undefined,
    { now: 100000 },
  );

test("Kutaisi unlocks only after clearing Tbilisi 3, with server course and city validation", () => {
  const p = newProfile();
  for (const level of [1, 2, 3]) {
    p.level = level;
    assert(!mapUnlocked(p, "kutaisi"));
    assert.throws(() => begin(p), /level 3/);
  }
  const unlocked = settle(begin(p, "tbilisi"));
  assert.equal(unlocked.level, 4);
  assert(mapUnlocked(unlocked, "kutaisi"));
  assert.equal(begin(unlocked).activeRun.level, 1);
  assert.throws(() => begin(unlocked, "batumi"));
  assert.throws(
    () =>
      applyProgressAction(
        unlocked,
        {
          type: "begin-run",
          map: "kutaisi",
          car: "gt",
          course: MAP_COURSES.tbilisi,
        },
        undefined,
        { runId: "wrong-course", now: 1000 },
      ),
    /another city/,
  );
});
test("city levels and records are independent while the original garage is preserved", () => {
  const legacy = newProfile();
  delete legacy.maps;
  delete legacy.platinumBoxes;
  legacy.level = 4;
  legacy.credits = 17000;
  legacy.cars.gt = { engine: 4, rims: 3, paint: "#123456" };
  legacy.inventory = { "spoiler:4": 2 };
  legacy.quests.completed = ["skybox-v1"];
  const p = migrateProfile(legacy),
    before = structuredClone(p.community),
    next = settle(begin(p));
  assert.equal(next.level, 4);
  assert.equal(cityLevel(next, "kutaisi"), 2);
  assert.deepEqual(next.community, before);
  assert.deepEqual(next.cars, legacy.cars);
  assert.deepEqual(next.inventory, legacy.inventory);
  assert(next.credits > legacy.credits);
  assert.equal(
    cityCommunity(next, "kutaisi").lastTime.course,
    MAP_COURSES.kutaisi,
  );
  const back = settle(begin(next, "tbilisi", "return-to-tbilisi"));
  assert.equal(back.level, 5);
  assert.deepEqual(back.maps, next.maps);
});
test("Platinum stunt rewards are city-bound, one-time, random three-part drops and usable on existing cars", () => {
  let p = newProfile();
  p.level = 4;
  assert.throws(() => settle(begin(p), ["skybox-v1"]), /stunt/);
  assert.throws(
    () => settle(begin(p, "tbilisi"), ["kutaisi-skybox-v1"]),
    /stunt/,
  );
  p = settle(begin(p), ["kutaisi-skybox-v1", "rioni-gap-v1"]);
  assert.equal(p.platinumBoxes, 2);
  p = settle(begin(p, "kutaisi", "repeat-stunts"), [
    "kutaisi-skybox-v1",
    "rioni-gap-v1",
  ]);
  assert.equal(p.platinumBoxes, 2);
  const cash = p.credits;
  p = applyProgressAction(p, { type: "open-platinum-box" }, () => 0);
  assert.equal(p.platinumBoxes, 1);
  assert.equal(p.inventory["engine:5"], 3);
  assert.equal(p.lastBox.items.length, 3);
  assert.equal(p.credits, cash);
  p = applyProgressAction(p, {
    type: "equip",
    car: "gt",
    part: "engine",
    tier: 5,
  });
  assert.equal(p.cars.gt.engine, 5);
  assert.equal(p.inventory["engine:5"], 2);
  p = applyProgressAction(p, {
    type: "sell",
    car: "gt",
    part: "engine",
    tier: 5,
  });
  assert.equal(p.credits, cash + 1400);
  p.cars.gt.rims = 4;
  assert.throws(
    () => applyProgressAction(p, { type: "upgrade", car: "gt", part: "rims" }),
    /Platinum/,
  );
  for (let i = 0; i < 100; i++) assert(rollBox().every((x) => x.tier <= 4));
  const base = carSpec("gt"),
    diamond = upgradedSpec(
      base,
      Object.fromEntries(PARTS.map((p) => [p.id, 4])),
    ),
    platinum = upgradedSpec(
      base,
      Object.fromEntries(PARTS.map((p) => [p.id, 5])),
    );
  assert(
    platinum.topSpeed > diamond.topSpeed &&
      platinum.topSpeed < diamond.topSpeed * 1.1,
  );
  assert(platinum.damageScale > 0 && platinum.nitroDrain > 0);
});
test("online city boards and time results remain separate; one identity is counted only once", async (t) => {
  const DB = openLocalDatabase(":memory:");
  t.after(() => DB.close());
  const token = "e".repeat(64);
  let serial = 0;
  const request = (path, method = "GET", body) =>
    handleApi(
      new Request("https://game.test" + path, {
        method,
        headers: { Authorization: "Bearer " + token },
        body: body ? JSON.stringify(body) : undefined,
      }),
      DB,
    );
  await request("/api/profile", "POST");
  const hash = await keyHash(token);
  const action = async (action) => {
    const state = await (await request("/api/profile")).json(),
      r = await request("/api/action", "POST", {
        id: "kutaisi-api-" + ++serial,
        version: state.version,
        action,
      }),
      data = await r.json();
    assert.equal(r.status, 200, JSON.stringify(data));
    return data;
  };
  await action({
    type: "driver",
    name: "City Traveller",
    avatar: "cyan",
    listed: true,
  });
  let p = (await (await request("/api/profile")).json()).profile;
  p.level = 4;
  p.cars.gt.engine = 4;
  await DB.prepare("UPDATE garages SET profile=? WHERE key_hash=?")
    .bind(JSON.stringify(p), hash)
    .run();
  let last;
  for (const map of ["tbilisi", "kutaisi"]) {
    const started = await action({
      type: "begin-run",
      map,
      car: "gt",
      course: MAP_COURSES[map],
    });
    started.profile.activeRun.startedAt = Date.now() - 100000;
    await DB.prepare("UPDATE garages SET profile=? WHERE key_hash=?")
      .bind(JSON.stringify(started.profile), hash)
      .run();
    last = await action({
      type: "settle",
      level: started.profile.activeRun.level,
      runId: started.profile.activeRun.id,
      result: "won",
      metrics: metrics(map),
    });
  }
  assert.equal(last.profile.level, 5);
  assert.equal(last.profile.maps.kutaisi.level, 2);
  for (const [map, level] of [
    ["tbilisi", 4],
    ["kutaisi", 1],
  ]) {
    const b = await (await request("/api/leaderboard?map=" + map)).json();
    assert.equal(b.total, 1);
    assert.equal(b.stats.uniquePlayers, 1);
    assert.equal(b.me.level, level + 1);
    assert.equal(b.me.rank, 1);
    const times = await (
      await request(`/api/leaderboard?map=${map}&mode=times&level=${level}`)
    ).json();
    assert.equal(times.total, 1);
    assert.equal(times.entries[0].durationMs, 85000);
  }
  const wrong = await request(
    "/api/leaderboard?map=kutaisi&mode=times&course=tbilisi-1.14",
  );
  assert.equal(wrong.status, 400);
  const run = last.profile.maps.kutaisi.community.lastTime.runId;
  const result = await (
    await resultPage(new Request("https://game.test/result/" + run), DB)
  ).text();
  assert.match(result, /Kutaisi/i);
  assert.match(result, /map=kutaisi/);
  await action({
    type: "driver",
    name: "Private Traveller",
    avatar: "cyan",
    listed: false,
  });
  for (const map of ["tbilisi", "kutaisi"])
    assert.equal(
      (await (await request("/api/leaderboard?map=" + map)).json()).total,
      0,
    );
});
