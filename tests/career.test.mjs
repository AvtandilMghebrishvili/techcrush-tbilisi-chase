import test from "node:test";
import assert from "node:assert/strict";
import {
  PARTS,
  TIERS,
  newProfile,
  rollBox,
  applyProgressAction,
  upgradedSpec,
  pursuitTuning,
} from "../dist/progression.js";
import { carSpec } from "../dist/config.js";
import { ChaseSimulation, vehicle, stepVehicle } from "../dist/simulation.js";
import {
  BUILDINGS,
  ROADS,
  CLOCK_BUILDING,
  containsPoint,
} from "../dist/city-map.js";
import { overlapsRoad } from "../dist/map-clearance.js";
import { makeOriginalSportsCar } from "../dist/car-models.js";
import { createHash } from "node:crypto";

test("every building footprint clears all road widths, including landmark wings", () => {
  assert(BUILDINGS.length > 300);
  for (const b of BUILDINGS)
    assert(!overlapsRoad(b, 1), `Building blocks a road: ${b.x},${b.z}`);
  const wing = { x: CLOCK_BUILDING.x + 14, z: CLOCK_BUILDING.z - 30 };
  assert(
    BUILDINGS.some((b) => containsPoint(b, wing.x, wing.z)),
    "Clock wing has a matching collision footprint",
  );
  const c = vehicle(wing.x, wing.z);
  stepVehicle(c, {}, 1 / 120, BUILDINGS);
  assert(
    !BUILDINGS.some((b) => containsPoint(b, c.x, c.z)),
    "A car cannot remain inside the visible wing",
  );
});
test("all three bridges are driveable through the river in both directions", () => {
  const bridges = ROADS.filter((r) => /Bridge/.test(r.name));
  assert(new Set(bridges.map((r) => r.name)).size === 3);
  for (const road of bridges)
    for (const reverse of [false, true]) {
      const sim = new ChaseSimulation();
      sim.start();
      sim.police = [];
      sim.traffic = [];
      sim.trees = [];
      sim.ramps = [];
      sim.nextWaveAt = Infinity;
      const from = reverse ? road.end : road.start,
        to = reverse ? road.start : road.end;
      Object.assign(sim.player, {
        x: from.x,
        z: from.z,
        angle: road.angle + (reverse ? Math.PI : 0),
      });
      let travelled = 0;
      while (travelled < road.length - 1) {
        const d = Math.min(0.18, road.length - 1 - travelled);
        sim.player.vx = ((to.x - from.x) / road.length) * d * 120;
        sim.player.vz = ((to.z - from.z) / road.length) * d * 120;
        sim.update(1 / 120, {});
        travelled += d;
        assert(
          !sim.events.some((e) => e.startsWith("RIVER")),
          "Bridge unexpectedly triggers river recovery: " + road.name,
        );
        assert.equal(sim.player.health, 100, "A building blocks " + road.name);
      }
      assert(
        Math.hypot(sim.player.x - to.x, sim.player.z - to.z) < 3,
        road.name,
      );
    }
});
test("fast upgraded vehicles cannot tunnel through a thin wall", () => {
  const c = vehicle(0, -4);
  c.vz = 120;
  c.performance = upgradedSpec(
    carSpec("suv"),
    Object.fromEntries(PARTS.map((p) => [p.id, 4])),
  );
  const wall = { minX: -20, maxX: 20, minZ: 0, maxZ: 0.15 };
  stepVehicle(c, { throttle: 1, boost: true }, 0.05, [wall]);
  assert(c.z < 0 && c.vz <= 0 && c.health < 100);
});
test("three car choices have different geometry, dimensions and real upgrade visuals", () => {
  const hashes = new Set();
  for (const id of ["gt", "rally", "suv"]) {
    const model = makeOriginalSportsCar(id, "#ff0000");
    const hash = createHash("sha256");
    model.traverse((m) => {
      if (m.isMesh) {
        const a = m.geometry.attributes.position.array;
        assert([...a].every(Number.isFinite));
        hash.update(Buffer.from(a.buffer));
      }
    });
    hashes.add(hash.digest("hex"));
    assert.equal(model.userData.wheels.length, 4);
  }
  assert.equal(hashes.size, 3);
  const stock = makeOriginalSportsCar("gt", "#ff0000"),
    up = makeOriginalSportsCar("gt", "#ff0000", { spoiler: 4, rims: 4 });
  assert(
    up.getObjectByName("rear-wing").children.length >
      stock.getObjectByName("rear-wing").children.length,
    "A visible spoiler is fitted",
  );
  assert(
    up.userData.wheels[0].children.length >
      stock.userData.wheels[0].children.length,
    "Rim spoke geometry changes",
  );
});
test("fourteen parts retain four purchasable tiers and add discovery grades", () => {
  assert(PARTS.length > 10);
  assert.equal(TIERS.length, 9);
  const base = upgradedSpec(carSpec("gt"));
  for (const part of PARTS)
    for (let tier = 1; tier <= 4; tier++) {
      const changed = upgradedSpec(carSpec("gt"), { [part.id]: tier });
      assert.notDeepEqual(changed, base, part.id + " tier " + tier);
    }
  const top = upgradedSpec(
    carSpec("gt"),
    Object.fromEntries(PARTS.map((p) => [p.id, 4])),
  );
  assert(
    top.topSpeed > base.topSpeed &&
      top.boostPower > base.boostPower &&
      top.nitroDrain < base.nitroDrain &&
      top.damageScale < base.damageScale,
  );
});
test("a box gives exactly three independent rewards and permits identical duplicates", () => {
  const rewards = rollBox(() => 0.01);
  assert.equal(rewards.length, 3);
  assert.deepEqual(rewards[0], rewards[2]);
  const p = applyProgressAction(
    newProfile(),
    { type: "open-box", id: "box-test" },
    () => 0.01,
  );
  assert.equal(p.boxes, 0);
  assert.equal(p.inventory["engine:1"], 3);
  assert.throws(() => applyProgressAction(p, { type: "open-box" }));
  assert.equal(rollBox(() => 0.999)[0].tier, 4);
});

