import assert from "node:assert/strict";
import { vehicle, stepVehicle } from "../dist/simulation.js";
import { carSpec } from "../dist/config.js";
import { upgradedSpec, PARTS } from "../dist/progression.js";
export function checkDrift() {
  for (const id of ["classic", "gt", "rally", "suv"])
    for (const tier of [0, 4, 5])
      for (const direction of [-1, 1]) {
        const equipment = Object.fromEntries(PARTS.map((p) => [p.id, tier]));
        if (tier === 5)
          equipment.stars = Object.fromEntries(PARTS.map((p) => [p.id, 5]));
        const c = vehicle(0, 0);
        c.carId = id;
        c.equipment = equipment;
        c.performance = upgradedSpec(carSpec(id), equipment);
        c.vz = 35;
        const drive = (input, seconds) => {
          for (let i = 0; i < seconds * 120; i++)
            stepVehicle(c, input, 1 / 120, []);
        };
        drive(
          {
            throttle: 1,
            steer: direction * 0.7,
            brake: true,
            boost: true,
            boostLatched: true,
          },
          0.7,
        );
        assert(c.isDrifting, `${id} tier${tier} should enter drift`);
        assert(c.boosting, `nitro must work while drifting`);
        assert(Math.sign(c.slip) === direction);
        drive({ throttle: 1, steer: 0 }, 1.5);
        assert(!c.isDrifting);
        assert(Math.abs(c.slip) < 0.03);
        drive({ throttle: 1, steer: -direction * 0.7, brake: true }, 0.7);
        assert(c.isDrifting, `${id} can re-enter opposite drift`);
        assert(Number.isFinite(c.x + c.z + c.angle));
      }
  const c = vehicle(0, 0);
  c.vz = 25;
  for (let i = 0; i < 120; i++)
    stepVehicle(c, { throttle: 1, brake: true }, 1 / 120, []);
  assert(!c.isDrifting);
  assert.equal(c.slip, 0);
}
