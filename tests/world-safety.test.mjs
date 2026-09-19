import test from "node:test";
import assert from "node:assert/strict";
import {
  ChaseSimulation,
  vehicle,
  resolveCircleRect,
} from "../dist/simulation.js";
import {
  ROADS,
  BUILDINGS,
  nearestRoad,
  containsPoint,
  routeBetween,
} from "../dist/city-map.js";
import { BRIDGE_BARRIERS } from "../dist/bridge-data.js";
import { RIVER, LANDMARKS } from "../dist/district-data.js";
import { inRiver, unsupportedWater, driveableLine } from "../dist/water.js";
import {
  MOUNDS,
  terrainBlocked,
  groundHeight,
  resolveTerrain,
  mountainHeight,
} from "../dist/terrain.js";
import { nearbyObstacles } from "../dist/spatial-index.js";
const isolated = () => {
  const s = new ChaseSimulation();
  s.start();
  s.traffic = [];
  s.police = [];
  s.trees = [];
  s.poles = [];
  s.ramps = [];
  s.nextWaveAt = Infinity;
  return s;
};

test("sedans, SUVs and tanks sink and respawn; live pursuit never drives on unsupported water", () => {
  for (const kind of ["sedan", "suv", "tank"]) {
    const s = isolated(),
      point = RIVER[5],
      cop = s.makePolice(point.x, point.z);
    Object.assign(cop, {
      kind,
      width: kind === "tank" ? 3.15 : 2.2,
      length: kind === "tank" ? 6.3 : 5.3,
    });
    const id = cop.id;
    s.police = [cop];
    for (let i = 0; i < 380; i++) s.update(1 / 120, {});
    assert.notEqual(cop.id, id, kind);
    assert.equal(cop.waterAt, null);
    assert(!unsupportedWater(cop));
  }
  const s = isolated(),
    point = RIVER[6],
    left = nearestRoad({ x: point.x - 80, z: point.z }),
    right = nearestRoad({ x: point.x + 80, z: point.z });
  Object.assign(s.player, { x: right.x, z: right.z });
  const cop = s.makePolice(left.x, left.z);
  cop.angle = left.angle;
  s.police = [cop];
  for (let i = 0; i < 2400; i++) {
    s.update(1 / 120, {});
    s.bust = 0;
    s.player.health = 100;
    for (const unit of s.police)
      assert(
        !unsupportedWater(unit) || unit.waterAt != null,
        "Patrol is driving over open water",
      );
  }
});

test("barrier presentation bends in the contact frame and resets on rewind", async () => {
  const THREE = await import("../dist/vendor/three.module.js");
  const { buildBridgeRails, updateBridgeRails } = await import(
    "../dist/bridge-visuals.js"
  );
  const view = { decor: new THREE.Group() },
    material = new THREE.MeshStandardMaterial();
  buildBridgeRails(view, material, material);
  const states = BRIDGE_BARRIERS.map((b) => ({ ...b })),
    before = new THREE.Matrix4(),
    after = new THREE.Matrix4();
  view.bridgeRails[0].mesh.getMatrixAt(0, before);
  states[0].broken = true;
  states[0].fallenAt = 10;
  updateBridgeRails(view, states, 10);
  view.bridgeRails[0].mesh.getMatrixAt(0, after);
  assert(!after.equals(before));
  states[0].broken = false;
  updateBridgeRails(view, states, 9);
  view.bridgeRails[0].mesh.getMatrixAt(0, after);
  assert(after.equals(before));
});

