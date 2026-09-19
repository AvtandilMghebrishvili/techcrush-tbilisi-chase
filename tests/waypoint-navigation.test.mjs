import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../dist/vendor/three.module.js";
import { ChaseSimulation } from "../dist/simulation.js";
import { nearestRoad } from "../dist/city-map.js";
import {
  checkpointTarget,
  checkpointRoute,
  secondaryTarget,
  secondaryRoute,
  setWaypoint,
} from "../dist/navigation-cache.js";
import {
  headingRadarPoint,
  radarPoint,
  mapClickPoint,
} from "../dist/hud-math.js";
import { makeRouteGuide, updateRouteGuide } from "../dist/route-guide.js";

test("heading-up radar keeps forward above the driver at every cardinal heading", () => {
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 2.917]) {
    const p = { x: 23, z: -83, angle };
    const q = headingRadarPoint(
      { x: p.x + Math.sin(angle) * 80, z: p.z + Math.cos(angle) * 80 },
      p,
      0.5,
    );
    assert(Math.abs(q.x - 115) < 1e-8);
    assert(Math.abs(q.y - 75) < 1e-8);
    const right = headingRadarPoint(
      { x: p.x - Math.cos(angle) * 600, z: p.z + Math.sin(angle) * 600 },
      p,
    );
    const edge = radarPoint(right.x, right.y);
    assert(Math.abs(edge.x - 216) < 1e-8);
    assert(Math.abs(edge.y - 115) < 1e-8);
  }
});
test("map clicks invert the actual panned and zoomed surface and reject outside clicks", () => {
  for (const zoom of [1, 1.25, 3]) {
    const r = {
      left: -320 * zoom,
      top: 37,
      width: 600 * zoom,
      height: 600 * zoom,
    };
    const point = mapClickPoint(
      { x: r.left + r.width * 0.2, y: r.top + r.height * 0.7 },
      r,
      2680,
    );
    assert(Math.abs(point.x - 1608) < 1e-6);
    assert(Math.abs(point.z + 1072) < 1e-6);
    assert.equal(mapClickPoint({ x: r.left - 1, y: r.top }, r, 2680), null);
  }
  assert.equal(
    mapClickPoint({ x: 0, y: 0 }, { width: 0, height: 0 }, 100),
    null,
  );
});
test("custom and stunt guidance coexist with checkpoints, cache independently and clear cleanly", () => {
  const s = new ChaseSimulation();
  s.start();
  const cp = checkpointTarget(s),
    primary = checkpointRoute(s);
  setWaypoint(s, { x: 560, z: 470 }, "TEST PIN");
  const target = secondaryTarget(s),
    route = secondaryRoute(s);
  assert.equal(checkpointTarget(s), cp);
  assert.equal(checkpointRoute(s), primary);
  assert.equal(secondaryRoute(s), route);
  assert(nearestRoad(target).distance < 1e-8);
  assert.deepEqual(route.at(-1), { x: target.x, z: target.z });
  s.checkpoint++;
  assert.notEqual(checkpointRoute(s), primary);
  assert.equal(secondaryRoute(s), route);
  s.player.x += 0.003;
  assert.notEqual(secondaryRoute(s), route);
  setWaypoint(s, null);
  s.navQuest = "skybox";
  assert(secondaryTarget(s));
  assert.equal(checkpointTarget(s), s.checkpoints[s.checkpoint]);
  s.navQuest = null;
  assert.equal(secondaryTarget(s), null);
  assert.deepEqual(secondaryRoute(s), []);
});
test("both 3D arrow ribbons render together and stop outside play without reallocating", () => {
  const s = new ChaseSimulation();
  s.start();
  const scene = new THREE.Scene(),
    guide = makeRouteGuide(scene);
  setWaypoint(s, { x: 560, z: 470 });
  updateRouteGuide(guide, s);
  assert(guide.group.visible && guide.extra.group.visible);
  assert(guide.arrows.some((a) => a.visible));
  assert(guide.extra.arrows.some((a) => a.visible));
  assert.notEqual(
    guide.arrows[0].material.color.getHex(),
    guide.extra.arrows[0].material.color.getHex(),
  );
  const meshes = [...guide.extra.arrows];
  for (let i = 0; i < 150; i++) {
    s.time += 0.016;
    updateRouteGuide(guide, s, "cockpit");
  }
  assert.deepEqual(guide.extra.arrows, meshes);
  setWaypoint(s, null);
  updateRouteGuide(guide, s);
  assert(guide.group.visible);
  assert(!guide.extra.group.visible);
  s.phase = "menu";
  updateRouteGuide(guide, s);
  assert(!guide.group.visible && !guide.extra.group.visible);
});
