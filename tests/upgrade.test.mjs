import {
  START,
  NODES,
  ROADS,
  nearestRoad,
  CHECKPOINTS,
  containsPoint,
} from "../dist/city-map.js";
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
  assert(speeds[2] > speeds[1] && speeds[1] > speeds[0], 'Veyra, Vector and Apex have increasing performance');
  assert(carSpec("suv").damageScale < carSpec("gt").damageScale);
  assert(carSpec("rally").handling > carSpec("gt").handling);
});
test("Tbilisi streets are connected and all six gates have unobstructed road routes", () => {
  assert(LIMIT > 1000);
  assert(new Set(ROADS.map((r) => r.name)).size >= 20);
  let prior = START;
  for (const cp of CHECKPOINTS) {
    assert(nearestRoad(cp).distance < 0.01);
    for (const p of routeBetween(prior, cp)) {
      assert(lineOfSight(prior, p, blocks()));
      prior = p;
    }
  }
  for (const r of ROADS)
    for (let t = 0; t <= 1; t += 0.1) {
      const x = r.start.x + (r.end.x - r.start.x) * t,
        z = r.start.z + (r.end.z - r.start.z) * t;
      assert(
        !blocks().some((b) => containsPoint(b, x, z, 2.2)),
        `road ${r.id} is blocked`,
      );
    }
  const visited = new Set([0]),
    todo = [0];
  while (todo.length)
    for (const e of NODES[todo.pop()].links)
      if (!visited.has(e.node)) {
        visited.add(e.node);
        todo.push(e.node);
      }
  assert.equal(visited.size, NODES.length);
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
  sim.player.angle = 0;
  sim.player.vz = 30;
  const cop = sim.makePolice(sim.player.x, sim.player.z + 3.6);
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