test("new streets connect to the city and every road lane stays above water and outside hills", () => {
  for (const name of [
    "Besiki Street",
    "Geronti Kikodze Street",
    "Paolo Iashvili Street",
    "Mikheil Lermontovi Street",
    "Sulkhan-Saba Street",
  ]) {
    const road = ROADS.find((r) => r.name === name);
    assert(road, name);
    assert(routeBetween(ROADS[0].start, road.end).length >= 1);
  }
  for (const r of ROADS)
    for (let d = 0; d <= r.length; d += 2)
      for (const side of [-1, 0, 1]) {
        const lane = side * Math.min(3, r.width / 2 - 2.5);
        const p = {
          x: r.start.x + Math.sin(r.angle) * d + Math.cos(r.angle) * lane,
          z: r.start.z + Math.cos(r.angle) * d - Math.sin(r.angle) * lane,
        };
        assert(
          !unsupportedWater(p),
          `Unbridged road: ${r.name} ${r.id} ${JSON.stringify(p)}`,
        );
        assert(!terrainBlocked(p, 1.2), `Hill on road: ${r.name} ${r.id}`);
      }
});
test("only an explicit bridge supports a car inside the actual rendered river polygon", () => {
  const p = RIVER[6];
  assert(inRiver(p));
  assert(unsupportedWater(p));
  for (const r of RIVER)
    assert(
      mountainHeight(r.x, r.z) < -6.4,
      "Riverbed hides the water and splash",
    );
  assert(!driveableLine({ x: p.x - 55, z: p.z }, { x: p.x + 55, z: p.z }));
  for (const r of ROADS.filter((r) => /Bridge/.test(r.name)))
    assert(driveableLine(r.start, r.end), r.name);
});
test("patrol falls, splashes once, stops colliding and respawns clear on a road with a new identity", () => {
  const s = isolated(),
    at = RIVER[6],
    cop = s.makePolice(at.x, at.z),
    oldId = cop.id;
  s.police = [cop];
  s.update(1 / 120, {});
  assert(cop.waterAt != null);
  const entered = { x: cop.x, z: cop.z };
  let splashes = 0,
    lowest = 0;
  for (let i = 0; i < 400 && cop.id === oldId; i++) {
    s.update(1 / 120, {});
    lowest = Math.min(lowest, cop.y);
    splashes += s.soundEvents
      .splice(0)
      .filter((e) => e.kind === "water").length;
    if (cop.id === oldId)
      assert(
        Math.hypot(cop.x - entered.x, cop.z - entered.z) < 0.01,
        "No underwater driving",
      );
  }
  assert(lowest < -8);
  assert.notEqual(cop.id, oldId);
  assert.equal(cop.y, 0);
  assert.equal(cop.waterAt, null);
  assert(!unsupportedWater(cop));
  assert(nearestRoad(cop).distance < 1);
  assert(!s.obstacles.some((b) => containsPoint(b, cop.x, cop.z, 2.5)));
  assert.equal(s.runCash, 0, "Sinking cannot repeatedly award wreck cash");
  // This river position is out of audio range; the visual event still happens.
  assert(splashes <= 1);
});
test("player river recovery costs HP, and rewind restores a pre-fall world", () => {
  const s = isolated();
  const start = { ...s.player };
  Object.assign(s.player, { x: RIVER[6].x, z: RIVER[6].z });
  s.update(1 / 120, {});
  assert(s.player.waterAt != null);
  for (let i = 0; i < 370; i++) s.update(1 / 120, {});
  assert.equal(s.player.waterAt, null);
  assert.equal(s.player.health, 80);
  assert.equal(s.player.y, 0);
  assert(!unsupportedWater(s.player));
  s.timeline.restore(s, 0);
  assert.equal(s.player.x, start.x);
  assert.equal(s.player.waterAt, undefined);
  assert.equal(s.player.health, 100);
});
test("mounds and mountain slopes push vehicles back instead of letting them tunnel under terrain", () => {
  for (const m of [...MOUNDS, { x: 1100, z: -430 }]) {
    const road = nearestRoad(m),
      c = vehicle(road.x, road.z),
      before = { x: c.x, z: c.z };
    c.x = m.x;
    c.z = m.z;
    c.vx = (m.x - before.x) * 2;
    c.vz = (m.z - before.z) * 2;
    assert(groundHeight(m.x, m.z) > 1);
    assert(resolveTerrain(c, before) > 0);
    assert(!terrainBlocked(c, 0.99));
    assert(Math.hypot(c.x - m.x, c.z - m.z) > 10);
  }
});
test("a glancing fast scrape does not fracture a rail, and a hard local hit rewinds cleanly", () => {
  const s = isolated(),
    b = s.obstacles.find((b) => b.barrier && !b.flyoverRail),
    c = vehicle(b.x + Math.cos(b.angle) * 2, b.z - Math.sin(b.angle) * 2);
  c.vx = Math.sin(b.angle) * 80 - Math.cos(b.angle) * 5;
  c.vz = Math.cos(b.angle) * 80 + Math.sin(b.angle) * 5;
  resolveCircleRect(c, 2.1, b);
  assert(!b.broken);
  c.x = b.x + Math.cos(b.angle) * 2;
  c.z = b.z - Math.sin(b.angle) * 2;
  c.vx = -Math.cos(b.angle) * 65;
  c.vz = Math.sin(b.angle) * 65;
  resolveCircleRect(c, 2.1, b);
  assert(b.broken);
  assert(!containsPoint(b, b.x, b.z));
  assert.equal(s.obstacles.filter((b) => b.broken).length, 1);
  s.timeline.restore(s, 0);
  assert(!b.broken);
  assert(containsPoint(b, b.x, b.z));
  assert(BRIDGE_BARRIERS.every((b) => !b.broken));
});
test("road hierarchy returns exactly the same projection as a complete road scan", () => {
  for (let i = 0; i < 300; i++) {
    const p = { x: Math.sin(i * 17.3) * 1800, z: Math.cos(i * 13.1) * 1750 };
    let best,
      dist = Infinity;
    for (const r of ROADS) {
      const dx = r.end.x - r.start.x,
        dz = r.end.z - r.start.z;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - r.start.x) * dx + (p.z - r.start.z) * dz) /
            (r.length * r.length),
        ),
      );
      const x = r.start.x + dx * t,
        z = r.start.z + dz * t,
        d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < dist) {
        dist = d;
        best = { x, z, road: r };
      }
    }
    const actual = nearestRoad(p);
    assert.equal(actual.road.id, best.road.id);
    assert.equal(actual.x, best.x);
    assert.equal(actual.z, best.z);
  }
});
test("collision broad phase preserves all touching rotated footprints and source order", () => {
  const obstacles = [...BUILDINGS, ...BRIDGE_BARRIERS];
  for (let i = 0; i < 100; i++) {
    const b = obstacles[(i * 7) % obstacles.length],
      p = { x: b.x, z: b.z };
    const full = obstacles.filter((o) => containsPoint(o, p.x, p.z, 4));
    const local = nearbyObstacles(obstacles, p.x, p.z, 4).filter((o) =>
      containsPoint(o, p.x, p.z, 4),
    );
    assert.deepEqual(local, full);
  }
});
