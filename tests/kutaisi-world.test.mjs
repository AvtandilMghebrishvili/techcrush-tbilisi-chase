import test from "node:test";
import assert from "node:assert/strict";
globalThis.location = new URL("http://localhost/?map=kutaisi");
const { ChaseSimulation, vehicle } = await import("../dist/simulation.js");
const { buildingContact } = await import("../dist/building-contact.js");
const THREE = await import("../dist/vendor/three.module.js");
const { batchStreetLamps } = await import("../dist/lamp-batches.js");
const { registerBreakable, updateBreakables } = await import(
  "../dist/breakable-props.js"
);
const { ROADS, BUILDINGS, START, routeBetween, containsPoint } = await import(
  "../dist/city-map.js"
);
const { BRIDGE_DECKS, PEACE_DECK } = await import("../dist/bridge-data.js");
const { unsupportedWater } = await import("../dist/water.js");
const { terrainBlocked } = await import("../dist/terrain.js");
const { overlapsRoad } = await import("../dist/map-clearance.js");
const { checkpointsForLevel } = await import("../dist/level-routes.js");
const { SPECIAL_RAMPS, ROOFTOP } = await import("../dist/world-sites.js");
const { onAsphalt } = await import("../dist/road-clearance.js");
const { RIVER_POLYGON, KUTAISI_SITES } = await import(
  "../dist/kutaisi-district-data.js"
);

test("fountain contacts stay finite at every approach; cars do not enter the round basin", () => {
  const f = BUILDINGS.find((b) => b.cylinder);
  for (let i = 0; i < 32; i++) {
    const a = (i * Math.PI) / 16,
      c = vehicle(
        f.x + Math.sin(a) * 12.8,
        f.z + Math.cos(a) * 12.8,
        a + Math.PI,
      );
    c.vx = -Math.sin(a) * 20;
    c.vz = -Math.cos(a) * 20;
    assert(buildingContact(c, f));
    for (const k of ["x", "z", "vx", "vz"]) assert(Number.isFinite(c[k]));
    assert(Math.hypot(c.x - f.x, c.z - f.z) > 13);
  }
});
test("batched lamps break on the contact frame and restore their exact matrices on rewind", () => {
  const decor = new THREE.Group(),
    root = new THREE.Group();
  decor.add(root);
  root.position.set(42, 0, 27);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.2, 0.5),
    new THREE.MeshStandardMaterial(),
  );
  head.position.y = 8;
  root.add(head);
  const v = { decor, streetLamps: [{ head }], breakableProps: [] };
  registerBreakable(v, root, 42, 27);
  batchStreetLamps(v);
  const item = root.userData.lampInstances[0],
    matrix = new THREE.Matrix4();
  item.batch.getMatrixAt(0, matrix);
  const intact = matrix.clone();
  const sim = { time: 2, poles: [{ broken: false }] };
  updateBreakables(v, sim);
  sim.poles[0] = { broken: true, fallenAt: 2, fallAngle: 0 };
  updateBreakables(v, sim);
  assert(root.quaternion.angleTo(new THREE.Quaternion()) > 0.1);
  item.batch.getMatrixAt(0, matrix);
  assert.equal(matrix.determinant(), 0);
  sim.time = 1;
  sim.poles[0] = { broken: false };
  updateBreakables(v, sim);
  item.batch.getMatrixAt(0, matrix);
  assert.deepEqual(matrix.elements, intact.elements);
});
test("cars physically drive each Kutaisi bridge segment in both directions", () => {
  for (const r of ROADS.filter((r) => /Bridge/i.test(r.name)))
    for (const reverse of [false, true]) {
      const s = new ChaseSimulation();
      s.start();
      s.police = [];
      s.traffic = [];
      s.trees = [];
      s.ramps = [];
      s.nextWaveAt = Infinity;
      const from = reverse ? r.end : r.start,
        to = reverse ? r.start : r.end;
      Object.assign(s.player, {
        x: from.x,
        z: from.z,
        angle: r.angle + (reverse ? Math.PI : 0),
      });
      for (let d = 0; d < r.length - 1; d += 0.18) {
        s.player.vx = ((to.x - from.x) / r.length) * 21.6;
        s.player.vz = ((to.z - from.z) / r.length) * 21.6;
        s.update(1 / 120, {});
        assert.equal(s.player.waterAt, undefined, r.name);
        assert.equal(s.player.health, 100, r.name);
      }
      assert(Math.hypot(s.player.x - to.x, s.player.z - to.z) < 3, r.name);
    }
});

