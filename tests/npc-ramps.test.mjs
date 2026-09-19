import test from "node:test";
import assert from "node:assert/strict";
import { ChaseSimulation } from "../dist/simulation.js";
import { resolveRampSolid } from "../dist/stunts.js";

for (const kind of ["traffic", "police"])
  test(`${kind} crosses a ramp's high face without impact, braking or launch`, () => {
    const setup = () => {
      const sim = new ChaseSimulation();
      sim.start();
      const actor = sim[kind][0];
      sim.traffic = kind === "traffic" ? [actor] : [];
      sim.police = kind === "police" ? [actor] : [];
      sim.obstacles = [];
      sim.trees = [];
      sim.poles = [];
      sim.ramps = [];
      sim.nextWaveAt = Infinity;
      actor.vx = Math.sin(actor.angle) * 15;
      actor.vz = Math.cos(actor.angle) * 15;
      return { sim, actor };
    };
    const baseline = setup(),
      trial = setup();
    const before = { x: baseline.actor.x, z: baseline.actor.z };
    baseline.sim.update(1 / 60, {});
    const dx = baseline.actor.x - before.x,
      dz = baseline.actor.z - before.z;
    assert(Math.hypot(dx, dz) > 0.01);
    const angle = Math.atan2(dx, dz) + Math.PI;
    const ramp = {
      id: 999,
      width: 12,
      length: 10,
      height: 3,
      angle,
      x: before.x + dx / 2 - Math.sin(angle) * 5,
      z: before.z + dz / 2 - Math.cos(angle) * 5,
    };
    // Demonstrate that this exact crossing still collides for a player vehicle.
    assert(resolveRampSolid({ ...baseline.actor }, ramp, before, false));
    trial.sim.ramps = [ramp];
    trial.sim.update(1 / 60, {});
    for (const field of [
      "x",
      "z",
      "vx",
      "vz",
      "health",
      "y",
      "airborne",
      "impact",
    ])
      assert.equal(trial.actor[field], baseline.actor[field], field);
  });
