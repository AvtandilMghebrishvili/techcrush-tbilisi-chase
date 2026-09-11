import test from "node:test";
import assert from "node:assert/strict";
import { checkpointsForLevel } from "../dist/level-routes.js";
import {
  BUILDINGS,
  START,
  nearestRoad,
  routeBetween,
  containsPoint,
} from "../dist/city-map.js";
import { BRIDGE_BARRIERS } from "../dist/bridge-data.js";
import { ChaseSimulation, vehicle } from "../dist/simulation.js";
import { vehicleContact } from "../dist/contacts.js";
import {
  createAirSupport,
  updateAirSupport,
  airLineOfSight,
} from "../dist/air-support.js";
import { radarPoint, routeDistance } from "../dist/hud-math.js";
import { PARTS } from "../dist/progression.js";
import { carSpec } from "../dist/config.js";
import { upgradeBenefits } from "../dist/garage-presentation.js";

test("levels change checkpoint positions, remain deterministic and use clear connected roads", () => {
  let previous = [];
  for (let level = 1; level <= 20; level++) {
    const points = checkpointsForLevel(level);
    assert.equal(points.length, 6);
    assert.equal(new Set(points.map((p) => `${p.x},${p.z}`)).size, 6);
    assert.deepEqual(points, checkpointsForLevel(level));
    if (previous.length)
      assert(
        points.filter(
          (p) => !previous.some((q) => Math.hypot(p.x - q.x, p.z - q.z) < 1),
        ).length >= 4,
      );
    let from = START;
    for (const p of points) {
      assert(nearestRoad(p).distance < 4);
      assert(
        ![...BUILDINGS, ...BRIDGE_BARRIERS].some((b) =>
          containsPoint(b, p.x, p.z, 2),
        ),
      );
      const route = routeBetween(from, p);
      assert(route.length);
      assert(Math.hypot(route.at(-1).x - p.x, route.at(-1).z - p.z) < 1);
      from = p;
    }
    points[0].x += 9999;
    assert.notEqual(points[0].x, checkpointsForLevel(level)[0].x);
    previous = checkpointsForLevel(level);
  }
});
test("level two introduces SUVs and air support; level three adds heavier blockade tanks", () => {
  const s = new ChaseSimulation();
  s.start("classic", { level: 1 });
  assert.equal(s.helicopter, null);
  assert(s.police.every((c) => c.kind === "sedan"));
  s.start("classic", { level: 2 });
  assert(s.helicopter);
  assert(s.police.some((c) => c.kind === "suv"));
  assert(!s.police.some((c) => c.kind === "tank"));
  const suv = s.police.find((c) => c.kind === "suv");
  assert(suv.maxHealth > 100);
  s.start("classic", { level: 3 });
  const tank = s.police.find((c) => c.kind === "tank");
  assert(tank.mass > suv.mass);
  assert(tank.maxHealth > suv.maxHealth);
  assert.equal(tank.role, "blockade");
  const sedan = s.police.find((c) => c.kind === "sedan");
  assert(tank.speedScale < sedan.speedScale);
  const player = vehicle(tank.x + 0.5, tank.z);
  player.vx = 20;
  assert(vehicleContact(player, tank).touching);
  assert(!vehicleContact(player, tank, false).touching);
  for (let i = 0; i < 5; i++) {
    tank.hitCooldown = 0;
    s.damagePolice(tank, 30);
  }
  assert(tank.destroyed);
  assert.equal(s.takedowns, 1);
  s.damagePolice(tank, 100);
  assert.equal(s.takedowns, 1);
  for (let i = 0; i < 15; i++)
    s.police.push(s.makePolice(i * 12, 0, "blockade"));
  assert.equal(
    s.police.filter((c) => c.kind === "tank" && !c.destroyed).length,
    2,
  );
  s.start("classic", { level: 3 });
  assert(s.police.some((c) => c.kind === "tank"));
});
test("air support uses height-aware sight, remembers the last sighting and can be outrun", () => {
  const p = { x: 0, z: 0 },
    h = createAirSupport(p, 2);
  Object.assign(h, { x: -100, z: 0, y: 54 });
  const wall = { x: -50, z: 0, w: 10, d: 60, h: 45, angle: 0 };
  assert(!airLineOfSight(h, p, [wall]));
  assert(airLineOfSight(h, p, [{ ...wall, h: 4 }]));
  assert(!airLineOfSight(h, p, [{ ...wall, w: 0.2, x: -47.31 }]));
  updateAirSupport(h, p, [], null, 0, 1 / 120, 2);
  assert(h.tracking);
  const seen = { ...h.lastSeen };
  p.x = 400;
  updateAirSupport(h, p, [], null, 1, 1 / 120, 2);
  assert(!h.tracking);
  assert.deepEqual(h.lastSeen, seen);
  for (let i = 0; i < 600; i++) {
    p.x += 65 / 60;
    updateAirSupport(h, p, [], null, 2 + i / 60, 1 / 60, 2);
  }
  assert(!h.tracking);
  assert(Math.hypot(h.x - p.x, h.z - p.z) > 165);
});
test("air sightings block escape, losing air contact permits it, and rewind restores helicopter memory", () => {
  const s = new ChaseSimulation();
  s.start("classic", { level: 2 });
  s.obstacles = [];
  s.police = [];
  s.traffic = [];
  s.trees = [];
  s.poles = [];
  s.checkpoint = 6;
  for (let i = 0; i < 240; i++) s.update(1 / 120);
  assert(s.helicopter.tracking);
  assert.equal(s.escape, 0);
  const frame = s.timeline.frames.at(-1);
  const saved = structuredClone(frame.helicopter);
  s.helicopter.lastSeen.x += 1000;
  s.timeline.restore(s, s.timeline.frames.length - 1);
  assert.deepEqual(s.helicopter, saved);
  s.helicopter.x = s.player.x - 1000;
  s.helicopter.z = s.player.z - 1000;
  s.helicopter.lastSeen = { x: s.helicopter.x, z: s.helicopter.z };
  s.radioContact = null;
  for (let i = 0; i < 120 * 10 && s.phase === "running"; i++) s.update(1 / 120);
  assert.equal(s.phase, "won");
});
test("round radar preserves offscreen bearing and navigation measures road segments", () => {
  const p = radarPoint(715, 915);
  assert(Math.abs(Math.hypot(p.x - 115, p.y - 115) - 101) < 1e-8);
  assert(Math.abs((p.x - 115) / (p.y - 115) - 0.75) < 1e-8);
  assert(p.edge);
  assert.equal(
    routeDistance({ x: 0, z: 0 }, [
      { x: 30, z: 0 },
      { x: 30, z: 40 },
    ]),
    70,
  );
});
test("all fourteen upgrade previews report finite improvements at all four tiers", () => {
  for (const part of PARTS)
    for (let tier = 1; tier <= 4; tier++) {
      const benefits = upgradeBenefits(
        carSpec("classic"),
        { [part.id]: tier - 1 },
        part,
        tier,
      );
      assert(benefits.length > 0);
      for (const value of benefits) {
        assert(!/NaN|Infinity|undefined/.test(value));
        assert(parseFloat(value) > 0, value);
      }
    }
});
