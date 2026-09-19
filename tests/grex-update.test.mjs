import test from "node:test";
import assert from "node:assert/strict";
import { activeRepairCount, canBreakRail } from "../dist/brand-rules.js";
import { stepWater } from "../dist/water.js";
import { collectRoboticsRepair } from "../dist/robotics-repair.js";
import { ROBOTICS_GEARS, GREX_MONUMENTS } from "../dist/city-brand-sites.js";
import { collectGrexPulse, returnGrexPatrols } from "../dist/grex-pulse.js";
import { ChaseSimulation } from "../dist/simulation.js";
import { RewindTimeline } from "../dist/rewind.js";
import { createAirSupport, updateAirSupport } from "../dist/air-support.js";
import { cablePoint, cabinProgress } from "../dist/cable-path.js";
import { BANK_SITE, BANK_PLAZA } from "../dist/tbilisi-world-sites.js";
import { BUILDINGS, ROADS } from "../dist/city-map.js";
import { footprintsOverlap } from "../dist/map-clearance.js";
import { unsupportedWater } from "../dist/water.js";

test("repair level boundaries activate exactly 1, 2 or 3 collectable gears", () => {
  for (const [level, count] of [
    [1, 1],
    [4, 1],
    [5, 2],
    [9, 2],
    [10, 3],
    [100, 3],
  ]) {
    assert.equal(activeRepairCount(level), count);
    const sim = new ChaseSimulation();
    sim.start();
    sim.level = level;
    for (const site of ROBOTICS_GEARS) {
      Object.assign(sim.player, { x: site.x, z: site.z, health: 25 });
      collectRoboticsRepair(sim, sim.player);
      assert.equal(sim.player.health, site.id < count ? 100 : 25);
    }
    assert.equal(sim.gearRepairs.length, count);
  }
});
test("water entry carries launch momentum to the splash and then dissipates it", () => {
  const slow = { x: 0, z: 0, y: 0, vx: 20, vz: 10, vy: 0, waterAge: 0 };
  const fast = { ...slow, vx: 60, vz: 30 };
  for (let i = 0; i < 60; i++) {
    stepWater(slow, 1 / 60);
    stepWater(fast, 1 / 60);
  }
  assert.equal(fast.vx, 60);
  assert.equal(fast.vz, 30);
  assert(Math.abs(fast.x - slow.x * 3) < 1e-7);
  assert(fast.y < -4 && fast.y > -5.8);
  const enteredX = fast.x;
  for (let i = 0; i < 120; i++) stepWater(fast, 1 / 60);
  assert(fast.x > enteredX + 10);
  assert(fast.vx < 1);
  assert(fast.y <= -8);
});
test("bridge break thresholds distinguish square impacts, glancing impacts and softer entrances", () => {
  const square = (k) => ({ vx: k / 3.6, vz: 0 });
  for (const entrance of [false, true])
    assert(!canBreakRail(square(40), { entrance }, 40 / 3.6));
  assert(!canBreakRail(square(150), {}, 150 / 3.6));
  assert(canBreakRail(square(190), {}, 190 / 3.6));
  assert(canBreakRail(square(100), { entrance: true }, 100 / 3.6));
  const side = (k) => ({
    vx: (k / 3.6) * 0.25,
    vz: (k / 3.6) * Math.sqrt(1 - 0.25 ** 2),
  });
  assert(!canBreakRail(side(250), {}, side(250).vx));
  assert(canBreakRail(side(290), {}, side(290).vx));
  assert(
    !canBreakRail({ vx: 2, vz: 100 }, { entrance: true }, 2),
    "a shallow scrape never breaks",
  );
});
test("GREX clears tanks, patrols and helicopter; eight seconds later safe, separated pursuers return", () => {
  const sim = new ChaseSimulation();
  sim.start();
  sim.level = 3;
  const site = GREX_MONUMENTS[0];
  Object.assign(sim.player, site, { health: 100 });
  sim.helicopter = createAirSupport(sim.player, 3);
  sim.police = [
    sim.makePolice(site.x + 100, site.z + 150, "blockade"),
    sim.makePolice(site.x - 100, site.z - 150, "pursuit"),
  ];
  assert(sim.police.some((c) => c.kind === "tank"));
  const timeline = new RewindTimeline();
  timeline.capture(sim);
  collectGrexPulse(sim, sim.player);
  assert.equal(sim.player.health, 50);
  assert.equal(sim.grexTriggers.length, 1);
  assert(sim.police.every((c) => c.destroyed && c.respawnAt === 8));
  assert(sim.helicopter.destroyed);
  assert(sim.explosions.some((e) => e.y === 50));
  collectGrexPulse(sim, sim.player);
  assert.equal(sim.player.health, 50);
  const n = sim.police.length;
  sim.addReinforcement("pursuit", 100);
  assert.equal(sim.police.length, n);
  const startY = sim.helicopter.y;
  updateAirSupport(sim.helicopter, sim.player, [], null, 1, 1 / 30, 3);
  assert(sim.helicopter.y < startY);
  assert.equal(sim.helicopter.tracking, false);
  sim.time = 7.999;
  returnGrexPatrols(sim);
  assert(sim.police.every((c) => c.destroyed));
  sim.time = 8;
  returnGrexPatrols(sim);
  assert.equal(sim.grexReturnAt, 0);
  assert(
    sim.police.every(
      (c) => !c.destroyed && c.role === "pursuit" && !unsupportedWater(c),
    ),
  );
  assert(
    Math.hypot(
      sim.police[0].x - sim.police[1].x,
      sim.police[0].z - sim.police[1].z,
    ) > 14,
  );
  assert(
    sim.police.every(
      (c) => Math.hypot(c.x - sim.player.x, c.z - sim.player.z) > 85,
    ),
  );
  assert(!sim.helicopter.destroyed);
  timeline.restore(sim, 0);
  assert.equal(sim.player.health, 100);
  assert.deepEqual(sim.grexTriggers, []);
  assert.equal(sim.grexReturnAt, 0);
  assert(!sim.helicopter.destroyed);
  assert(sim.police.every((c) => !c.destroyed));
});
test("GREX does not trigger through a roof or underwater; reset restores the monuments", () => {
  const sim = new ChaseSimulation();
  sim.start();
  Object.assign(sim.player, GREX_MONUMENTS[0]);
  for (const state of [{ y: 20 }, { y: 0, waterAt: 1 }]) {
    Object.assign(sim.player, state);
    collectGrexPulse(sim, sim.player);
    assert.equal(sim.grexTriggers.length, 0);
  }
  Object.assign(sim.player, { y: 0, waterAt: null });
  collectGrexPulse(sim, sim.player);
  assert.equal(sim.grexTriggers.length, 1);
  sim.start();
  assert.equal(sim.grexTriggers.length, 0);
  assert.equal(sim.grexReturnAt, 0);
});
test("cable-car hanger follows the rendered sag on both tracks and reverses continuously", () => {
  const a = { x: 0, y: 15, z: 0 },
    b = { x: 200, y: 60, z: 500 },
    len = Math.hypot(200, 500);
  const center = cablePoint(a, b, 0.5);
  assert(center.y < 37.5 && center.y > 33);
  for (const offset of [0, 0.25, 0.5, 0.75])
    for (let time = 0; time < 200; time += 0.5) {
      const p = cablePoint(a, b, cabinProgress(time, offset, len));
      const q = cablePoint(a, b, cabinProgress(time + 0.001, offset, len));
      assert(
        Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < 0.1,
        "no endpoint teleport",
      );
    }
});
test("the bank has a clear foreground and a connected broad scenic loop", () => {
  for (const b of BUILDINGS.filter((b) => !b.landmark))
    assert(!footprintsOverlap(b, BANK_PLAZA, 0));
  const loop = ROADS.filter((r) => r.name === "Bank of Georgia scenic loop");
  assert(loop.length >= 4);
  assert(loop.every((r) => r.width === 30));
  assert.equal(BANK_SITE.x, -729);
  assert.equal(BANK_SITE.z, 397);
});

