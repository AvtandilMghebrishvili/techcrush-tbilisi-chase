import test from "node:test";
import assert from "node:assert/strict";
import {
  ChaseSimulation,
  vehicle,
  resolveCircleRect,
} from "../dist/simulation.js";
import {
  SPECIAL_RAMPS,
  ROOFTOP,
  BANK_SOLIDS,
  STUNT_APRONS,
} from "../dist/world-sites.js";
import { rampLocal } from "../dist/stunts.js";
import {
  BUILDINGS,
  ROADS,
  containsPoint,
  routeBetween,
} from "../dist/city-map.js";
import { overlapsRoad, footprintsOverlap } from "../dist/map-clearance.js";
import { unsupportedWater } from "../dist/water.js";
import {
  newProfile,
  migrateProfile,
  applyProgressAction,
  pursuitTuning,
} from "../dist/progression.js";
import { navigationTarget, playerRoute } from "../dist/navigation-cache.js";
import { clearCameraPosition } from "../dist/camera-clearance.js";

test("roof camera boom stays outside the roof without collapsing into the driver", () => {
  const anchor = { x: ROOFTOP.x, y: ROOFTOP.h + 1.7, z: ROOFTOP.z };
  const desired = { x: ROOFTOP.x, y: ROOFTOP.h + 4.4, z: ROOFTOP.z - 9 };
  assert.deepEqual(clearCameraPosition(anchor, desired, BUILDINGS), desired);
  const arm = BANK_SOLIDS.find((b) => b.base);
  const below = { x: arm.x, y: 5, z: arm.z };
  assert.deepEqual(
    clearCameraPosition({ ...below, z: below.z - 7 }, below, [arm]),
    below,
  );
});

