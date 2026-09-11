import { START, containsPoint } from "../dist/city-map.js";
import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../dist/vendor/three.module.js";
import {
  sampleRoute,
  makeRouteGuide,
  updateRouteGuide,
} from "../dist/route-guide.js";
import {
  ChaseSimulation,
  routeBetween,
  CHECKPOINTS,
  blocks,
  lineOfSight,
  distance,
} from "../dist/simulation.js";

test("road arrows point along both legs of a corner and stay on legal checkpoint routes", () => {
  const sample = sampleRoute({ x: 0, z: 0 }, [
    { x: 0, z: 28 },
    { x: 50, z: 28 },
  ]);
  assert(sample.some((p) => p.angle === 0));
  assert(sample.some((p) => p.angle === Math.PI / 2));
  for (let i = 1; i < sample.length; i++)
    assert.equal(sample[i].along - sample[i - 1].along, 13);
  for (let i = 0; i < CHECKPOINTS.length; i++) {
    const from = CHECKPOINTS[i - 1] || START;
    const arrows = sampleRoute(
      from,
      routeBetween(from, CHECKPOINTS[i]),
      13,
      1000,
    );
    for (const p of arrows) {
      assert(!blocks().some((b) => containsPoint(b, p.x, p.z)));
    }
  }
});

test("road guide animates, changes checkpoint, hides for escape and survives a restart", () => {
  const sim = new ChaseSimulation(),
    guide = makeRouteGuide(new THREE.Scene());
  updateRouteGuide(guide, sim);
  assert.equal(guide.group.visible, false);
  sim.start();
  updateRouteGuide(guide, sim);
  assert(guide.arrows.some((a) => a.visible));
  const opacity = guide.arrows[0].material.opacity;
  sim.time = 0.1;
  updateRouteGuide(guide, sim);
  assert.notEqual(guide.arrows[0].material.opacity, opacity);
  sim.checkpoint = 1;
  updateRouteGuide(guide, sim);
  assert.equal(guide.checkpoint, 1);
  sim.checkpoint = 6;
  updateRouteGuide(guide, sim);
  assert.equal(guide.group.visible, false);
  sim.start();
  updateRouteGuide(guide, sim);
  assert(guide.group.visible);
  assert.equal(guide.checkpoint, 0);
});

test("aggressive patrol gains on a moving car while respecting its speed limit", () => {
  const sim = new ChaseSimulation();
  sim.start();
  sim.traffic = [];
  sim.obstacles = [];
  sim.checkpoint = 6;
  Object.assign(sim.player, {
    x: START.x + 90,
    z: START.z,
    angle: Math.PI / 2,
  });
  sim.police = [sim.makePolice(START.x, START.z)];
  sim.police[0].angle = Math.PI / 2;
  for (let i = 0; i < 900; i++) {
    sim.player.vx = 30;
    sim.player.vz = 0;
    sim.update(1 / 120, {});
  }
  const cop = sim.police[0];
  assert(distance(cop, sim.player) < 80);
  assert(Math.hypot(cop.vx, cop.vz) > 37);
  assert(Math.hypot(cop.vx, cop.vz) < 42);
});

test("patrol radio shares sightings but cannot track an unseen player through buildings", () => {
  const sim = new ChaseSimulation();
  sim.start();
  sim.traffic = [];
  sim.obstacles = [{ minX: 40, maxX: 100, minZ: 20, maxZ: 150 }];
  Object.assign(sim.player, { x: 0, z: 10, angle: 0 });
  const witness = sim.makePolice(0, -80),
    hidden = sim.makePolice(140, 100);
  sim.police = [witness, hidden];
  assert(!lineOfSight(hidden, sim.player, sim.obstacles));
  sim.update(1 / 120, {});
  assert.equal(hidden.lastSeen.x, sim.player.x);
  assert.equal(hidden.lastSeen.z, sim.player.z);
  const remembered = { ...hidden.lastSeen };
  sim.police = [hidden];
  sim.player.z = 20;
  assert(!lineOfSight(hidden, sim.player, sim.obstacles));
  sim.update(1 / 120, {});
  assert.deepEqual(hidden.lastSeen, remembered);
});
