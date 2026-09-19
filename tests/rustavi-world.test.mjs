import test from "node:test";
import assert from "node:assert/strict";
globalThis.location = new URL("https://game.test/?map=rustavi");
const { ROADS, NODES, BUILDINGS, START, routeBetween } = await import(
  "../dist/city-map.js"
);
const { RUSTAVI_SITES, LANDMARKS, HALL_PLAZA } = await import(
  "../dist/rustavi-district-data.js"
);
const { TREES } = await import("../dist/world-props.js");
const { overOpenWater } = await import("../dist/surface-support.js");
const { overlapsRoad, footprintsOverlap } = await import(
  "../dist/map-clearance.js"
);
const { checkpointsForLevel } = await import("../dist/level-routes.js");
const { ChaseSimulation, vehicle, stepVehicle } = await import(
  "../dist/simulation.js"
);
const { SPONSOR_SITES } = await import("../dist/sponsor-sites.js");
const { SPECIAL_RAMPS, ROOFTOP } = await import("../dist/world-sites.js");
const { BRIDGE_DECKS } = await import("../dist/bridge-data.js");
const { unsupportedWater } = await import("../dist/water.js");
const { resolveRampSolid } = await import("../dist/stunts.js");
const { QUEST_PINS } = await import("../dist/quest-map.js");
const { HEROES, HEROES_PARKS, civicPoint } = await import(
  "../dist/rustavi-civic-data.js"
);
const { onAsphalt, roadClear } = await import("../dist/road-clearance.js");
const { buildingContact } = await import("../dist/building-contact.js");
const { tireSurfaceHeight } = await import("../dist/vehicle-ground.js");

test("City Hall has an open civic plaza and the new monument sits on its entrance axis", () => {
  assert(HALL_PLAZA.w * HALL_PLAZA.d > 10000);
  const expected = civicPoint(LANDMARKS.hall, 0, 42);
  assert(
    Math.hypot(
      expected.x - LANDMARKS.monument.x,
      expected.z - LANDMARKS.monument.z,
    ) < 0.01,
  );
  assert(!overlapsRoad(LANDMARKS.monument, 1));
  for (const b of BUILDINGS.filter((b) => !b.landmark))
    assert(
      !footprintsOverlap(HALL_PLAZA, b),
      "no generated buildings in the forecourt",
    );
  for (const tree of TREES)
    assert(
      !footprintsOverlap(HALL_PLAZA, { ...tree, w: 1, d: 1, angle: 0 }),
      "no trees in the open centre",
    );
  assert(routeBetween(START, LANDMARKS.hall).length > 1);
  assert.equal(
    tireSurfaceHeight(HALL_PLAZA),
    0.205,
    "tires rest on the new paving rather than below it",
  );
});

