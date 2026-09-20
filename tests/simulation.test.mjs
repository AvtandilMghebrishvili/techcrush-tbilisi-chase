import { START, nearestRoad } from "../dist/city-map.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  vehicle,
  stepVehicle,
  resolveCircleRect,
  collideVehicles,
  ChaseSimulation,
  CHECKPOINTS,
  blocks,
  routeBetween,
  lineOfSight,
  distance,
  angleDelta,
  clamp,
} from "../dist/simulation.js";
function drive(car, input, seconds, dt = 1 / 120, obstacles = []) {
  for (let t = 0; t < seconds - 1e-8; t += dt)
    stepVehicle(car, input, dt, obstacles);
  return car;
}
test("acceleration, maximum speed, braking, and reverse", () => {
  const c = vehicle(0, 0);
  drive(c, { throttle: 1 }, 5);
  assert(c.speed > 45 && c.speed <= 58.01);
  const z = c.z;
  drive(c, { throttle: -1 }, 3);
  assert(c.speed < 0);
  assert(c.z > z);
  drive(c, { throttle: -1 }, 4);
  assert(c.speed >= -10);
});
test("steering responds in both directions and reverses while backing up", () => {
  const l = vehicle(0, 0),
    r = vehicle(0, 0);
  drive(l, { throttle: 1, steer: -0.4 }, 2);
  drive(r, { throttle: 1, steer: 0.4 }, 2);
  assert(l.x > 0 && r.x < 0);
  assert(Math.abs(l.x + r.x) < 0.001);
  const reverse = vehicle(0, 0);
  drive(reverse, { throttle: -1, steer: 1 }, 2);
  assert(reverse.angle > 0);
});
test("physics stays consistent at 60 and 120Hz", () => {
  const a = vehicle(0, 0),
    b = vehicle(0, 0);
  drive(a, { throttle: 1, steer: 0.1 }, 4, 1 / 60);
  drive(b, { throttle: 1, steer: 0.1 }, 4, 1 / 120);
  assert(distance(a, b) < 1);
});
test("handbrake tightens a turn and sheds speed", () => {
  const a = vehicle(0, 0),
    b = vehicle(0, 0);
  drive(a, { throttle: 1 }, 3);
  Object.assign(b, a);
  drive(a, { steer: 0.6 }, 1);
  drive(b, { steer: 0.6, brake: true }, 1);
  assert(b.speed < a.speed);
  assert(Math.abs(b.angle) > Math.abs(a.angle));
});
test("nitro increases top speed, depletes, and recharges", () => {
  const a = vehicle(),
    b = vehicle();
  drive(a, { throttle: 1 }, 7);
  drive(b, { throttle: 1, boost: true }, 3.8);
  assert(b.speed > a.speed);
  assert(b.nitro < 30);
  const n = b.nitro;
  drive(b, {}, 2);
  assert(b.nitro > n);
});
test("high speed wall collision resolves outside the wall and causes damage once", () => {
  const c = vehicle(0, 0);
  c.vz = 60;
  const rect = { minX: -10, maxX: 10, minZ: 12, maxZ: 20 };
  drive(c, { throttle: 1 }, 0.4, 1 / 120, [rect]);
  assert(c.z <= 9.91);
  assert(c.health < 90);
  assert(c.health > 40);
});
test("interior overlap and car collision are separated without NaNs", () => {
  const c = vehicle(5, 5),
    rect = { minX: 0, maxX: 10, minZ: 0, maxZ: 10 };
  resolveCircleRect(c, 2, rect);
  assert(
    c.x <= -c.width / 2 ||
      c.x >= 10 + c.width / 2 ||
      c.z <= -c.length / 2 ||
      c.z >= 10 + c.length / 2,
  );
  const a = vehicle(),
    b = vehicle();
  collideVehicles(a, b);
  assert(
    distance(a, b) >= 1.98,
    "door-to-door overlap is resolved using the actual body width",
  );
  assert(Number.isFinite(a.x));
});
test("police route around blocks instead of driving through them", () => {
  const a = { x: 0, z: 70 },
    b = { x: 140, z: 70 };
  assert(!lineOfSight(a, b, blocks()));
  const path = routeBetween(a, b);
  let previous = a;
  for (const next of path) {
    assert(lineOfSight(previous, next, blocks()));
    previous = next;
  }
  assert(distance(previous, b) < 0.01);
});
test("patrols pursue immediately and close the gap before checkpoint one", () => {
  const s = new ChaseSimulation();
  s.start();
  s.traffic = [];
  s.obstacles = [];
  const chaseStart = distance(s.player, s.police[0]);
  for (let i = 0; i < 360; i++) s.update(1 / 120, {});
  assert.equal(s.pursuitStarted, true);
  assert(s.radioContact);
  assert.equal(s.checkpoint, 0);
  assert(distance(s.player, s.police[0]) < chaseStart * 0.6);
});
test("checkpoints only award in order, repairs cap at 100, reinforcements arrive", () => {
  const s = new ChaseSimulation();
  s.start();
  s.police = [];
  s.traffic = [];
  Object.assign(s.player, CHECKPOINTS[2]);
  s.update(1 / 120);
  assert.equal(s.checkpoint, 0);
  for (let i = 0; i < 6; i++) {
    Object.assign(s.player, { ...CHECKPOINTS[i], vx: 0, vz: 0 });
    s.update(1 / 120);
    assert.equal(s.checkpoint, i + 1);
    assert(s.player.health <= 100);
  }
  assert.equal(s.police.length, 3);
  assert(s.score >= 6000);
});
test("escape requires all checkpoints and eight continuous seconds without contact", () => {
  const s = new ChaseSimulation();
  s.start();
  s.traffic = [];
  s.police = [];
  for (let i = 0; i < 1200; i++) s.update(1 / 120);
  assert.equal(s.phase, "running");
  s.checkpoint = 6;
  for (let i = 0; i < 970; i++) s.update(1 / 120);
  assert.equal(s.phase, "won");
  assert(s.score >= 5000);
});
test("wreck, capture, pause, recovery, and restart states", () => {
  const s = new ChaseSimulation();
  s.start();
  s.player.health = 0;
  s.update(1 / 120);
  assert.equal(s.phase, "wrecked");
  s.start();
  s.traffic = [];
  s.checkpoint = 1;
  s.bust = 3.999;
  s.police = [s.makePolice(s.player.x + 3, s.player.z)];
  s.update(1 / 120);
  assert.equal(s.phase, "busted");
  s.start();
  s.phase = "paused";
  const state = s.snapshot();
  s.update(0.05, { throttle: 1 });
  assert.deepEqual(s.snapshot(), state);
  s.phase = "running";
  s.player.x = 52;
  s.score = 500;
  s.recover();
  assert.equal(s.score, 300);
  assert(nearestRoad(s.player).distance < 0.001);
  s.start();
  assert.equal(s.score, 0);
  assert.equal(s.checkpoint, 0);
  assert.equal(s.player.health, 100);
});
