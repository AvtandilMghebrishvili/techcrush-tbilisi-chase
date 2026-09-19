import test from "node:test";
import assert from "node:assert/strict";
import { ChaseSimulation } from "../dist/simulation.js";
import { ROBOTICS_GEARS } from "../dist/city-brand-sites.js";
import { collectRoboticsRepair } from "../dist/robotics-repair.js";
import { BRIDGE_DECKS } from "../dist/bridge-data.js";
import { ROADS, routeBetween, nearestRoad } from "../dist/city-map.js";
import { unsupportedWater, driveableLine } from "../dist/water.js";
import { terrainBlocked } from "../dist/terrain.js";

test("all new bridge lanes and both bank exits support the complete carriageway", () => {
  for (const deck of BRIDGE_DECKS.filter((b) =>
    b.name.startsWith("RIVERSIDE"),
  )) {
    const road = ROADS.find((r) => r.name.toUpperCase() === deck.name);
    assert.ok(road);
    assert.ok(routeBetween(road.start, road.end).length >= 1);
    for (let d = 0; d <= road.length; d += 2)
      for (const side of [-1, 0, 1]) {
        const lane = side * (road.width / 2 - 2);
        const p = {
          x:
            road.start.x +
            Math.sin(road.angle) * d +
            Math.cos(road.angle) * lane,
          z:
            road.start.z +
            Math.cos(road.angle) * d -
            Math.sin(road.angle) * lane,
        };
        assert.ok(!unsupportedWater(p), `${deck.name} ${d} ${lane}`);
        assert.ok(!terrainBlocked(p, 1));
      }
    assert.ok(driveableLine(road.start, road.end));
  }
});

test("GRA repair instantly restores HP and body once, preserves awards, and resets on a new run", () => {
  const sim = new ChaseSimulation();
  sim.start();
  sim.police = [];
  sim.traffic = [];
  sim.nextWaveAt = Infinity;
  const gear = ROBOTICS_GEARS[0];
  Object.assign(sim.player, {
    x: gear.x,
    z: gear.z,
    health: 37,
    damage: { front: 0.8, rear: 0.3, left: 0.5, right: 0.1, roof: 0.5 },
  });
  sim.update(1 / 120, {});
  assert.equal(sim.player.health, 100);
  assert.ok(Object.values(sim.player.damage).every((v) => v === 0));
  assert.deepEqual(
    sim.gearRepairs.map((g) => g.id),
    [gear.id],
  );
  assert.ok(
    sim.events.includes("GIFT FROM GEORGIAN ROBOTICS ASSOCIATION · HP 100%"),
  );
  sim.player.health = 40;
  const cash = sim.runCash,
    score = sim.score;
  collectRoboticsRepair(sim, sim.player);
  assert.equal(sim.player.health, 40);
  assert.equal(sim.runCash, cash);
  assert.equal(sim.score, score);
  sim.start();
  assert.deepEqual(sim.gearRepairs, []);
});

test("repair sweep catches a fast pass; full health, altitude and water do not waste the gear", () => {
  const sim = new ChaseSimulation();
  sim.start();
  const g = ROBOTICS_GEARS[0],
    p = sim.player;
  Object.assign(p, { x: g.x, z: g.z, health: 100 });
  collectRoboticsRepair(sim, p);
  assert.equal(sim.gearRepairs.length, 0);
  for (const extra of [
    { y: 12 },
    { y: 0, waterAt: 1 },
    { waterAt: null, flipped: true },
  ]) {
    Object.assign(p, { health: 25, ...extra });
    collectRoboticsRepair(sim, p);
    assert.equal(p.health, 25);
  }
  Object.assign(p, {
    health: 25,
    y: 0,
    waterAt: null,
    flipped: false,
    x: g.x + 9,
    z: g.z,
  });
  collectRoboticsRepair(sim, { x: g.x - 9, z: g.z });
  assert.equal(p.health, 100);
});

test("rewind restores the repair monument together with pre-contact HP", () => {
  const sim = new ChaseSimulation();
  sim.start();
  const g = ROBOTICS_GEARS[0];
  Object.assign(sim.player, { x: g.x, z: g.z, health: 30 });
  sim.timeline.frames = [];
  sim.timeline.recordAt = 0;
  sim.timeline.capture(sim);
  collectRoboticsRepair(sim, sim.player);
  assert.equal(sim.player.health, 100);
  sim.timeline.restore(sim, 0);
  assert.equal(sim.player.health, 30);
  assert.deepEqual(sim.gearRepairs, []);
});
