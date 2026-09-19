import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import * as THREE from "../dist/vendor/three.module.js";
import { AXIS, KING_DAVID, HEROES } from "../dist/tbilisi-civic-layout.js";
import { FLYOVER_RAILS } from "../dist/tbilisi-civic-data.js";
import {
  ROADS,
  BUILDINGS,
  NODES,
  nearestRoad,
  containsPoint,
} from "../dist/city-map.js";
import { SPONSOR_SITES } from "../dist/sponsor-sites.js";
import { roadClear } from "../dist/road-clearance.js";
import { ChaseSimulation, vehicle } from "../dist/simulation.js";
import { buildingContact } from "../dist/building-contact.js";
import { RewindTimeline } from "../dist/rewind.js";
import {
  calibrateRoadsideProps,
  registerBreakable,
} from "../dist/breakable-props.js";
import {
  buildElevatedRails,
  updateBridgeRails,
} from "../dist/bridge-visuals.js";

const fixture = (city) =>
  JSON.parse(
    fs.readFileSync(
      new URL(`./fixtures/${city}-event-sites-v40.json`, import.meta.url),
    ),
  );
test("all released CITY WARS artifact coordinates, IDs and facing directions survive the map edit", () => {
  assert.deepEqual(
    SPONSOR_SITES.filter((s) => [0, 3, 6, 9, 12].includes(s.id)),
    fixture("tbilisi"),
  );
  for (const city of ["kutaisi", "batumi", "rustavi"]) {
    const script = `globalThis.location={href:'http://localhost/?map=${city}'};const {SPONSOR_SITES}=await import('./dist/sponsor-sites.js');console.log(JSON.stringify(SPONSOR_SITES.filter(s=>[0,3,6,9,12].includes(s.id))));`;
    assert.deepEqual(
      JSON.parse(
        execFileSync(process.execPath, ["--input-type=module", "-e", script], {
          cwd: new URL("..", import.meta.url),
        }),
      ),
      fixture(city),
    );
  }
});
test("fixed artifacts have an unobstructed street approach and no sponsor overlaps", () => {
  assert.equal(SPONSOR_SITES.length, 48);
  assert.equal(new Set(SPONSOR_SITES.map((s) => s.id)).size, 48);
  for (const p of fixture("tbilisi")) {
    const n = nearestRoad(p);
    assert.ok(n.distance <= n.road.width / 2 + 3.3);
    for (const along of [-4, -2, 0, 2, 4]) {
      const q = {
        x: p.x + Math.cos(p.angle) * along,
        z: p.z - Math.sin(p.angle) * along,
      };
      assert.ok(roadClear(q, 0.7));
      for (let t = 0; t <= 1; t += 0.1)
        assert.ok(
          !BUILDINGS.some((b) =>
            containsPoint(b, q.x + (n.x - q.x) * t, q.z + (n.z - q.z) * t, 1),
          ),
        );
    }
    assert.ok(
      SPONSOR_SITES.every(
        (s) => s.id === p.id || Math.hypot(s.x - p.x, s.z - p.z) > 35,
      ),
    );
  }
});
test("roadside calibration leaves every released artifact at its exact saved location", () => {
  const view = { breakableProps: [] },
    parent = new THREE.Group();
  for (const p of fixture("tbilisi")) {
    const root = new THREE.Group();
    root.position.set(p.x, 0, p.z);
    root.rotation.y = p.angle;
    parent.add(root);
    for (const x of [-4, -2, 0, 2, 4])
      registerBreakable(
        view,
        root,
        p.x + Math.cos(p.angle) * x,
        p.z - Math.sin(p.angle) * x,
        5.7,
        0.16,
        "metal",
      );
  }
  calibrateRoadsideProps(view);
  assert.equal(view.roadsideCalibration.moved, 0);
});
test("all new ground streets and flyover centerlines are free of complete building collision geometry", () => {
  for (const r of ROADS.filter((r) => r.id >= 766)) {
    const steps = Math.ceil(r.length / 2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps,
        p = vehicle(
          r.start.x + (r.end.x - r.start.x) * t,
          r.start.z + (r.end.z - r.start.z) * t,
          r.angle,
        );
      p.y = r.start.y + (r.end.y - r.start.y) * t;
      assert.ok(
        !BUILDINGS.some((b) => buildingContact({ ...p }, b)),
        `${r.name} at ${t}`,
      );
    }
  }
});
test("landmarks adjoin the old city and Axis has a clear, direct road frontage", () => {
  for (const p of [HEROES, AXIS, KING_DAVID])
    assert.ok(Math.hypot(p.x - NODES[217].x, p.z - NODES[217].z) < 550);
  for (const dx of [-58, -34, 0, 34, 58]) {
    const p = { x: AXIS.x + dx, z: AXIS.z + 31 },
      n = nearestRoad(p);
    assert.ok(n.distance < n.road.width / 2 + 4.5);
    for (let t = 0; t <= 1; t += 0.05)
      assert.ok(
        !BUILDINGS.some(
          (b) =>
            !b.civic &&
            containsPoint(b, p.x + (n.x - p.x) * t, p.z + (n.z - p.z) * t, 1),
        ),
      );
  }
  assert.ok(ROADS.filter((r) => r.id >= 766 && r.a < 598).length >= 3);
});
test("flyover barriers stop slow impacts and high-speed glancing scrapes, and break on hard normal impacts", () => {
  for (const side of [-1, 1])
    for (const [normal, tangent, broken] of [
      [12, 0, false],
      [2, 65, false],
      [45, 0, true],
    ]) {
      const source = FLYOVER_RAILS.find(
          (r) => r.base === 7.4 && r.side === side,
        ),
        rail = { ...source };
      const nx = Math.cos(rail.angle) * side,
        nz = -Math.sin(rail.angle) * side;
      const car = vehicle(
        rail.x - nx * 1.8,
        rail.z - nz * 1.8,
        Math.atan2(nx, nz),
      );
      Object.assign(car, {
        y: 7.4,
        vx: nx * normal + Math.sin(rail.angle) * tangent,
        vz: nz * normal + Math.cos(rail.angle) * tangent,
        carId: "classic",
      });
      assert.equal(buildingContact(car, rail), true);
      assert.equal(!!rail.broken, broken);
      if (broken) assert.equal(rail.brokenByPlayer, true);
    }
});
test("breaking a flyover panel drops the car to ground and rewind/reset restore independent rail states", () => {
  const sim = new ChaseSimulation();
  sim.start();
  sim.police = [];
  sim.traffic = [];
  sim.nextWaveAt = Infinity;
  sim.trees = [];
  sim.poles = [];
  const r = FLYOVER_RAILS.find((r) => r.id === "heroes-flyover-25--1"),
    nx = Math.cos(r.angle) * r.side,
    nz = -Math.sin(r.angle) * r.side;
  Object.assign(sim.player, {
    x: r.x - nx * 4,
    z: r.z - nz * 4,
    y: 7.4,
    vx: nx * 45,
    vz: nz * 45,
    speed: 45,
    angle: Math.atan2(nx, nz),
  });
  const history = new RewindTimeline();
  history.capture(sim);
  let airborne = false;
  for (let i = 0; i < 180; i++) {
    sim.update(1 / 120, { throttle: 1, steer: 0 });
    airborne ||= sim.player.airborne;
  }
  assert.ok(airborne);
  assert.equal(sim.player.y, 0);
  assert.ok(sim.player.health > 0);
  assert.ok(sim.obstacles.find((b) => b.id === r.id).broken);
  assert.ok(!new ChaseSimulation().obstacles.find((b) => b.id === r.id).broken);
  assert.ok(!r.broken);
  history.restore(sim, 0);
  assert.ok(!sim.obstacles.find((b) => b.id === r.id).broken);
  assert.equal(sim.player.y, 7.4);
});
test("instanced elevated rail geometry reacts in the collision frame and restores on rewind", () => {
  const r = FLYOVER_RAILS.find((r) => r.base === 7.4),
    material = new THREE.MeshBasicMaterial();
  const view = { decor: new THREE.Group() };
  buildElevatedRails(view, [r], material);
  const mesh = view.bridgeRails[0].mesh,
    before = new THREE.Matrix4(),
    after = new THREE.Matrix4();
  mesh.getMatrixAt(0, before);
  const state = { ...r, broken: true, fallenAt: 10 };
  updateBridgeRails(view, [state], 10);
  mesh.getMatrixAt(0, after);
  assert.notDeepEqual(after.elements, before.elements);
  state.broken = false;
  updateBridgeRails(view, [state], 9);
  mesh.getMatrixAt(0, after);
  assert.deepEqual(after.elements, before.elements);
  mesh.geometry.dispose();
  material.dispose();
});
