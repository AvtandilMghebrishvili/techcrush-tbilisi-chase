import test from "node:test";
import assert from "node:assert/strict";
import {
  newProfile,
  migrateProfile,
  applyProgressAction as act,
  PARTS,
  FUSION_COSTS,
  FUSION_BONUSES,
  partPower,
  upgradedSpec,
  pursuitTuning,
} from "../dist/progression.js";
import { carSpec } from "../dist/config.js";
import { MAP_COURSES } from "../dist/map-selection.js";
import { comparisonRows } from "../dist/garage-presentation.js";

test("fusion consumes 5/10/15/20/25 duplicates, gives noncompounding bonuses and caps each slot at five stars", () => {
  for (const tier of [1, 2, 3, 4, 5])
    for (const part of PARTS) {
      let p = newProfile();
      p.cars.gt[part.id] = tier;
      p.inventory[`${part.id}:${tier}`] = 75;
      const base = partPower(p.cars.gt, part.id);
      for (let star = 1; star <= 5; star++) {
        const count = p.inventory[`${part.id}:${tier}`];
        p = act(p, { type: "fuse", car: "gt", part: part.id });
        assert.equal(
          p.inventory[`${part.id}:${tier}`],
          count - FUSION_COSTS[star - 1],
        );
        assert.equal(p.cars.gt.stars[part.id], star);
        assert.equal(
          partPower(p.cars.gt, part.id),
          base * (1 + FUSION_BONUSES[star]),
        );
      }
      assert.equal(p.inventory[`${part.id}:${tier}`], 0);
      assert.throws(
        () => act(p, { type: "fuse", car: "gt", part: part.id }),
        /five fusion stars/,
      );
      assert.equal(p.cars.classic.stars, undefined);
    }
});
test("fusion rejects insufficient or different-rarity spares without modifying the profile", () => {
  const p = newProfile();
  p.cars.gt.engine = 2;
  p.inventory = { "engine:2": 4, "engine:1": 50, "tires:2": 50 };
  const before = structuredClone(p);
  assert.throws(
    () => act(p, { type: "fuse", car: "gt", part: "engine" }),
    /Collect 5/,
  );
  assert.throws(
    () => act(p, { type: "fuse", car: "gt", part: "ecu" }),
    /Install/,
  );
  assert.deepEqual(p, before);
});
test("old saves keep their cars, cash and inventory; car-slot fusion survives rarity replacement and purchase", () => {
  let p = newProfile();
  p.schema = 2;
  delete p.maps;
  delete p.platinumBoxes;
  p.cars.gt = { engine: 1, paint: "#121212" };
  p.inventory = { "engine:1": 5, "engine:2": 1 };
  p.credits = 4000;
  const old = structuredClone(p);
  p = migrateProfile(p);
  assert.deepEqual(p.inventory, old.inventory);
  assert.deepEqual(p.cars, old.cars);
  assert.equal(p.credits, 4000);
  p = act(p, { type: "fuse", car: "gt", part: "engine" });
  p = act(p, { type: "equip", car: "gt", part: "engine", tier: 2 });
  assert.equal(p.cars.gt.stars.engine, 1);
  assert.equal(p.inventory["engine:1"], 1);
  p = act(p, { type: "upgrade", car: "gt", part: "engine" });
  assert.equal(p.cars.gt.engine, 3);
  assert.equal(p.cars.gt.stars.engine, 1);
  assert.equal(p.cars.gt.paint, "#121212");
  assert.equal(p.inventory["engine:2"], 1);
});
test("maximum Platinum fusion stays finite, provides useful benefits and preserves nonzero landing damage", () => {
  const equipment = Object.fromEntries(PARTS.map((p) => [p.id, 5]));
  equipment.stars = Object.fromEntries(PARTS.map((p) => [p.id, 5]));
  for (const car of ["classic", "gt", "rally", "suv"]) {
    const s = upgradedSpec(carSpec(car), equipment);
    for (const value of Object.values(s))
      if (typeof value === "number") assert(Number.isFinite(value));
    for (const key of [
      "nitroDrain",
      "boostDelay",
      "damageScale",
      "landingScale",
    ])
      assert(s[key] > 0, key);
    assert(s.topSpeed + s.boostSpeed < 190);
  }
  const rows = comparisonRows(carSpec("gt"), { engine: 4 }, PARTS[0], 4, 1);
  assert(rows.every((r) => r.after > r.before));
});
test("level-clear box is atomic with settlement on both maps; repeated settlement cannot roll twice", () => {
  for (const map of ["tbilisi", "kutaisi"]) {
    let p = newProfile();
    p.level = 4;
    const id = "auto-box-" + map;
    p = act(
      p,
      { type: "begin-run", car: "gt", map, course: MAP_COURSES[map] },
      undefined,
      { runId: id, now: 1000 },
    );
    const action = {
      type: "settle",
      runId: id,
      level: p.activeRun.level,
      result: "won",
      autoOpenBox: true,
      metrics: {
        time: 80,
        score: 18000,
        checkpoints: 6,
        takedowns: 1,
        trafficWrecks: 0,
        distance: 2500,
        driftSeconds: 10,
        jumps: 0,
        topSpeed: 250,
        quests: [],
        timing: { course: MAP_COURSES[map], elapsedMs: 85000, rewinds: 0 },
      },
    };
    p = act(p, action, () => 0, { now: 100000 });
    assert.equal(p.boxes, 1);
    assert.equal(p.lastBox.id, id);
    assert.equal(p.lastBox.kind, "level");
    assert.equal(p.inventory["engine:1"], 3);
    assert.deepEqual(
      act(
        p,
        action,
        () => {
          throw Error("must not roll");
        },
        { now: 100000 },
      ),
      p,
    );
    p = act(p, {
      type: "claim-loot",
      boxId: id,
      index: 0,
      choice: "equip",
      car: "gt",
    });
    assert.equal(p.cars.gt.engine, 1);
    assert.equal(p.lastBox.items[0].claimed, "equip");
    assert.throws(
      () =>
        act(p, {
          type: "claim-loot",
          boxId: id,
          index: 0,
          choice: "sell",
          car: "gt",
        }),
      /already/,
    );
    assert.throws(
      () =>
        act(p, {
          type: "claim-loot",
          boxId: id,
          index: 1,
          choice: "equip",
          car: "gt",
        }),
      /equal or better/,
    );
    const cash = p.credits;
    p = act(p, {
      type: "claim-loot",
      boxId: id,
      index: 1,
      choice: "sell",
      car: "gt",
    });
    assert.equal(p.credits, cash + 75);
    assert.equal(p.inventory["engine:1"], 1);
    assert(!p.lastBox.items[2].claimed);
  }
});
test("patrol speed matches the selected build then gains 20% of base per level within a finite physical budget", () => {
  for (const map of ["tbilisi", "kutaisi"]) {
    for (const base of [58, 80])
      for (const level of [1, 2, 3])
        assert.equal(
          pursuitTuning(level, base, map).maxSpeed,
          base * (1 + 0.2 * (level - 1)),
        );
    for (const level of [1, 10, 100, 1000000]) {
      const d = pursuitTuning(level, 130, map);
      assert(d.maxSpeed <= 145);
      assert(d.maxUnits <= 22);
      assert(d.initialUnits <= d.maxUnits);
      assert(d.waveInterval >= 8);
    }
  }
  assert(
    pursuitTuning(1, 58, "kutaisi").initialUnits >
      pursuitTuning(1, 58).initialUnits,
  );
});
