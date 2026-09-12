import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as THREE from "../dist/vendor/three.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  PARTS,
  newProfile,
  applyProgressAction,
  upgradedSpec,
} from "../dist/progression.js";
import { carSpec } from "../dist/config.js";
import { makeOriginalSportsCar } from "../dist/car-models.js";
import { sportsCar, animateWheels } from "../dist/sports-car.js";
import { makeWheel, paintColor } from "../dist/customization.js";
import { makePartModel } from "../dist/workshop-parts.js";
import { comparisonRows } from "../dist/garage-presentation.js";
import { updateVehicleDamage } from "../dist/vehicle-damage.js";
import { makeRouteGuide, updateRouteGuide } from "../dist/route-guide.js";
import { ChaseSimulation } from "../dist/simulation.js";

test("paint is validated, survives profile serialization and changes only the chosen car", () => {
  const p = newProfile();
  p.cars.gt = { rims: 3, engine: 2 };
  const after = applyProgressAction(p, {
    type: "paint",
    car: "gt",
    color: "#AB12CD",
  });
  assert.equal(after.cars.gt.paint, "#ab12cd");
  assert.equal(after.credits, p.credits);
  assert.deepEqual(p.cars.gt, { rims: 3, engine: 2 });
  assert.deepEqual(after.cars.classic, {});
  assert.equal(
    paintColor(JSON.parse(JSON.stringify(after)).cars.gt, "#ffffff"),
    "#ab12cd",
  );
  assert.equal(
    upgradedSpec(carSpec("gt"), after.cars.gt).topSpeed,
    upgradedSpec(carSpec("gt"), p.cars.gt).topSpeed,
  );
  for (const color of ["red", "#fff", "#123456;bad", "url(secret)", null])
    assert.throws(() =>
      applyProgressAction(p, { type: "paint", car: "gt", color }),
    );
  assert.throws(() =>
    applyProgressAction(p, { type: "paint", car: "missing", color: "#123456" }),
  );
});
test("all 112 part grades have finite geometry and distinct machining within each part", () => {
  for (const part of PARTS) {
    const hashes = new Set();
    for (let t = 1; t <= 8; t++) {
      const model = makePartModel(part.id, t),
        hash = createHash("sha256");
      model.updateMatrixWorld(true);
      model.traverse((m) => {
        if (!m.isMesh) return;
        const a = m.geometry.attributes.position.array;
        assert([...a].every(Number.isFinite));
        hash.update(Buffer.from(a.buffer));
        hash.update(JSON.stringify(m.matrixWorld.elements));
      });
      hashes.add(hash.digest("hex"));
      const b = new THREE.Box3().setFromObject(model);
      assert(!b.isEmpty());
      assert(b.getSize(new THREE.Vector3()).length() < 5);
    }
    assert.equal(
      hashes.size,
      8,
      part.id + " must change geometry, not only its label",
    );
  }
});
test("wheel kits keep rolling radius, clear hubs, fixed calipers and mounted spoiler supports", () => {
  for (const id of ["gt", "rally", "suv"])
    for (let tier = 1; tier <= 5; tier++) {
      const car = makeOriginalSportsCar(id, "#dd2233", {
        tires: tier,
        rims: tier,
        spoiler: tier,
        brakes: tier,
      });
      car.updateMatrixWorld(true);
      assert.equal(car.userData.wheels.length, 4);
      assert.equal(car.userData.wheelSteering.length, 2);
      for (const wheel of car.userData.wheels) {
        const p = wheel.getWorldPosition(new THREE.Vector3());
        assert(Math.abs(p.y - 0.36) < 1e-6);
        assert(Math.abs(p.x) < 1.1);
        const caliper = wheel.parent.getObjectByName("brake-caliper");
        assert.equal(caliper.parent, wheel.parent);
      }
      const wing = car.getObjectByName("rear-wing");
      assert(wing.children.length >= 6);
      const center = car.userData.wheels[0].getWorldPosition(
        new THREE.Vector3(),
      );
      animateWheels(car, 40, 0.1, 1);
      car.updateMatrixWorld(true);
      assert(
        car.userData.wheels[0]
          .getWorldPosition(new THREE.Vector3())
          .distanceTo(center) < 1e-6,
      );
      updateVehicleDamage(car, {
        health: 50,
        damage: { front: 0.5, rear: 0.5, left: 0.2 },
      });
      assert.equal(car.userData.equipment.rims, tier);
    }
  for (let t = 0; t <= 4; t++) {
    const b = new THREE.Box3().setFromObject(makeWheel({ rims: t, tires: t }));
    assert(Math.abs(b.max.y - 0.354) < 0.01);
  }
});
test("original model upgraded wheels fit actual template hubs and leave the source mesh untouched", async () => {
  const bytes = await readFile(
    new URL("../dist/assets/sports-car.glb", import.meta.url),
  );
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const template = gltf.scene.children[0],
    view = {
      carTemplate: template,
      carTemplateBounds: new THREE.Box3().setFromObject(template),
      carAO: null,
    };
  const stock = sportsCar(view, "#ffff00"),
    custom = sportsCar(view, "#2468de", false, "classic", {
      rims: 4,
      tires: 4,
      brakes: 4,
      spoiler: 4,
    });
  stock.updateMatrixWorld(true);
  custom.updateMatrixWorld(true);
  stock.userData.wheels.forEach((wheel, i) =>
    assert(
      wheel
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(
          custom.userData.wheels[i].getWorldPosition(new THREE.Vector3()),
        ) < 1e-6,
    ),
  );
  assert.equal(custom.userData.paint.color.getHexString(), "2468de");
  assert.equal(custom.userData.cabinStyle, "classic");
  assert(template.getObjectByName("wheel_fl").visible);
});
test("comparisons agree with live performance and preview never changes equipment", () => {
  for (const id of ["classic", "gt", "rally", "suv"])
    for (const part of PARTS)
      for (let tier = 1; tier <= 4; tier++) {
        const eq = { engine: 2, tires: 1, [part.id]: tier - 1 },
          copy = structuredClone(eq),
          rows = comparisonRows(carSpec(id), eq, part, tier);
        assert.deepEqual(eq, copy);
        for (const r of rows) {
          assert(Number.isFinite(r.after));
          assert(r.lower ? r.after < r.before : r.after > r.before);
        }
        const speed = rows.find((r) => r.key === "topSpeed");
        if (speed)
          assert.equal(
            speed.after,
            upgradedSpec(carSpec(id), { ...eq, [part.id]: tier }).topSpeed *
              3.6,
          );
      }
});
test("cockpit route arrows keep road positions but gain a visible raised face and reset in chase view", () => {
  const sim = new ChaseSimulation();
  sim.start("gt");
  const guide = makeRouteGuide(new THREE.Scene());
  updateRouteGuide(guide, sim, "chase");
  const arrow = guide.arrows.find((a) => a.visible),
    point = arrow.position.clone();
  updateRouteGuide(guide, sim, "cockpit");
  assert.equal(arrow.position.x, point.x);
  assert.equal(arrow.position.z, point.z);
  assert(arrow.position.y > point.y);
  assert(Math.abs(arrow.rotation.x) > 0.3);
  assert(arrow.material.depthTest);
  updateRouteGuide(guide, sim, "chase");
  assert.equal(arrow.rotation.x, 0);
  assert(arrow.position.y < 0.4);
});
