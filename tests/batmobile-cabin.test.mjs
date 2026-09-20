import test from "node:test";
import assert from "node:assert/strict";
import * as T from "../dist/vendor/three.module.js";
import { makeBatmobile } from "../dist/batmobile.js";
test("every Batmobile spoiler grade changes exactly two solid fins without a transverse wing", () => {
  let previous = 0;
  for (let grade = 0; grade <= 8; grade++) {
    const car = makeBatmobile("#1e2831", { spoiler: grade }),
      fins = car.userData.exteriorKit;
    assert.equal(fins.name, "bat-twin-fins");
    assert.equal(fins.userData.grade, grade);
    assert(fins.getObjectByName("bat-fin-left"));
    assert(fins.getObjectByName("bat-fin-right"));
    assert.equal(car.getObjectByName("rear-wing"), undefined);
    assert.equal(car.getObjectByName("aero-blade"), undefined);
    car.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(fins);
    assert(bounds.max.y > previous);
    previous = bounds.max.y;
  }
});
test("Batmobile driver has a clear forward sightline, a real dashboard and a sealed rear cabin", () => {
  const car = makeBatmobile(),
    seat = car.userData.cockpitSeat;
  car.updateMatrixWorld(true);
  const origin = new T.Vector3(seat.x, seat.y, seat.z).applyMatrix4(
    car.matrixWorld,
  );
  const ray = new T.Raycaster(origin, new T.Vector3(0, 0, 1), 0, 4);
  const opaque = ray
    .intersectObject(car, true)
    .filter((hit) => !hit.object.material.transparent);
  assert.equal(
    opaque.length,
    0,
    "No opaque hood, pillar or roof blocks the road",
  );
  ray.set(origin, new T.Vector3(0, 0, -1));
  assert(
    ray
      .intersectObject(car, true)
      .some((hit) => hit.object.name === "rear-bulkhead"),
    "No open tube behind the seats",
  );
  assert(car.getObjectByName("bat-cockpit-shell"));
  assert(car.getObjectByName("steering_wheel"));
});