test("Heroes Square retains its real centre, open median, connected approaches and solid monument", () => {
  const monument = RUSTAVI_SITES.find((s) => s.style === "heroes");
  assert.equal(monument.x, HEROES.x);
  assert.equal(monument.z, HEROES.z);
  assert(!onAsphalt(HEROES), "memorial island must remain outside asphalt");
  for (const park of HEROES_PARKS) {
    for (const x of [-park.w * 0.25, 0, park.w * 0.25])
      assert(
        roadClear(civicPoint(park, x, 0), 1.2),
        "central promenade stays clear of traffic",
      );
  }
  const p = vehicle(HEROES.x + 4.5, HEROES.z);
  assert(
    buildingContact(p, monument),
    "memorial base must collide rather than be drive-through art",
  );
  for (const b of RUSTAVI_SITES.filter((s) => s.style === "heroes-apartment")) {
    assert(!overlapsRoad(b, 0.1));
    assert(routeBetween(START, b).length > 1);
  }
});
test("Rustavi connected streets include the real motorpark and collision-safe landmarks", () => {
  assert(ROADS.length > 300);
  assert(ROADS.some((r) => r.name.includes("MOTORPARK")));
  assert.equal(SPONSOR_SITES.length, 48);
  assert.deepEqual(
    QUEST_PINS.map((q) => q.quest),
    ["rustavi-skybox-v1"],
    "academy practice ramp must not pretend to be a reward quest",
  );
  const seen = new Set([0]),
    todo = [0];
  while (todo.length)
    for (const edge of NODES[todo.pop()].links)
      if (!seen.has(edge.node)) {
        seen.add(edge.node);
        todo.push(edge.node);
      }
  assert.equal(seen.size, NODES.length);
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
    assert(!overlapsRoad(b, 0.1), b.name || b.id || "Building overlaps road");
  for (let i = 0; i < RUSTAVI_SITES.length; i++)
    for (let j = i + 1; j < RUSTAVI_SITES.length; j++)
      assert(
        !footprintsOverlap(RUSTAVI_SITES[i], RUSTAVI_SITES[j], 1),
        RUSTAVI_SITES[i].name + " overlaps " + RUSTAVI_SITES[j].name,
      );
  for (let level = 1; level <= 20; level++)
    for (const p of checkpointsForLevel(level)) {
      assert(!overOpenWater(p));
      assert(routeBetween(START, p).length);
    }
});
test("Rustavi rooftop launch works at speed, needs a committed approach and rewinds its reward", () => {
  const approach = (speed) => {
    const s = new ChaseSimulation();
    s.start("suv");
    s.police = [];
    s.traffic = [];
    s.nextWaveAt = Infinity;
    const r = SPECIAL_RAMPS[0];
    Object.assign(s.player, {
      x: r.x,
      z: r.z - r.length / 2 - 5,
      angle: 0,
      vx: 0,
      vz: speed,
      speed,
    });
    return s;
  };
  const s = approach(55);
  let air = false;
  for (let i = 0; i < 600 && !s.runQuests.length; i++) {
    s.update(1 / 120, { throttle: s.player.airborne ? 0 : 1 });
    air ||= s.player.airborne;
  }
  assert(air);
  assert.equal(s.player.y, ROOFTOP.h);
  assert.deepEqual(s.runQuests, ["rustavi-skybox-v1"]);
  s.timeline.restore(s, 0);
  assert.deepEqual(s.runQuests, []);
  const slow = approach(14);
  for (let i = 0; i < 600; i++)
    slow.update(1 / 120, { throttle: slow.player.airborne ? 0 : 0.25 });
  assert.equal(slow.runQuests.length, 0);
  for (const r of SPECIAL_RAMPS) {
    const p = vehicle(r.x, r.z + r.length / 2 + 0.2);
    p.vz = -20;
    assert(resolveRampSolid(p, r, { x: r.x, z: r.z + r.length / 2 + 2 }));
    assert(p.vz >= 0, "high end blocks driving through the ramp");
  }
});
test("Rustavi bridges support both lane edges and physically driven centre lines", () => {
  for (const b of BRIDGE_DECKS) {
    for (let a = -b.length / 2; a <= b.length / 2; a += 2)
      for (const side of [-1, 1])
        assert(
          !unsupportedWater({
            x:
              b.x +
              Math.sin(b.angle) * a +
              Math.cos(b.angle) * side * (b.width / 2 - 0.1),
            z:
              b.z +
              Math.cos(b.angle) * a -
              Math.sin(b.angle) * side * (b.width / 2 - 0.1),
          }),
          b.name,
        );
    for (const direction of [-1, 1]) {
      const s = new ChaseSimulation();
      s.start();
      s.police = [];
      s.traffic = [];
      s.trees = [];
      s.ramps = [];
      s.nextWaveAt = Infinity;
      Object.assign(s.player, {
        x: b.x - ((Math.sin(b.angle) * b.length) / 2) * direction,
        z: b.z - ((Math.cos(b.angle) * b.length) / 2) * direction,
        angle: b.angle + (direction === -1 ? Math.PI : 0),
      });
      for (let d = 0; d < b.length; d += 0.18) {
        s.player.vx = Math.sin(s.player.angle) * 21.6;
        s.player.vz = Math.cos(s.player.angle) * 21.6;
        s.update(1 / 120, {});
        assert.equal(s.player.waterAt, undefined);
        assert.equal(s.player.health, 100, b.name);
      }
    }
  }
});
test("Rustavi retains responsive driving, drift and level-scaled pursuit", () => {
  const sim = new ChaseSimulation();
  sim.start("gt");
  assert(sim.police.length >= 6);
  for (let i = 0; i < 120; i++) sim.update(1 / 120, { throttle: 1, steer: 0 });
  assert.equal(sim.player.health, 100, "spawn lane remains clear");
  const c = vehicle(START.x, START.z);
  c.angle = 0;
  c.vz = 35;
  for (let i = 0; i < 90; i++)
    stepVehicle(c, { steer: 1, brake: true, throttle: 1 }, 1 / 120, []);
  assert(c.angle < 0);
  assert(c.isDrifting);
  sim.start("gt", { level: 3 });
  assert(sim.police.some((p) => p.kind === "tank") || sim.difficulty);
});
