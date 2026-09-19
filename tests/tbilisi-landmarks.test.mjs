import test from "node:test";
import assert from "node:assert/strict";
import { ROAD_DATA as original } from "../dist/tbilisi-road-data.js";
import {
  extendTbilisiNetwork,
  FLYOVER_PATH,
  HEROES,
  AXIS,
  KING_DAVID,
} from "../dist/tbilisi-civic-layout.js";
import { CIVIC_SOLIDS, FLYOVER_RAILS } from "../dist/tbilisi-civic-data.js";
import { ROADS, NODES, routeBetween } from "../dist/city-map.js";
import { LANDMARKS } from "../dist/district-data.js";
import { groundHeight } from "../dist/terrain.js";
import { fortressFoundations } from "../dist/fortress-foundations.js";
import {
  elevatedSurface,
  followElevatedRoad,
  elevatedLanding,
} from "../dist/elevated-roads.js";
import {
  vehicle,
  ChaseSimulation,
  angleDelta,
  clamp,
} from "../dist/simulation.js";
import { buildingContact } from "../dist/building-contact.js";
import { driveableLine } from "../dist/water.js";

test("Tbilisi extension preserves old IDs and all added streets connect to the old map", () => {
  const extended = extendTbilisiNetwork(original);
  assert.deepEqual(
    extended.nodes.slice(0, original.nodes.length),
    original.nodes,
  );
  assert.deepEqual(
    extended.edges.slice(0, original.edges.length),
    original.edges,
  );
  const visited = new Set([217]),
    queue = [217];
  while (queue.length)
    for (const e of NODES[queue.shift()].links)
      if (!visited.has(e.node)) {
        visited.add(e.node);
        queue.push(e.node);
      }
  for (let i = original.nodes.length; i < NODES.length; i++)
    assert.ok(visited.has(i), `unreachable node ${i}`);
  for (const site of [AXIS, KING_DAVID, HEROES])
    assert.ok(routeBetween(NODES[217], site).length > 2);
});
test("every Narikala wall and turret is embedded across its complete foundation", () => {
  const foundations = fortressFoundations(LANDMARKS.narikala, groundHeight);
  for (const part of [...foundations.walls, ...foundations.towers]) {
    for (const p of part.samples)
      assert.ok(part.base <= groundHeight(p.x, p.z) - 2);
    assert.ok(
      part.top >
        Math.max(...part.samples.map((p) => groundHeight(p.x, p.z))) + 10,
    );
  }
});
test("both flyover entrances drive continuously onto and off the raised deck", () => {
  for (const path of [FLYOVER_PATH, [...FLYOVER_PATH].reverse()]) {
    const car = vehicle(path[0][0], path[0][1]);
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1],
        b = path[i],
        steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 3);
      for (let j = 1; j <= steps; j++) {
        car.x = a[0] + ((b[0] - a[0]) * j) / steps;
        car.z = a[1] + ((b[1] - a[1]) * j) / steps;
        followElevatedRoad(car, car.y);
        assert.ok(
          Math.abs(car.y - (a[2] + ((b[2] - a[2]) * j) / steps)) < 0.15,
          `height at ${i}/${j}: ${car.y}`,
        );
        assert.equal(car.airborne, false);
      }
    }
    assert.ok(car.y < 0.01);
  }
});
test("ground cars stay below flyovers, upper rails block only deck traffic", () => {
  const p = FLYOVER_PATH[12];
  const low = vehicle(p[0], p[1]);
  followElevatedRoad(low, 0);
  assert.equal(low.y, 0);
  assert.equal(elevatedSurface(low, 0), null);
  const rail = FLYOVER_RAILS.find((r) => r.base === 7.4);
  const under = vehicle(rail.x, rail.z);
  under.y = 0;
  assert.equal(buildingContact(under, rail), false);
  const upper = vehicle(rail.x, rail.z);
  upper.y = 7.4;
  assert.equal(buildingContact(upper, rail), true);
  assert.equal(driveableLine({ x: p[0], z: p[1], y: 7.4 }, HEROES), false);
});
test("airborne cars land on the deck and displaced NPCs fall to ground without getting stuck", () => {
  const p = FLYOVER_PATH[25];
  assert.equal(elevatedLanding({ x: p[0], z: p[1], y: 7.2, vy: -5 }, 7.6), 7.4);
  assert.equal(elevatedLanding({ x: p[0], z: p[1], y: 2, vy: -5 }, 2.3), null);
  const car = vehicle(HEROES.x + 40, HEROES.z);
  car.y = 7.4;
  for (let i = 0; i < 300; i++) followElevatedRoad(car, car.y, 1 / 120);
  assert.equal(car.y, 0);
  assert.equal(car.airborne, false);
});
test("new landmarks leave the drivable street centerlines clear at their own elevation", () => {
  for (const r of ROADS.filter((r) => r.id >= original.edges.length)) {
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const car = vehicle(
        r.start.x + (r.end.x - r.start.x) * t,
        r.start.z + (r.end.z - r.start.z) * t,
        r.angle,
      );
      car.y = r.start.y + (r.end.y - r.start.y) * t;
      for (const solid of CIVIC_SOLIDS)
        assert.equal(
          buildingContact({ ...car }, solid),
          false,
          `${r.name} hits landmark ${solid.style || solid.x}`,
        );
    }
  }
});

test("normal throttle and steering complete the flyover in both directions without impacts", () => {
  for (const path of [FLYOVER_PATH, [...FLYOVER_PATH].reverse()]) {
    const sim = new ChaseSimulation();
    sim.start();
    sim.police = [];
    sim.traffic = [];
    sim.nextWaveAt = Infinity;
    const p = sim.player;
    Object.assign(p, {
      x: path[0][0],
      z: path[0][1],
      y: 0,
      angle: Math.atan2(path[1][0] - path[0][0], path[1][1] - path[0][1]),
    });
    let target = 1,
      maxY = 0,
      hits = 0;
    for (let f = 0; f < 120 * 180 && target < path.length; f++) {
      const q = path[target];
      if (Math.hypot(p.x - q[0], p.z - q[1]) < 3.5) {
        target++;
        continue;
      }
      const delta = angleDelta(Math.atan2(q[0] - p.x, q[1] - p.z), p.angle);
      sim.update(1 / 120, {
        throttle: p.speed > 13 ? -1 : 1,
        steer: clamp(-delta * 2, -1, 1),
      });
      maxY = Math.max(maxY, p.y);
      if (p.impact > 3) hits++;
    }
    assert.equal(target, path.length);
    assert.equal(maxY, 7.4);
    assert.equal(hits, 0);
    assert.ok(p.y < 0.03);
    assert.equal(p.health, 100);
  }
});
