import test from "node:test";
import assert from "node:assert/strict";
globalThis.location = new URL("https://game.test/?map=batumi");
const { ROADS, NODES, BUILDINGS, START, routeBetween } = await import(
  "../dist/city-map.js"
);
const { BATUMI_SITES } = await import("../dist/batumi-district-data.js");
const { overOpenWater } = await import("../dist/surface-support.js");
const { overlapsRoad } = await import("../dist/map-clearance.js");
const { checkpointsForLevel } = await import("../dist/level-routes.js");
const { supportedVisualY, tireSurfaceHeight } = await import(
  "../dist/vehicle-ground.js"
);
const { ChaseSimulation, vehicle, stepVehicle } = await import(
  "../dist/simulation.js"
);
test("Batumi roads form one connected real-street graph; landmarks, towers and solid buildings clear the carriageway", () => {
  assert(ROADS.length > 500);
  assert(ROADS.some((r) => r.name.includes("Rustaveli")));
  assert(BATUMI_SITES.some((s) => s.style === "alphabet"));
  assert(BATUMI_SITES.some((s) => s.style === "ali"));
  const visited = new Set([0]),
    todo = [0];
  while (todo.length)
    for (const edge of NODES[todo.pop()].links)
      if (!visited.has(edge.node)) {
        visited.add(edge.node);
        todo.push(edge.node);
      }
  assert.equal(visited.size, NODES.length);
  for (const r of ROADS)
    for (const t of [0.05, 0.5, 0.95])
      assert(
        !overOpenWater({
          x: r.start.x + (r.end.x - r.start.x) * t,
          z: r.start.z + (r.end.z - r.start.z) * t,
        }),
        r.name + " unsupported",
      );
  for (const b of BUILDINGS)
    assert(!overlapsRoad(b, 0.1), b.name + " intersects a road");
  for (let level = 1; level < 20; level++)
    for (const p of checkpointsForLevel(level)) {
      assert(!overOpenWater(p));
      assert(routeBetween(START, p).length > 0);
    }
});
test("Batumi shares driving, drift, pursuit and wheel support with the other cities", () => {
  const sim = new ChaseSimulation();
  sim.start("gt");
  assert(sim.police.length >= 6);
  const startHealth = sim.player.health;
  for (let i = 0; i < 120; i++) sim.update(1 / 120, { throttle: 1, steer: 0 });
  assert.equal(
    sim.player.health,
    startHealth,
    "Batumi start faces along clear roadway",
  );
  const c = vehicle(START.x, START.z);
  c.angle = 0;
  c.vz = 35;
  for (let i = 0; i < 90; i++)
    stepVehicle(c, { steer: 1, brake: true, throttle: 1 }, 1 / 120, []);
  assert(c.angle < 0);
  assert(c.isDrifting);
  const ground = { ...START, y: 0, width: 2, length: 4.7, roll: 0.1 };
  assert(supportedVisualY(ground) > 0.08);
  assert(supportedVisualY(ground) >= tireSurfaceHeight(ground));
  assert.equal(supportedVisualY({ ...ground, airborne: true, y: 7 }), 7);
});
