import assert from "node:assert/strict";
import { vehicle, stepVehicle, distance } from "../dist/simulation.js";
import { carSpec } from "../dist/config.js";
import { upgradedSpec, PARTS } from "../dist/progression.js";
const drive = (c, input, time, dt = 1 / 120) => {
  for (let t = 0; t < time - 1e-8; t += dt) stepVehicle(c, input, dt, []);
  return c;
};
export function checkCornering() {
  const slow = vehicle(),
    fast = vehicle(),
    straight = vehicle();
  slow.vz = 25;
  fast.vz = straight.vz = 65;
  drive(slow, { steer: 1 }, 0.35);
  drive(fast, { steer: 1 }, 0.35);
  drive(straight, {}, 0.35);
  assert.equal(fast.understeer, 0);
  assert.equal(slow.understeer, 0);
  assert(
    Math.abs(fast.angle) < Math.abs(slow.angle),
    "high speed must widen the same steering input",
  );
  assert(
    straight.speed - fast.speed < 3,
    "classic cornering does not add the removed speed scrub",
  );
  const gentle = vehicle(),
    sharp = vehicle();
  gentle.vz = sharp.vz = 35;
  drive(gentle, { steer: 1, steeringSensitivity: 0.7 }, 0.5);
  drive(sharp, { steer: 1, steeringSensitivity: 1.3 }, 0.5);
  assert(
    Math.abs(sharp.angle) > Math.abs(gentle.angle) * 1.5,
    "driver steering tuning changes turn response",
  );
  const braked = vehicle(),
    held = vehicle();
  braked.vz = held.vz = 65;
  drive(braked, { throttle: -1 }, 1);
  drive(held, {}, 1);
  braked.angle = held.angle = 0;
  braked.vx = held.vx = 0;
  drive(braked, { steer: 1 }, 0.5);
  drive(held, { steer: 1 }, 0.5);
  assert(braked.speed < held.speed);
  assert(
    Math.abs(braked.angle) > Math.abs(held.angle),
    "braking before entry restores turn authority",
  );
  for (const id of [
    "classic",
    "gt",
    "rally",
    "suv",
    "falcon",
    "rioni",
    "coast",
    "creator",
  ]) {
    const eq = Object.fromEntries(PARTS.map((p) => [p.id, 5]));
    eq.stars = Object.fromEntries(PARTS.map((p) => [p.id, 5]));
    const c = vehicle();
    c.carId = id;
    c.performance = upgradedSpec(carSpec(id), eq);
    c.vz = c.performance.topSpeed + c.performance.boostSpeed;
    drive(c, { throttle: 1, steer: 1, boost: true, boostLatched: true }, 2);
    assert(Number.isFinite(c.x + c.z + c.angle + c.speed));
    assert(c.speed > 0);
    assert(c.understeer >= 0 && c.understeer <= 1);
  }
  const a = vehicle(),
    b = vehicle();
  a.vz = b.vz = 60;
  drive(a, { steer: 0.85, throttle: 1 }, 1.5, 1 / 60);
  drive(b, { steer: 0.85, throttle: 1 }, 1.5, 1 / 120);
  assert(
    distance(a, b) < 1.5,
    "turn response should be stable at both tick rates",
  );
}
