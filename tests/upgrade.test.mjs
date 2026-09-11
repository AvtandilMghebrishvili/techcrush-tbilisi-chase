import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../dist/vendor/three.module.js";
import {
  vehicle,
  stepVehicle,
  ChaseSimulation,
  blocks,
  lineOfSight,
  routeBetween,
  distance,
} from "../dist/simulation.js";
import {
  GRID_RADIUS,
  LIMIT,
  ROAD_EDGE,
  CARS,
  carSpec,
  TOWER,
} from "../dist/config.js";
import { normalizeKey, drivingInput } from "../dist/controls.js";
import {
  createExplosion,
  animateExplosion,
  disposeGroup,
} from "../dist/effects.js";
test("A is screen-left and D is screen-right from the follow camera at every heading", () => {
  for (const heading of [0, Math.PI / 2, Math.PI, Math.PI * 1.5])
    for (const [key, sign] of [
      ["a", -1],
      ["d", 1],
    ]) {
      const car = vehicle(0, 0, heading);
      car.vx = Math.sin(heading) * 18;
      car.vz = Math.cos(heading) * 18;
      const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 100);
      camera.position.set(
        -Math.sin(heading) * 16,
        8.5,
        -Math.cos(heading) * 16,
      );
      camera.lookAt(0, 1.5, 0);
      camera.updateMatrixWorld();
      for (let i = 0; i < 60; i++)
        stepVehicle(car, drivingInput(new Set([key, "w"])), 1 / 120);
      const point = new THREE.Vector3(car.x, 0, car.z).project(camera);
      assert(
        point.x * sign > 0,
        `${key} at ${heading} went the wrong screen direction`,
      );
    }
});
test("physical WASD codes also work with a Georgian keyboard", () => {
  assert.equal(normalizeKey({ code: "KeyA", key: "ა" }), "a");
  assert.equal(normalizeKey({ code: "KeyD", key: "დ" }), "d");
  assert.equal(normalizeKey({ code: "KeyC", key: "ც" }), "c");
  assert.equal(drivingInput(new Set(["ArrowLeft"])).steer, -1);
  assert.equal(drivingInput(new Set(["ArrowRight"])).steer, 1);
});
test("car selection persists across retries and changes driving and protection", () => {
  const sim = new ChaseSimulation();
  for (const c of CARS) {
    sim.start(c.id);
    assert.equal(sim.player.carId, c.id);
    sim.start();
    assert.equal(sim.player.carId, c.id);
  }
  const speeds = CARS.map((spec) => {
    const c = { ...vehicle(0, 0), carId: spec.id };
    for (let i = 0; i < 1200; i++) stepVehicle(c, { throttle: 1 }, 1 / 120);
    return c.speed;
  });
  assert(speeds[0] > speeds[2]);
  assert(carSpec("suv").damageScale < carSpec("gt").damageScale);
  assert(carSpec("rally").handling > carSpec("gt").handling);
});
test("expanded city has connected roads and an accessible tower plaza", () => {
  assert.equal(GRID_RADIUS, 4);
  assert(LIMIT > 600);
  const route = routeBetween(
    { x: ROAD_EDGE, z: 200 },
    { x: -ROAD_EDGE, z: -350 },
  );
  let prior = { x: ROAD_EDGE, z: 200 };
  for (const p of route) {
    assert(lineOfSight(prior, p, blocks()));
    prior = p;
  }
  assert(
    !blocks().some(
      (b) =>
        TOWER.x - 30 > b.minX &&
        TOWER.x - 30 < b.maxX &&
        TOWER.z > b.minZ &&
        TOWER.z < b.maxZ,
    ),
  );
});
test("patrol HP takes several hits, awards one explosion, and replaces the destroyed officer away from the player", () => {
  const sim = new ChaseSimulation();
  sim.start();
  const cop = sim.police[0],
    id = cop.id;
  assert.equal(sim.damagePolice(cop, 30), false);
  assert.equal(cop.health, 56);
  sim.damagePolice(cop, 30);
  assert.equal(cop.health, 56, "contact must not drain HP every frame");
  cop.hitCooldown = 0;
  sim.damagePolice(cop, 30);
  assert.equal(cop.health, 12);
  cop.hitCooldown = 0;
  assert(sim.damagePolice(cop, 30));
  assert.equal(sim.takedowns, 1);
  assert.equal(sim.explosions.length, 1);
  assert.equal(cop.destroyed, true);
  sim.damagePolice(cop, 30);
  assert.equal(sim.takedowns, 1);
  sim.player.x = 550;
  sim.player.z = 550;
  sim.traffic = [];
  sim.police = [cop];
  for (let i = 0; i < 601; i++) sim.update(1 / 120, {});
  assert.equal(cop.destroyed, false);
  assert.equal(cop.health, 100);
  assert.notEqual(cop.id, id);
  assert(distance(cop, sim.player) > 100);
  assert.equal(sim.explosions.length, 0);
});
test("actual ram collision reduces patrol HP", () => {
  const sim = new ChaseSimulation();
  sim.start();
  sim.traffic = [];
  sim.player.vz = 30;
  const cop = sim.makePolice(4, -26.4);
  sim.police = [cop];
  sim.update(1 / 120, { throttle: 1 });
  assert(cop.health < 100);
});
test("explosion particles expand and fade before disposal", () => {
  const scene = new THREE.Scene(),
    fx = createExplosion(scene, { x: 0, z: 0, born: 0 });
  animateExplosion(fx, 0.2);
  assert(fx.flash.visible);
  assert(fx.particles.some((p) => p.mesh.position.length() > 1));
  animateExplosion(fx, 2.2);
  assert.equal(fx.flash.visible, false);
  assert(fx.particles.every((p) => p.mesh.material.opacity === 0));
  disposeGroup(scene, fx.group);
  assert.equal(scene.children.length, 0);
});