test("installed engine, brakes and turbo parts change integrated driving physics", () => {
  const stock = vehicle(0, 0),
    up = vehicle(0, 0);
  stock.performance = upgradedSpec(carSpec("gt"));
  up.performance = upgradedSpec(carSpec("gt"), {
    engine: 4,
    ecu: 4,
    turbo: 4,
    tank: 4,
    brakes: 4,
  });
  for (let i = 0; i < 480; i++)
    for (const c of [stock, up])
      stepVehicle(c, { throttle: 1, boost: true }, 1 / 120, []);
  assert(up.speed > stock.speed + 10);
  assert(up.nitro > stock.nitro + 20);
  const ordinary = vehicle(0, 0),
    strong = vehicle(0, 0);
  ordinary.performance = stock.performance;
  strong.performance = up.performance;
  ordinary.vz = strong.vz = 50;
  for (let i = 0; i < 120; i++)
    for (const c of [ordinary, strong])
      stepVehicle(c, { throttle: -1 }, 1 / 120, []);
  assert(strong.z < ordinary.z - 3, "Brake upgrade shortens stopping travel");
});
test("credits, installation, spares and level rewards settle once", () => {
  let p = newProfile();
  p = applyProgressAction(p, { type: "upgrade", car: "gt", part: "engine" });
  assert.equal(p.credits, 400);
  assert.equal(p.cars.gt.engine, 1);
  assert.equal(p.cars.rally.engine, undefined);
  assert.throws(() =>
    applyProgressAction(p, { type: "upgrade", car: "gt", part: "engine" }),
  );
  p.inventory["engine:3"] = 1;
  p = applyProgressAction(p, {
    type: "equip",
    car: "gt",
    part: "engine",
    tier: 3,
  });
  assert.equal(p.inventory["engine:1"], 1);
  assert.equal(p.inventory["engine:3"], 0);
  const action = {
    type: "settle",
    runId: "completed-run-01",
    level: 1,
    cash: 900,
    result: "won",
  };
  p = applyProgressAction(p, action);
  assert.equal(p.level, 2);
  assert.equal(p.boxes, 2);
  assert.equal(p.credits, 3350);
  assert.deepEqual(applyProgressAction(p, action), p);
});
test("higher levels speed up decision making and introduce coordinated tactics", () => {
  const low = pursuitTuning(1),
    mid = pursuitTuning(4),
    high = pursuitTuning(12);
  assert(mid.maxSpeed > low.maxSpeed && high.maxSpeed > mid.maxSpeed);
  assert(high.repath < mid.repath && mid.repath < low.repath);
  assert(
    high.waveInterval < low.waveInterval &&
      high.initialUnits > low.initialUnits,
  );
  assert(!low.flank && mid.flank);
  const sim = new ChaseSimulation();
  sim.start("gt", { level: 4, equipment: { engine: 2 } });
  assert.equal(sim.police.length, mid.initialUnits);
  assert.equal(sim.player.performance.topSpeed, 62);
});
test("police and civilian wreck credits rewind with the world, then bank once", () => {
  const sim = new ChaseSimulation();
  sim.start();
  sim.trees = [];
  sim.obstacles = [];
  for (let i = 0; i < 40; i++) sim.update(1 / 120, {});
  const before = sim.runCash,
    cop = sim.police[0];
  for (let i = 0; i < 3; i++) {
    cop.hitCooldown = 0;
    sim.damagePolice(cop, 40);
  }
  assert.equal(sim.runCash, before + 350);
  const civilian = sim.traffic[0];
  for (let i = 0; i < 2; i++) {
    civilian.hitCooldown = 0;
    sim.damageTraffic(civilian, 40);
  }
  assert.equal(sim.runCash, before + 470);
  assert(civilian.destroyed);
  sim.damageTraffic(civilian, 40);
  assert.equal(sim.runCash, before + 470);
  for (let i = 0; i < 8; i++) sim.update(1 / 120, {});
  for (let i = 0; i < 30; i++) sim.update(1 / 120, { rewind: true });
  sim.timeline.release(sim);
  assert.equal(sim.runCash, before);
  assert(!sim.police[0].destroyed);
  assert(!sim.traffic[0].destroyed);
});
test("street poles break and rewind to their intact positions", () => {
  const sim = new ChaseSimulation();
  sim.propDefinitions = [
    { id: 0, x: 0, z: 4, h: 8, radius: 0.18, breakSpeed: 7 },
  ];
  sim.start();
  sim.obstacles = [];
  sim.trees = [];
  sim.police = [];
  sim.traffic = [];
  Object.assign(sim.player, { x: 0, z: 0, angle: 0, vx: 0, vz: 20 });
  sim.timeline.frames = [];
  sim.timeline.recordAt = 0;
  sim.timeline.capture(sim);
  for (let i = 0; i < 20; i++) sim.update(1 / 120, { throttle: 1 });
  assert(sim.poles[0].broken);
  sim.timeline.restore(sim, 0);
  assert(!sim.poles[0].broken);
});
