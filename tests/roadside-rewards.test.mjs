import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cashBannerIds,
  breakReward,
  patrolCollisionDamage,
  DECOR_REWARD_LIMIT,
} from "../dist/banner-rules.js";
import { ChaseSimulation } from "../dist/simulation.js";
import { newProfile, applyProgressAction } from "../dist/progression.js";
test("every map provides 48 dry roadside sponsor sites and each run selects exactly three reproducible rewards", () => {
  for (const map of ["tbilisi", "kutaisi", "batumi"]) {
    const r = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `globalThis.location=new URL('http://test/?map=${map}');const {SPONSOR_SITES}=await import('./dist/sponsor-sites.js');const {roadClear}=await import('./dist/road-clearance.js');const {overOpenWater}=await import('./dist/surface-support.js');if(SPONSOR_SITES.length!==48||SPONSOR_SITES.some(p=>!roadClear(p,.6)||overOpenWater(p)))process.exit(1);`,
      ],
      { encoding: "utf8" },
    );
    assert.equal(r.status, 0, map + r.stderr);
  }
  const choices = new Set();
  for (let i = 0; i < 100; i++) {
    const ids = cashBannerIds("run-" + i);
    assert.equal(new Set(ids).size, 3);
    assert(ids.every((n) => n >= 0 && n < 48));
    assert.deepEqual(ids, cashBannerIds("run-" + i));
    choices.add(ids.join(","));
  }
  assert(choices.size > 90);
});
test("linked cash banner contacts pay once immediately and rewind restores both the banner and earnings", () => {
  const sim = new ChaseSimulation(),
    runId = "roadside-rewind",
    id = cashBannerIds(runId)[0];
  sim.start("gt", { runId });
  const x = sim.player.x,
    z = sim.player.z;
  sim.propDefinitions = [0, 1].map((n) => ({
    id: n,
    x: x + n * 0.3,
    z: z + 2.5,
    h: 5.7,
    radius: 0.16,
    breakSpeed: 0.5,
    linked: [0, 1],
    bannerId: id,
    bannerAnchor: n === 0,
  }));
  sim.start("gt", { runId });
  sim.trees = [];
  sim.police = [];
  sim.traffic = [];
  sim.obstacles = [];
  sim.player.angle = 0;
  sim.player.vz = 24;
  sim.player.speed = 24;
  sim.timeline.frames = [];
  sim.timeline.recordAt = 0;
  sim.timeline.capture(sim);
  sim.update(1 / 120, {});
  assert.equal(sim.runCash, 4000);
  assert.deepEqual(sim.cashBanners, [id]);
  assert(sim.poles.every((p) => p.broken));
  sim.update(1 / 120, {});
  assert.equal(sim.runCash, 4000);
  sim.timeline.restore(sim, 0);
  assert.equal(sim.runCash, 0);
  assert.deepEqual(sim.cashBanners, []);
  assert(sim.poles.every((p) => !p.broken));
  sim.update(1 / 120, {});
  assert.equal(sim.runCash, 4000);
});
test("ordinary scenery rewards are modest and bounded; patrol and tank impacts keep distinct caps", () => {
  const sim = new ChaseSimulation();
  sim.start();
  for (let i = 0; i < 150; i++) breakReward(sim, {});
  assert.equal(sim.decorWrecks, DECOR_REWARD_LIMIT);
  assert.equal(sim.runCash, 2500);
  assert.equal(patrolCollisionDamage(50, "sedan"), 10);
  assert.equal(patrolCollisionDamage(50, "suv"), 10);
  assert.equal(patrolCollisionDamage(50, "tank"), 15);
  assert(patrolCollisionDamage(5, "sedan") < 10);
  assert.equal(patrolCollisionDamage(0, "tank"), 0);
});
test("server derives exact roadside cash, rejects duplicate/unselected banners and preserves older clients", () => {
  const now = Date.UTC(2026, 8, 13),
    runId = "roadside-server-run";
  const p = applyProgressAction(
    newProfile(),
    { type: "begin-run", car: "gt" },
    () => 0.5,
    { runId, now: now - 20000 },
  );
  const m = {
    time: 10,
    score: 100,
    checkpoints: 0,
    takedowns: 0,
    trafficWrecks: 0,
    distance: 100,
    driftSeconds: 0,
    jumps: 0,
    topSpeed: 100,
  };
  const action = {
    type: "settle",
    runId,
    level: 1,
    result: "abandoned",
    metrics: m,
  };
  const plain = applyProgressAction(p, action, () => 0.5, { now });
  const paid = applyProgressAction(
    p,
    {
      ...action,
      metrics: { ...m, cashBanners: cashBannerIds(runId), decorWrecks: 4 },
    },
    () => 0.5,
    { now },
  );
  assert.equal(paid.credits - plain.credits, 12100);
  assert.equal(
    applyProgressAction(paid, action, () => 0.5, { now }).credits,
    paid.credits,
  );
  for (const cashBanners of [
    [cashBannerIds(runId)[0], cashBannerIds(runId)[0]],
    [99],
    [...cashBannerIds(runId), 0],
  ])
    assert.throws(
      () =>
        applyProgressAction(
          p,
          { ...action, metrics: { ...m, cashBanners } },
          () => 0.5,
          { now },
        ),
      /roadside/,
    );
  assert.throws(
    () =>
      applyProgressAction(
        p,
        { ...action, metrics: { ...m, decorWrecks: 101 } },
        () => 0.5,
        { now },
      ),
    /roadside/,
  );
});
