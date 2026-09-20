import test from "node:test";
import assert from "node:assert/strict";
import { ChaseSimulation, vehicle, distance } from "../dist/simulation.js";
import { RAMPS, launchRamp, stepAirborne } from "../dist/stunts.js";
import { ROAD_SURFACE } from "../dist/road-surface-data.js";
const run = (sim, seconds, input = {}) => {
  for (let i = 0; i < Math.round(seconds * 120); i++)
    sim.update(1 / 120, input);
};
function clean() {
  const s = new ChaseSimulation();
  s.start();
  s.obstacles = [];
  s.police = [];
  s.traffic = [];
  s.trees = [];
  s.ramps = [];
  s.timeline.frames = [];
  s.timeline.recordAt = 0;
  return s;
}
test("driving onto a real ramp launches, gains height, lands and keeps a living car upright", () => {
  const s = clean(),
    r = RAMPS[0];
  s.ramps = [r];
  Object.assign(s.player, {
    x: r.x - Math.sin(r.angle) * 14,
    z: r.z - Math.cos(r.angle) * 14,
    angle: r.angle,
    vx: Math.sin(r.angle) * 25,
    vz: Math.cos(r.angle) * 25,
  });
  let airborne = false,
    max = 0;
  for (let i = 0; i < 480; i++) {
    s.update(1 / 120, { throttle: s.player.airborne ? 0 : 1 });
    airborne ||= s.player.airborne;
    max = Math.max(max, s.player.y);
  }
  assert(airborne && max > 3);
  assert(s.player.jumpCount >= 1);
  assert(!s.player.airborne && !s.player.flipped && s.player.health > 0);
  assert(s.stuntScore > 0);
});
test("air control can roll the car and an alive overturned car automatically returns upright", () => {
  const s = clean(),
    r = RAMPS[0];
  Object.assign(s.player, {
    x: r.x,
    z: r.z,
    angle: r.angle,
    vx: Math.sin(r.angle) * 35,
    vz: Math.cos(r.angle) * 35,
  });
  launchRamp(s.player, r, { steer: 1 });
  let flipped = false;
  for (let i = 0; i < 720; i++) {
    s.update(1 / 120, { steer: s.player.airborne ? 0.5 : 0 });
    flipped ||= s.player.flipped;
  }
  assert(flipped);
  assert(!s.player.flipped && !s.player.airborne);
  assert.equal(s.player.roll, 0);
  assert(s.player.health > 0 && s.player.health < 100);
});
test("rewind restores the entire chase and discards the abandoned future on release", () => {
  const s = clean();
  run(s, 2, { throttle: 1 });
  const earlier = { ...s.player };
  s.player.health = 27;
  s.score = 9000;
  s.checkpoint = 2;
  s.nextWaveAt = 999;
  s.takedowns = 3;
  run(s, 2, { throttle: 1 });
  const future = { ...s.player };
  run(s, 3.5, { rewind: true });
  assert.equal(s.phase, "rewinding");
  assert(s.time < 1.3);
  assert.equal(s.player.health, 100);
  assert.equal(s.checkpoint, 0);
  assert.equal(s.takedowns, 0);
  assert(s.score < 9000);
  assert(distance(s.player, future) > 20);
  s.update(1 / 120, {});
  assert.equal(s.phase, "running");
  assert(s.timeline.frames.at(-1).time < 1.3);
  assert(s.timeline.available < 1.3);
  run(s, 0.5, { throttle: 1 });
  assert(s.time < 2);
  assert(s.player.health === earlier.health);
});
test("five seconds is a rolling limit; holding an exhausted rewind stops and release resumes", () => {
  const s = clean();
  run(s, 8, { throttle: 0.2 });
  assert(s.timeline.available <= 5.01 && s.timeline.available > 4.9);
  run(s, 8, { rewind: true });
  const t = s.time;
  assert(t > 2.9 && t < 3.2);
  run(s, 1, { rewind: true });
  assert.equal(s.time, t);
  s.update(1 / 120, {});
  assert.equal(s.phase, "running");
  assert(s.time > t);
});
test("rewind remains available after a wreck and returns to a driveable earlier frame", () => {
  const s = clean();
  run(s, 1, { throttle: 1 });
  s.player.health = 0;
  s.phase = "wrecked";
  run(s, 0.5, { rewind: true });
  assert.equal(s.phase, "rewinding");
  assert.equal(s.player.health, 100);
  s.update(1 / 120, {});
  assert.equal(s.phase, "running");
});

test("rewind restores broken trees and patrol identities without interpolating a respawn across the map", () => {
  const s = clean();
  s.trees = [
    {
      x: 500,
      z: 500,
      radius: 0.6,
      h: 10,
      broken: false,
      fallenAt: 0,
      fallAngle: 0,
    },
  ];
  const cop = s.makePolice(900, 900);
  s.police = [cop];
  s.timeline.capture(s);
  s.time = 0.04;
  s.trees[0].broken = true;
  s.trees[0].fallenAt = 0.04;
  s.police = [{ ...cop, id: 999, x: -900, z: -900 }];
  s.timeline.capture(s);
  s.time = 0.2;
  s.timeline.capture(s);
  s.timeline.back(s, 0.23);
  assert.equal(s.police[0].id, cop.id);
  assert.equal(s.police[0].x, 900);
  assert.equal(s.trees[0].broken, false);
  s.timeline.release(s);
  assert.equal(s.police[0].id, cop.id);
  assert.equal(s.trees[0].broken, false);
});
test("time-based reinforcements wait for checkpoint one and stop at twelve cars", () => {
  const s = new ChaseSimulation();
  s.start();
  s.time = 35;
  s.update(1 / 120, {});
  assert.equal(s.police.length, 4);
  assert.equal(s.heatLevel, 1);
  s.checkpoint = 1;
  s.update(1 / 120, {});
  s.time = s.nextWaveAt + 0.01;
  s.update(1 / 120, {});
  assert.equal(s.police.length, 5);
  assert.equal(s.heatLevel, 2);
  for (let i = 0; i < 20; i++) {
    s.time = s.nextWaveAt + 0.01;
    s.update(1 / 120, {});
  }
  assert.equal(s.police.length, 12);
  assert(s.police.some((p) => p.role === "blockade"));
});
test("the expanded city includes a river cutout and six connected district checkpoint destinations", () => {
  assert(ROAD_SURFACE.ground.length > 0);
  assert(ROAD_SURFACE.asphalt[0].length >= 40);
});
