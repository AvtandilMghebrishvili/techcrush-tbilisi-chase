import test from "node:test";
import assert from "node:assert/strict";
import {
  vehicle,
  stepVehicle,
  ChaseSimulation,
  distance,
} from "../dist/simulation.js";
import { ROADS } from "../dist/city-map.js";
import { ROAD_SURFACE } from "../dist/road-surface-data.js";
import { surfaceGeometry } from "../dist/road-surface.js";
import { clearCameraPosition } from "../dist/camera-clearance.js";
test("follow camera stops before intervening and rotated walls but can pass above roofs", () => {
  const origin = { x: 0, y: 2, z: 0 };
  const building = { x: 0, z: -7, w: 6, d: 3, h: 12, angle: Math.PI / 5 };
  const clear = clearCameraPosition(origin, { x: 0, y: 5, z: -16 }, [building]);
  assert(
    clear.z > -5 && clear.z < 0,
    "a wall between clear endpoints must shorten the boom",
  );
  const high = { x: 0, y: 40, z: -16 };
  assert.deepEqual(
    clearCameraPosition({ ...origin, y: 30 }, high, [building]),
    high,
  );
  assert.deepEqual(
    clearCameraPosition(origin, { x: 20, y: 5, z: 0 }, [building]),
    { x: 20, y: 5, z: 0 },
  );
});
const drive = (car, input, seconds) => {
  for (let i = 0; i < Math.round(seconds * 120); i++)
    stepVehicle(car, input, 1 / 120);
};
test("recovery selects a nearby clear road position when police occupy the closest point", () => {
  const sim = new ChaseSimulation();
  sim.start();
  sim.score = 500;
  sim.traffic = [];
  sim.police = [
    sim.makePolice(sim.player.x + 2, sim.player.z),
    sim.makePolice(sim.player.x - 3, sim.player.z),
  ];
  const old = { ...sim.player };
  sim.recover();
  assert(sim.police.every((c) => distance(c, sim.player) > 12));
  assert(distance(old, sim.player) < 60);
  assert.equal(sim.score, 300);
  assert.equal(sim.player.health, 100);
});
test("turbo spools, preserves momentum on release, and cannot fight the handbrake", () => {
  const car = vehicle();
  drive(car, { throttle: 1 }, 3);
  stepVehicle(car, { throttle: 1, boost: true }, 1 / 120);
  assert(car.boostStrength > 0 && car.boostStrength < 0.1);
  drive(car, { throttle: 1, boost: true }, 2);
  assert(car.speed > 57 && car.boostStrength > 0.99);
  const speed = car.speed,
    charge = car.nitro;
  stepVehicle(car, { throttle: 1 }, 1 / 120);
  assert(
    car.speed > speed - 1,
    "releasing turbo must not instantly clip boosted velocity",
  );
  assert.equal(
    car.nitro,
    charge,
    "charging waits until the release delay expires",
  );
  stepVehicle(car, { throttle: 1, boost: true, brake: true }, 1 / 120);
  assert.equal(car.boosting, false);
  assert.equal(car.nitro, charge);
});
test("an empty turbo tank locks out pulses until a useful charge has recovered", () => {
  const car = vehicle();
  car.vz = 30;
  car.nitro = 1;
  drive(car, { throttle: 1, boost: true }, 0.1);
  assert(car.nitroLocked && !car.boosting && car.nitro === 0);
  for (let i = 0; i < 120; i++) {
    stepVehicle(car, { throttle: 1, boost: true }, 1 / 120);
    assert(!car.boosting);
  }
  drive(car, { throttle: 1 }, 3);
  assert(car.nitro >= 22 && !car.nitroLocked);
  stepVehicle(car, { throttle: 1, boost: true }, 1 / 120);
  assert(car.boosting);
});
test("one triangulated asphalt surface covers the connected street centers without flipped faces", () => {
  assert.equal(ROAD_SURFACE.asphalt.length, 1);
  const geometry = surfaceGeometry(ROAD_SURFACE.asphalt, 0.065),
    p = geometry.attributes.position,
    n = geometry.attributes.normal;
  const triangles = [];
  for (let i = 0; i < p.count; i += 3) {
    const a = { x: p.getX(i), z: p.getZ(i) },
      b = { x: p.getX(i + 1), z: p.getZ(i + 1) },
      c = { x: p.getX(i + 2), z: p.getZ(i + 2) };
    assert(n.getY(i) > 0.99);
    triangles.push({
      a,
      b,
      c,
      minX: Math.min(a.x, b.x, c.x),
      maxX: Math.max(a.x, b.x, c.x),
      minZ: Math.min(a.z, b.z, c.z),
      maxZ: Math.max(a.z, b.z, c.z),
    });
  }
  const cross = (a, b, x, z) =>
    (b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x);
  for (const road of ROADS)
    for (const t of [0.1, 0.5, 0.9]) {
      const x = road.start.x + (road.end.x - road.start.x) * t,
        z = road.start.z + (road.end.z - road.start.z) * t;
      assert(
        triangles.some(
          (q) =>
            x >= q.minX - 0.001 &&
            x <= q.maxX + 0.001 &&
            z >= q.minZ - 0.001 &&
            z <= q.maxZ + 0.001 &&
            cross(q.a, q.b, x, z) <= 0.01 &&
            cross(q.b, q.c, x, z) <= 0.01 &&
            cross(q.c, q.a, x, z) <= 0.01,
        ),
        `asphalt gap on road ${road.id}`,
      );
    }
  geometry.dispose();
});
