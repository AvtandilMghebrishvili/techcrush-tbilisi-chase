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

test("guidance follows each driving frame without size pulsation and freezes on pause", () => {
  const sim = new ChaseSimulation(),
    guide = makeRouteGuide(new THREE.Scene());
  sim.start();
  updateRouteGuide(guide, sim, "cockpit");
  const first = guide.points[0];
  sim.player.x += Math.sin(sim.player.angle) * 0.5;
  sim.player.z += Math.cos(sim.player.angle) * 0.5;
  sim.time += 1 / 60;
  updateRouteGuide(guide, sim, "cockpit");
  assert(distance(first, guide.points[0]) > 0.1, "no 200 ms position stall");
  const sizes = guide.arrows.map((a) => a.scale.x);
  const heights = guide.arrows.map((a) => a.position.y);
  sim.time += 0.1;
  updateRouteGuide(guide, sim, "cockpit");
  assert.deepEqual(
    guide.arrows.map((a) => a.scale.x),
    sizes,
  );
  assert.deepEqual(
    guide.arrows.map((a) => a.position.y),
    heights,
  );
  sim.phase = "paused";
  const opacity = guide.arrows.map((a) => a.material.opacity);
  updateRouteGuide(guide, sim, "cockpit");
  assert.deepEqual(
    guide.arrows.map((a) => a.material.opacity),
    opacity,
  );
  sim.time = 0;
  Object.assign(sim.player, START);
  updateRouteGuide(guide, sim, "cockpit");
  assert(guide.points.every((p) => Number.isFinite(p.x + p.z)));
});

test("all camera views keep projected arrows compact on wide and portrait screens", () => {
  const sim = new ChaseSimulation();
  sim.start();
  for (const aspect of [16 / 9, 390 / 844]) {
    for (const mode of ["chase", "cockpit", "hood", "aerial"]) {
      const scene = new THREE.Scene(),
        guide = makeRouteGuide(scene);
      const interior = mode === "cockpit" || mode === "hood";
      const camera = new THREE.PerspectiveCamera(
        interior ? 76 : 56,
        aspect,
        0.1,
        1500,
      );
      const forward = new THREE.Vector3(
        Math.sin(sim.player.angle),
        0,
        Math.cos(sim.player.angle),
      );
      camera.position.set(
        sim.player.x,
        interior ? 1.05 : mode === "aerial" ? 26 : 4.4,
        sim.player.z,
      );
      camera.position.addScaledVector(
        forward,
        interior ? 0 : mode === "aerial" ? -27 : -9,
      );
      camera.lookAt(
        new THREE.Vector3(sim.player.x, 1, sim.player.z).addScaledVector(
          forward,
          60,
        ),
      );
      updateRouteGuide(guide, sim, mode, camera);
      scene.updateMatrixWorld(true);
      const visible = guide.arrows.filter((a) => a.visible);
      assert(visible.length > 3, `${mode} retains a readable route`);
      if (interior)
        assert.equal(
          guide.arrows[0].visible,
          false,
          "clear the near windshield",
        );
      for (const arrow of visible) {
        const positions = arrow.geometry.attributes.position,
          xs = [];
        for (let i = 0; i < positions.count; i++) {
          const v = new THREE.Vector3()
            .fromBufferAttribute(positions, i)
            .applyMatrix4(arrow.matrixWorld)
            .project(camera);
          assert(Number.isFinite(v.x + v.y + v.z));
          xs.push(v.x);
        }
        const screenFraction = (Math.max(...xs) - Math.min(...xs)) / 2;
        assert(
          screenFraction < (interior ? 0.065 : 0.09),
          `${mode} arrow width ${screenFraction}`,
        );
        assert(
          arrow.material.depthTest,
          "world objects still occlude guidance",
        );
      }
    }
  }
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
  let approachSpeed = 0;
  for (let i = 0; i < 900; i++) {
    sim.player.vx = 30;
    sim.player.vz = 0;
    sim.update(1 / 120, {});
    if (distance(sim.police[0], sim.player) > 12)
      approachSpeed = Math.max(
        approachSpeed,
        Math.hypot(sim.police[0].vx, sim.police[0].vz),
      );
  }
  const cop = sim.police[0];
  assert(distance(cop, sim.player) < 80);
  assert(approachSpeed > 37);
  // Faster police now catch and ram this target before the seven-second end.
  assert(sim.player.health < 100 || distance(cop, sim.player) < 12);
  assert(Math.hypot(cop.vx, cop.vz) <= sim.difficulty.maxSpeed + 3.51);
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
