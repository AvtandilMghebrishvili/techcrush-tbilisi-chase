import test from "node:test";
import assert from "node:assert/strict";
import {
  BonusFeed,
  BONUS_LIMIT,
  BONUS_LIFETIME,
} from "../dist/score-feedback.js";
import { passedTraffic } from "../dist/near-miss.js";
import { ChaseSimulation, vehicle } from "../dist/simulation.js";

test("point feed preserves separate amounts, bounds bursts and expires only on simulation time", () => {
  const feed = new BonusFeed();
  const events = [
    { kind: "patrol", points: 750, credits: 350 },
    { kind: "near", points: 150, credits: 0 },
  ];
  const rows = feed.update(1, events);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].points, 150);
  assert.equal(rows[1].credits, 350);
  assert.deepEqual(feed.update(1, []), rows, "pause leaves notices unchanged");
  for (let n = 0; n < 100; n++)
    feed.update(1 + n * 0.001, [{ kind: "near", points: 150 }]);
  assert.equal(feed.items.length, BONUS_LIMIT);
  assert.equal(feed.update(1.1 + BONUS_LIFETIME, []).length, 0);
});
test("rewind clears old point notices, accepts re-earned events and ignores malformed notices", () => {
  const feed = new BonusFeed();
  feed.update(5, [{ kind: "patrol", points: 750 }]);
  assert.equal(feed.update(4, [], true).length, 0);
  assert.equal(feed.update(4.1, [{ kind: "near", points: 150 }]).length, 1);
  assert.equal(feed.update(0, []).length, 0);
  feed.update(0, [
    { kind: "unknown", points: 99 },
    { kind: "near", points: 0 },
  ]);
  assert.equal(feed.items.length, 0);
});
test("credited patrol takedowns and traffic wrecks report exactly their awarded amounts once", () => {
  const s = new ChaseSimulation();
  s.start("gt", { level: 2 });
  const c = s.police[0],
    score = s.score,
    cash = s.runCash;
  for (let i = 0; i < 3; i++) {
    c.hitCooldown = 0;
    s.damagePolice(c, 40);
  }
  const e = s.scoreEvents.find((e) => e.kind === "patrol");
  assert.equal(e.points, s.score - score);
  assert.equal(e.credits, s.runCash - cash);
  assert.equal(e.points, 863);
  s.damagePolice(c, 40);
  assert.equal(s.scoreEvents.filter((e) => e.kind === "patrol").length, 1);
  const npc = s.police[1];
  for (let i = 0; i < 3; i++) {
    npc.hitCooldown = 0;
    s.damagePolice(npc, 40, false);
  }
  assert.equal(
    s.scoreEvents.filter((e) => e.kind === "patrol").length,
    1,
    "NPC-only wrecks cannot show fake player points",
  );
  const t = s.traffic[0],
    before = s.runCash;
  for (let i = 0; i < 3; i++) {
    t.hitCooldown = 0;
    s.damageTraffic(t, 40);
  }
  const traffic = s.scoreEvents.find((e) => e.kind === "traffic");
  assert.equal(traffic.points, 0);
  assert.equal(traffic.credits, s.runCash - before);
  assert.equal(traffic.credits, 132);
  for (let i = 0; i < 100; i++) s.scoreFeedback("near", 150);
  assert.equal(s.scoreEvents.length, 16);
});
test("actual near passes work at every heading without repeat, collision, following or teleport bonuses", () => {
  for (const a of [0, 0.7, Math.PI / 2, Math.PI, 5.9])
    for (const reverse of [false, true]) {
      const world = (side, along) => ({
        x: Math.cos(a) * side + Math.sin(a) * along,
        z: -Math.sin(a) * side + Math.cos(a) * along,
      });
      const oldP = world(0, -0.4),
        oldT = world(4, reverse ? 0.5 : 0),
        p = {
          ...vehicle(),
          ...world(0, 0),
          angle: a,
          speed: 40,
          vx: Math.sin(a) * 40,
          vz: Math.cos(a) * 40,
        };
      const t = {
        ...vehicle(),
        ...world(4, -0.2),
        angle: a + (reverse ? Math.PI : 0),
        vx: Math.sin(a) * (reverse ? -20 : 20),
        vz: Math.cos(a) * (reverse ? -20 : 20),
      };
      assert(passedTraffic(p, t, oldP, oldT, 1));
      assert(!passedTraffic(p, t, oldP, oldT, 1.1));
      t.nearMiss = false;
      t.nearHitAt = 0.9;
      assert(!passedTraffic(p, t, oldP, oldT, 1));
      t.nearHitAt = -100;
      assert(!passedTraffic(p, t, world(0, -100), oldT, 1));
      t.vx = p.vx;
      t.vz = p.vz;
      assert(!passedTraffic(p, t, oldP, oldT, 1));
    }
});
test("near misses award on a real physics crossing and re-earn only after rewind", () => {
  const s = new ChaseSimulation();
  s.start();
  s.activatePursuit("checkpoint");
  s.police = [];
  s.obstacles = [];
  s.trees = [];
  s.poles = [];
  const p = s.player,
    t = s.traffic[0];
  s.traffic = [t];
  Object.assign(t, {
    x: p.x + 4,
    z: p.z + 0.12,
    angle: 0,
    vx: 0,
    vz: 0,
    cruise: 0,
    nearMiss: false,
    nearHitAt: -100,
  });
  Object.assign(p, { angle: 0, vx: 0, vz: 35, speed: 35 });
  s.timeline.frames = [];
  s.timeline.recordAt = 0;
  s.timeline.capture(s);
  s.update(1 / 120, { throttle: 1 });
  assert.equal(s.scoreEvents.filter((e) => e.kind === "near").length, 1);
  assert.equal(s.scoreEvents.find((e) => e.kind === "near").points, 150);
  const score = s.score;
  s.timeline.restore(s, 0);
  assert.equal(s.scoreEvents.length, 0);
  assert(s.score < score);
  s.update(1 / 120, { throttle: 1 });
  assert.equal(s.scoreEvents.filter((e) => e.kind === "near").length, 1);
});