test("a legitimate GREX burst settles without defeating bounded run validation", async () => {
  const { validateRun, levelRewards } = await import(
    "../dist/community-rules.js"
  );
  const ticket = {
    id: "grex-test-run",
    startedAt: 0,
    level: 30,
    map: "tbilisi",
    car: "classic",
  };
  const metrics = {
    time: 3,
    score: Math.floor(22 * 750 * levelRewards(30).score),
    checkpoints: 0,
    takedowns: 22,
    trafficWrecks: 0,
    distance: 94,
    driftSeconds: 0,
    jumps: 0,
    topSpeed: 150,
    grexPulses: [0],
  };
  assert.equal(validateRun(metrics, ticket, "abandoned", 3000).takedowns, 22);
  for (const pulses of [[], [0, 0], [0, 1, 2, 3], [3], [-1], ["0"]])
    assert.throws(() =>
      validateRun(
        { ...metrics, grexPulses: pulses },
        ticket,
        "abandoned",
        3000,
      ),
    );
});

test("traced GREX has one full connected dinosaur, a contained eye hole and finite caps", async () => {
  const { grexGeometry } = await import("../dist/grex-visuals.js");
  const { GREX_OUTLINE, GREX_EYE } = await import("../dist/grex-logo-data.js");
  const { ShapeUtils, Vector2 } = await import(
    "../dist/vendor/three.module.js"
  );
  assert(
    Math.abs(ShapeUtils.area(GREX_OUTLINE.map((p) => new Vector2(...p)))) > 2,
  );
  assert(GREX_EYE.every(([x, y]) => x > 0.4 && x < 0.8 && y > 0 && y < 0.5));
  const geometry = grexGeometry();
  geometry.computeBoundingBox();
  assert(geometry.boundingBox.max.y - geometry.boundingBox.min.y > 1.6);
  assert(geometry.boundingBox.max.y < 1);
  assert([...geometry.attributes.position.array].every(Number.isFinite));
  geometry.dispose();
});
