import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../dist/vendor/three.module.js";
import { CARS, carSpec } from "../dist/config.js";
import { makeOriginalSportsCar, MODEL_SHAPES } from "../dist/car-models.js";
import { installWheelKits, addExteriorKit } from "../dist/customization.js";
import { animateWheels } from "../dist/sports-car.js";
import {
  newProfile,
  migrateProfile,
  applyProgressAction,
  upgradedSpec,
  PARTS,
} from "../dist/progression.js";
import { cityLevel, cityCommunity } from "../dist/map-selection.js";
import { validateRun, levelRewards } from "../dist/community-rules.js";
import { ChaseSimulation } from "../dist/simulation.js";
import { breakReward } from "../dist/banner-rules.js";
import { engineTelemetry } from "../dist/audio-model.js";
import { addTurboExhaust } from "../dist/turbo-effects.js";

test("all bodies fit their simulation class, preserve wheel support, and replace aero at every grade", () => {
  for (const id of CARS.map((c) => c.id).filter((id) => id !== "classic")) {
    const car = makeOriginalSportsCar(id, "#778899");
    assert.equal(MODEL_SHAPES[id].length, carSpec(id).length);
    assert.equal(MODEL_SHAPES[id].width, carSpec(id).width);
    for (const tier of [1, 4, 5, 8, 2, 0]) {
      const eq = { spoiler: tier, rims: tier, tires: tier, brakes: tier };
      const old = car.userData.exteriorKit;
      let disposed = 0;
      old.traverse((m) =>
        m.geometry?.addEventListener("dispose", () => disposed++),
      );
      addExteriorKit(car, eq, id);
      installWheelKits(car, eq);
      assert.equal(old.parent, null);
      if (old.children.length) assert(disposed > 0);
      let wings = 0,
        blades = 0,
        kits = 0;
      car.traverse((m) => {
        if (m.name === "rear-wing") wings++;
        if (m.name === "aero-blade") blades++;
        if (m.name === "installed-wheel-kit") kits++;
        if (m.geometry)
          assert(
            [...m.geometry.attributes.position.array].every(Number.isFinite),
          );
      });
      assert.equal(wings, 1);
      assert.equal(kits, 1);
      assert.equal(blades, tier || MODEL_SHAPES[id].stockWing ? 1 : 0);
      car.updateMatrixWorld(true);
      for (const w of car.userData.wheels) {
        const p = w.getWorldPosition(new THREE.Vector3());
        assert(Math.abs(p.y - (id === "creator" ? 0.43 : 0.36)) < 1e-6);
        assert.equal(
          w.parent.getObjectByName("brake-caliper").parent,
          w.parent,
        );
      }
      const before = car.userData.wheels.map((w) =>
        w.getWorldPosition(new THREE.Vector3()),
      );
      animateWheels(car, 40, 0.1, 1);
      car.updateMatrixWorld(true);
      car.userData.wheels.forEach((w, i) =>
        assert(
          w.getWorldPosition(new THREE.Vector3()).distanceTo(before[i]) < 1e-6,
        ),
      );
    }
  }
});
test("classes have distinct canopies and Cyber is an electric pickup with bounded performance", () => {
  const coupe = makeOriginalSportsCar("gt", "#777777"),
    hatch = makeOriginalSportsCar("falcon", "#777777"),
    speedster = makeOriginalSportsCar("coast", "#777777"),
    ev = makeOriginalSportsCar("creator", "#777777");
  assert(
    hatch.getObjectByName("roof").geometry.attributes.position.getY(0) >
      coupe.getObjectByName("roof").geometry.attributes.position.getY(0) + 0.15,
  );
  assert(!speedster.getObjectByName("roof"));
  assert(ev.getObjectByName("cargo-bed-cover"));
  assert(ev.userData.electric);
  assert.deepEqual(ev.userData.exhaustPositions, []);
  addTurboExhaust(ev);
  assert.equal(ev.userData.turboExhaust.children.length, 0);
  assert.equal(carSpec("creator").topSpeed, carSpec("coast").topSpeed * 1.05);
  for (const car of CARS) {
    const eq = Object.fromEntries(
      PARTS.map((p) => [p.id, car.id === "creator" ? 8 : 5]),
    );
    eq.stars = Object.fromEntries(PARTS.map((p) => [p.id, 5]));
    const s = upgradedSpec(car, eq);
    assert(s.topSpeed + s.boostSpeed <= 190);
  }
  let state = {};
  for (let speed = 0; speed < 130; speed++) {
    state = engineTelemetry(
      { carId: "creator", speed, performance: carSpec("creator") },
      { throttle: 1 },
      state,
    );
    assert.equal(state.shift, 0);
    assert.equal(state.gearLabel, "D");
    assert.equal(state.gear, 1);
  }
});
const metrics = {
  time: 80,
  score: 18000,
  checkpoints: 6,
  takedowns: 2,
  trafficWrecks: 1,
  distance: 2500,
  driftSeconds: 8,
  jumps: 1,
  topSpeed: 250,
  decorWrecks: 2,
};
function finish(map, car, { old = false } = {}) {
  let p = newProfile();
  p.level = 15;
  p.maps.kutaisi.level = 15;
  p.maps.batumi.level = 15;
  p = migrateProfile(p);
  p.cars.creator = {
    spoiler: 4,
    rims: 5,
    paint: "#abcdef",
    stars: { spoiler: 2 },
  };
  p = applyProgressAction(
    p,
    { type: "begin-run", map, car, rewardVersion: 99 },
    undefined,
    { runId: "cyber-" + map + "-" + car, now: 1000 },
  );
  if (old) delete p.activeRun.rewardVersion;
  const action = {
    type: "settle",
    runId: p.activeRun.id,
    level: cityLevel(p, map),
    result: "won",
    metrics: {
      ...metrics,
      score: metrics.score * (car === "creator" && !old ? 2 : 1),
      rewardMultiplier: 50,
    },
  };
  const before = p.credits,
    after = applyProgressAction(p, action, () => 0.5, { now: 100000 });
  assert.deepEqual(
    applyProgressAction(after, action),
    after,
    "retries cannot double-bank",
  );
  assert.deepEqual(
    after.cars.creator,
    p.cars.creator,
    "installed legacy items survive",
  );
  return {
    amount: after.credits - before,
    community: cityCommunity(after, map),
    ticket: p.activeRun,
  };
}
test("server tickets bank exactly 2x coins/score in every city, preserving old tickets and save contents", () => {
  for (const map of ["tbilisi", "kutaisi", "batumi"]) {
    const a = finish(map, "coast"),
      b = finish(map, "creator"),
      old = finish(map, "creator", { old: true });
    assert.equal(b.amount, a.amount * 2);
    assert.equal(b.community.bestScore, a.community.bestScore * 2);
    assert.equal(b.community.lastReward.multiplier, 2);
    assert.equal(b.community.lastReward.boxes, a.community.lastReward.boxes);
    assert.equal(old.amount, a.amount);
    assert.equal(old.community.bestScore, a.community.bestScore);
    const excessive = { ...metrics, score: 280000 };
    assert.throws(() => validateRun(excessive, a.ticket, "won", 100000));
    assert.doesNotThrow(() => validateRun(excessive, b.ticket, "won", 100000));
  }
});
test("live takedown and roadside feedback reflect Cyber rewards once and common cars keep their rates", () => {
  const run = (id) => {
    const s = new ChaseSimulation();
    s.start(id, { level: 1 });
    const c = s.police[0];
    c.health = 1;
    c.hitCooldown = 0;
    s.damagePolice(c, 50);
    const event = s.scoreEvents.find((e) => e.kind === "patrol");
    assert.equal(event.points, s.score);
    assert.equal(event.credits, s.runCash);
    const old = s.runCash;
    s.damagePolice(c, 50);
    assert.equal(s.runCash, old);
    breakReward(s, { bannerId: s.cashBannerIds[0] });
    breakReward(s, { bannerId: s.cashBannerIds[0] });
    breakReward(s, {});
    return s;
  };
  const a = run("coast"),
    b = run("creator");
  assert.equal(b.score, a.score * 2);
  assert.equal(b.runCash, a.runCash * 2);
  assert.deepEqual(levelRewards(3), { score: 1.3, cash: 1.2 });
  assert.deepEqual(levelRewards(3, "creator"), { score: 2.6, cash: 2.4 });
});