test("Kutaisi is a distinct connected mapped city with its own landmarks and a continuous road surface", () => {
  assert(ROADS.length > 1000);
  assert(RIVER_POLYGON.length > 30);
  assert(KUTAISI_SITES.some((s) => s.name === "BAGRATI CATHEDRAL"));
  assert.equal(PEACE_DECK.name, "WHITE BRIDGE");
  for (const cp of checkpointsForLevel(1))
    assert(routeBetween(START, cp).length > 0);
  for (const b of BUILDINGS) assert(!overlapsRoad(b, 0), JSON.stringify(b));
});
test("every Kutaisi street lane and bridge deck remains dry and outside terrain obstacles", () => {
  for (const r of ROADS)
    for (let t = 0; t <= 1; t += 0.25)
      for (const side of [-1, 0, 1]) {
        const p = {
          x:
            r.start.x +
            (r.end.x - r.start.x) * t +
            Math.cos(r.angle) * side * (r.width / 2 - 1),
          z:
            r.start.z +
            (r.end.z - r.start.z) * t -
            Math.sin(r.angle) * side * (r.width / 2 - 1),
        };
        assert(!unsupportedWater(p), r.name + " water");
        assert(!terrainBlocked(p), r.name + " hill");
      }
  for (const b of [...BRIDGE_DECKS, PEACE_DECK])
    for (let along = -b.length / 2; along <= b.length / 2; along += 3)
      for (const side of [-1, 1]) {
        const p = {
          x:
            b.x +
            Math.sin(b.angle) * along +
            Math.cos(b.angle) * side * (b.width / 2 - 0.05),
          z:
            b.z +
            Math.cos(b.angle) * along -
            Math.sin(b.angle) * side * (b.width / 2 - 0.05),
        };
        assert(!unsupportedWater(p), b.name);
      }
});
test("Kutaisi checkpoint layouts stay reachable and gate footprints remain on the street", () => {
  for (let level = 1; level <= 150; level++)
    for (const cp of checkpointsForLevel(level)) {
      assert(routeBetween(START, cp).length > 0);
      for (const cross of [-7, 0, 7]) {
        const p = {
          x: cp.x + Math.cos(cp.angle) * cross,
          z: cp.z - Math.sin(cp.angle) * cross,
        };
        assert(onAsphalt(p), "Level " + level + " " + cp.name);
        assert(
          !BUILDINGS.some((b) => containsPoint(b, p.x, p.z, 0.2)),
          cp.name,
        );
      }
    }
});
function approach(r, speed = 55) {
  const s = new ChaseSimulation();
  s.start("suv");
  s.police = [];
  s.traffic = [];
  s.nextWaveAt = Infinity;
  Object.assign(s.player, {
    x: r.x - Math.sin(r.angle) * (r.length / 2 + 5),
    z: r.z - Math.cos(r.angle) * (r.length / 2 + 5),
    angle: r.angle,
    vx: Math.sin(r.angle) * speed,
    vz: Math.cos(r.angle) * speed,
    speed,
  });
  return s;
}
test("high-speed Kutaisi rooftop landing collects one Platinum challenge; a slow approach fails", () => {
  const s = approach(SPECIAL_RAMPS[0]);
  let air = false;
  for (let i = 0; i < 600 && !s.runQuests.length; i++) {
    s.update(1 / 120, { throttle: s.player.airborne ? 0 : 1 });
    air ||= s.player.airborne;
  }
  assert(air);
  assert.equal(s.player.y, ROOFTOP.h);
  assert.deepEqual(s.runQuests, ["kutaisi-skybox-v1"]);
  s.timeline.restore(s, 0);
  assert.deepEqual(s.runQuests, []);
  const slow = approach(SPECIAL_RAMPS[0], 14);
  for (let i = 0; i < 600; i++)
    slow.update(1 / 120, { throttle: slow.player.airborne ? 0 : 0.25 });
  assert.equal(slow.runQuests.length, 0);
});
test("Rioni gap launches over actual unsupported water and lands upright on the opposite bank", () => {
  const s = approach(SPECIAL_RAMPS[1]);
  let water = false;
  for (let i = 0; i < 650 && !s.runQuests.length; i++) {
    s.update(1 / 120, { throttle: s.player.airborne ? 0 : 1 });
    water ||= s.player.airborne && unsupportedWater(s.player);
  }
  assert(water);
  assert(s.player.x > 44);
  assert(!unsupportedWater(s.player));
  assert(!s.player.flipped);
  assert.deepEqual(s.runQuests, ["rioni-gap-v1"]);
});