function chase(r, speed = 55) {
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
test("real rooftop run lands above the collider and collects one crate; low speed hits its wall", () => {
  const r = SPECIAL_RAMPS[0],
    s = chase(r),
    p = s.player;
  let air = false;
  for (let i = 0; i < 480; i++) {
    s.update(1 / 120, { throttle: p.airborne ? 0 : 1 });
    air ||= p.airborne;
    if (s.runQuests.length) break;
  }
  assert(air);
  assert.equal(p.y, ROOFTOP.h);
  assert(!p.airborne && !p.flipped);
  assert.equal(p.health, 100);
  assert.deepEqual(s.runQuests, [ROOFTOP.id]);
  for (let i = 0; i < 90; i++) s.update(1 / 120, { brake: true });
  assert.equal(s.runQuests.length, 1);
  s.timeline.restore(s, 0);
  assert.deepEqual(s.runQuests, []);
  const slow = chase(r, 14);
  for (let i = 0; i < 480; i++)
    slow.update(1 / 120, { throttle: slow.player.airborne ? 0 : 0.25 });
  assert(!slow.runQuests.length);
  assert(slow.player.y < ROOFTOP.h);
  assert(!containsPoint(ROOFTOP, slow.player.x, slow.player.z));
});
test("river ramp crosses open water, lands on the opposite bank and awards only an upright jump", () => {
  const s = chase(SPECIAL_RAMPS[1]),
    p = s.player;
  let flewOverWater = false;
  for (let i = 0; i < 600; i++) {
    s.update(1 / 120, { throttle: p.airborne ? 0 : 1 });
    flewOverWater ||= p.airborne && unsupportedWater(p);
    if (s.runQuests.length) break;
  }
  assert(flewOverWater);
  assert(p.x < -850);
  assert(!unsupportedWater(p));
  assert.equal(p.waterAt, undefined);
  assert(!p.flipped);
  assert.deepEqual(s.runQuests, ["mtkvari-gap-v1"]);
});
test("high ramp end and side faces stop high-speed cars immediately, rather than lifting through metal", () => {
  for (const r of SPECIAL_RAMPS)
    for (const side of [false, true]) {
      const s = chase(r),
        p = s.player;
      const along = side ? r.length * 0.25 : r.length / 2 + 1.3,
        lateral = side ? r.width / 2 + 1.3 : 0;
      Object.assign(p, {
        x: r.x + Math.cos(r.angle) * lateral + Math.sin(r.angle) * along,
        z: r.z - Math.sin(r.angle) * lateral + Math.cos(r.angle) * along,
        angle: r.angle + (side ? -Math.PI / 2 : Math.PI),
        vx: side ? -Math.cos(r.angle) * 75 : -Math.sin(r.angle) * 75,
        vz: side ? Math.sin(r.angle) * 75 : -Math.cos(r.angle) * 75,
        speed: 75,
      });
      s.update(0.05, {});
      const q = rampLocal(p, r);
      assert(!p.airborne);
      assert.equal(p.y, 0);
      assert.equal(p.onRamp, null);
      assert(p.health < 100);
      assert(side ? Math.abs(q.side) >= r.width / 2 : q.along >= r.length / 2);
      assert(s.soundEvents.some((e) => e.kind === "metal"));
    }
});
test("new streets and landmark solids leave roads clear; stunt aprons exclude ordinary building lots", () => {
  assert(ROADS.length >= 762);
  for (const name of [
    "First Republic Square",
    "Leo Kiacheli Street",
    "Mikheil Zandukeli Street",
    "Giorgi Akhvlediani Street",
  ]) {
    const r = ROADS.find((r) => r.name === name);
    assert(r, name);
    assert(routeBetween(ROADS[0].start, r.end).length);
  }
  for (const b of BUILDINGS) assert(!overlapsRoad(b, 2), "Building on a road");
  for (const a of STUNT_APRONS)
    for (const b of BUILDINGS.filter((b) => !b.landmark))
      assert(!footprintsOverlap(a, b, 1));
  const arm = BANK_SOLIDS.find((b) => b.base),
    c = vehicle(arm.x, arm.z);
  assert.equal(
    resolveCircleRect(c, 2, arm),
    false,
    "Cantilever ground clearance",
  );
  c.y = arm.base + 1;
  assert(resolveCircleRect(c, 2, arm));
});
test("old garages preserve keys, every installed part, inventory, paint, achievements and future fields across repeated migrations", () => {
  const p = newProfile();
  p.schema = 2;
  delete p.quests;
  p.credits = 98231;
  p.level = 137;
  p.boxes = 17;
  p.cars.classic = { engine: 4, rims: 3, paint: "#aabbcc" };
  p.inventory = { "turbo:4": 7 };
  p.future = { map: "untouched" };
  p.community.badges = ["first-escape"];
  const before = structuredClone(p),
    next = migrateProfile(p);
  assert.equal(next.schema, 6);
  assert.deepEqual(next.quests, { completed: [] });
  for (const key of [
    "credits",
    "level",
    "boxes",
    "cars",
    "inventory",
    "community",
    "future",
  ])
    assert.deepEqual(next[key], before[key]);
  assert.deepEqual(p, before);
  assert.deepEqual(migrateProfile(next), next);
});
test("stunt rewards bank once even across another run; old clients may omit new metrics", () => {
  let p = newProfile();
  const ticket = { now: 1000, runId: "quest-run-0001" };
  p = applyProgressAction(
    p,
    { type: "begin-run", car: "classic" },
    Math.random,
    ticket,
  );
  const metrics = {
    time: 10,
    score: 1200,
    checkpoints: 0,
    takedowns: 0,
    trafficWrecks: 0,
    distance: 500,
    driftSeconds: 0,
    jumps: 1,
    topSpeed: 230,
    quests: [ROOFTOP.id],
  };
  const action = {
    type: "settle",
    runId: ticket.runId,
    level: 1,
    result: "abandoned",
    metrics,
  };
  p = applyProgressAction(p, action, Math.random, { now: 12000 });
  assert.equal(p.boxes, 2);
  assert.equal(p.credits, 3500);
  assert.deepEqual(p.quests.completed, [ROOFTOP.id]);
  assert.deepEqual(
    applyProgressAction(p, action, Math.random, { now: 12000 }),
    p,
  );
  p = applyProgressAction(
    p,
    { type: "begin-run", car: "classic" },
    Math.random,
    { now: 13000, runId: "quest-run-0002" },
  );
  p = applyProgressAction(
    p,
    { ...action, runId: "quest-run-0002" },
    Math.random,
    { now: 24000 },
  );
  assert.equal(p.boxes, 2);
  assert.equal(p.credits, 3500);
  let older = applyProgressAction(
    newProfile(),
    { type: "begin-run", car: "classic" },
    Math.random,
    ticket,
  );
  const oldMetrics = { ...metrics };
  delete oldMetrics.quests;
  assert.doesNotThrow(() =>
    applyProgressAction(
      older,
      { ...action, metrics: oldMetrics },
      Math.random,
      { now: 12000 },
    ),
  );
  for (const quests of [["unknown"], [ROOFTOP.id, ROOFTOP.id], ["__proto__"]])
    assert.throws(() =>
      applyProgressAction(
        older,
        { ...action, metrics: { ...metrics, quests } },
        Math.random,
        { now: 12000 },
      ),
    );
});
test("endless levels preserve growth, bounded active units and distinct late pursuit styles", () => {
  let previous = pursuitTuning(1);
  for (const level of [2, 4, 7, 20, 100, 1000]) {
    const t = pursuitTuning(level);
    assert(t.maxSpeed >= previous.maxSpeed && t.maxSpeed <= 145);
    assert(t.repath < previous.repath);
    assert(t.waveInterval < previous.waveInterval);
    assert(t.maxUnits <= 22);
    previous = t;
  }
  const s = new ChaseSimulation();
  s.start("classic", { level: 10 });
  for (let i = 0; i < 10; i++) s.police.push(s.makePolice(0, 0));
  for (const kind of ["sedan", "suv", "tank", "interceptor", "supercar"])
    assert(
      s.police.some((c) => c.kind === kind),
      kind,
    );
});
test("stunt guidance can change at rest, reaches a clear approach and switches to the roof crate", () => {
  const s = new ChaseSimulation();
  s.start();
  const cp = navigationTarget(s);
  s.navQuest = "skybox";
  assert.notDeepEqual(navigationTarget(s), cp);
  assert(playerRoute(s).length > 1);
  Object.assign(s.player, { x: ROOFTOP.x, z: ROOFTOP.z, y: ROOFTOP.h });
  assert.equal(playerRoute(s).length, 1);
  s.navQuest = "river";
  assert(navigationTarget(s).x < -600);
  assert(playerRoute(s).length > 1);
});
