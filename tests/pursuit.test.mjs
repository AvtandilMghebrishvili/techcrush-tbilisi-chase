import test from "node:test";
import assert from "node:assert/strict";
import {
  vehicle,
  stepVehicle,
  ChaseSimulation,
  distance,
  CHECKPOINTS,
} from "../dist/simulation.js";
import { vehicleContact, treeContact } from "../dist/contacts.js";
import { TREES } from "../dist/world-props.js";
const drive = (c, input, t) => {
  for (let i = 0; i < t * 120; i++) stepVehicle(c, input, 1 / 120);
};
test("solid tree stops a slow vehicle; a fast impact breaks it and transfers energy", () => {
  const slow = vehicle(),
    tree = { id: 0, x: 0, z: 5, radius: 0.32 };
  slow.vz = 6;
  for (let i = 0; i < 120; i++) {
    stepVehicle(slow, { throttle: 1 }, 1 / 120);
    treeContact(slow, tree, i / 120);
  }
  assert(!tree.broken);
  assert(slow.z < 2.37);
  const fast = vehicle();
  fast.vz = 40;
  fast.z = 2.5;
  assert(treeContact(fast, tree, 1) > 12);
  assert(tree.broken);
  assert(fast.vz < 30);
  assert.equal(treeContact(fast, tree, 2), 0);
});
test("tree damage, visible fall state and a clean restart use the same stems", () => {
  const s = new ChaseSimulation();
  s.start();
  s.obstacles = [];
  s.police = [];
  s.traffic = [];
  Object.assign(s.player, { x: 0, z: 0, angle: 0, vz: 35 });
  s.trees = [{ id: 0, x: 0, z: 5, h: 8, radius: 0.32 }];
  for (let i = 0; i < 30; i++) s.update(1 / 120, { throttle: 1 });
  assert(s.trees[0].broken);
  assert(s.player.health < 100);
  assert.equal(s.snapshot().treesBroken, 1);
  s.start();
  assert.equal(s.trees.length, TREES.length);
  assert(s.trees.every((t) => !t.broken));
});
test("patrol doors and bumpers exchange impulses at arbitrary orientations", () => {
  for (const angle of [0, 0.4, Math.PI / 2, 2.3]) {
    const a = vehicle(0, 0, angle),
      b = vehicle(0.6, 0.2, angle + 0.3);
    a.vx = 18;
    b.vx = -6;
    const before = a.vx + b.vx;
    const hit = vehicleContact(a, b);
    assert(hit.touching);
    assert(!vehicleContact(a, b, false).touching);
    assert(Math.abs(a.vx + b.vx - before) < 1e-6);
    assert(Number.isFinite(a.vz) && Number.isFinite(b.vz));
  }
});
test("overlapping police units separate during the actual pursuit update", () => {
  const s = new ChaseSimulation();
  s.start();
  s.obstacles = [];
  s.trees = [];
  s.traffic = [];
  Object.assign(s.player, { x: 0, z: 80, angle: 0 });
  s.police = [s.makePolice(0, 0), s.makePolice(0.5, 0.1), s.makePolice(1, 0.2)];
  for (let i = 0; i < 60; i++) s.update(1 / 120);
  for (let i = 0; i < s.police.length; i++)
    for (let j = i + 1; j < s.police.length; j++) {
      const c = vehicleContact(s.police[i], s.police[j], false);
      assert(!c.touching || c.depth < 0.02);
    }
});
test("drift carries sideways momentum and countersteering restores grip", () => {
  const c = vehicle();
  drive(c, { throttle: 1 }, 3);
  drive(c, { throttle: 1, steer: 0.7, brake: true }, 0.6);
  assert(c.isDrifting);
  assert(Math.abs(c.slip) > 0.1);
  drive(c, { throttle: 1, steer: -0.2 }, 1.2);
  assert(!c.isDrifting);
  assert(Math.abs(c.slip) < 0.05);
});
test("pursuit starts with four units, adds checkpoint reinforcements, and retains varied civilian traffic", () => {
  const s = new ChaseSimulation();
  s.start();
  assert.equal(s.police.length, 4);
  assert(s.police.some((c) => c.role === "intercept"));
  assert(new Set(s.traffic.map((t) => t.kind)).size >= 5);
  assert(
    s.traffic.filter((t) => t.kind === "sport").length < s.traffic.length / 3,
  );
  s.obstacles = [];
  s.trees = [];
  s.traffic = [];
  for (const cp of CHECKPOINTS) {
    Object.assign(s.player, { ...cp, vx: 0, vz: 0 });
    s.update(1 / 120);
  }
  assert.equal(s.police.length, 7);
  assert.equal(s.police.filter((c) => c.role === "blockade").length, 2);
});
test("hitting an ambient patrol activates the full pursuit before checkpoint one", () => {
  const s = new ChaseSimulation();
  s.start();
  s.obstacles = [];
  s.trees = [];
  s.traffic = [];
  const cop = s.makePolice(s.player.x, s.player.z + 3.5);
  s.police = [cop];
  s.player.vz = 22;
  s.player.speed = 22;
  s.update(1 / 120, {});
  assert.equal(s.checkpoint, 0);
  assert.equal(s.pursuitStarted, true);
  assert.equal(s.radioContact.x, s.player.x);
  assert(s.nextWaveAt > s.time);
  assert.match(s.events.join(" "), /PATROL HIT/);
  s.timeline.restore(s, 0);
  assert.equal(s.pursuitStarted, false);
});
test("free roam keeps run score at zero until pursuit begins", () => {
  const s = new ChaseSimulation();
  s.start();
  s.obstacles = [];
  s.trees = [];
  s.traffic = [];
  s.police = [];
  for (let i = 0; i < 240; i++) s.update(1 / 120, { throttle: 1 });
  assert.equal(s.pursuitStarted, false);
  assert.equal(s.score, 0);
  assert(s.runDistance > 0, "free roam still tracks exploration distance");
  s.activatePursuit("collision");
  for (let i = 0; i < 120; i++) s.update(1 / 120, { throttle: 1 });
  assert(s.score > 0);
});
test("a blockade unit plans a road position ahead of the observed moving player", () => {
  const s = new ChaseSimulation();
  s.start();
  s.obstacles = [];
  s.trees = [];
  s.traffic = [];
  s.checkpoint = 1;
  Object.assign(s.player, { x: 0, z: 0, angle: 0, vz: 25 });
  s.police = [s.makePolice(0, -20, "blockade")];
  s.update(1 / 120, { throttle: 1 });
  const cop = s.police[0];
  assert(cop.blockPoint);
  assert(distance(cop.blockPoint, s.player) > 55);
  assert(cop.blockPoint.z > s.player.z);
});
