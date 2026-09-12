import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "../dist/vendor/three.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { sportsCar, animateWheels } from "../dist/sports-car.js";
import { makeOriginalSportsCar } from "../dist/car-models.js";
import { turnSteering } from "../dist/vehicle-details.js";
import { CARS } from "../dist/config.js";
import { migrateProfile } from "../dist/progression.js";
import { addTurboExhaust, updateTurboExhaust } from "../dist/turbo-effects.js";
import {
  registerBreakable,
  updateBreakables,
} from "../dist/breakable-props.js";
import { treeContact } from "../dist/contacts.js";
import { BRIDGE_BARRIERS } from "../dist/bridge-data.js";
import { ChaseSimulation, vehicle, stepVehicle } from "../dist/simulation.js";

function checkSteering(car) {
  const { rotor, axis } = car.userData.steering;
  car.updateMatrixWorld(true);
  const center = rotor.getWorldPosition(new THREE.Vector3()),
    normal = axis.clone().transformDirection(rotor.matrixWorld);
  const poses = [];
  for (const input of [-1, 0, 1]) {
    turnSteering(car, input);
    car.updateMatrixWorld(true);
    assert(
      rotor.getWorldPosition(new THREE.Vector3()).distanceTo(center) < 1e-7,
      "Wheel hub must stay on its shaft",
    );
    assert(
      axis.clone().transformDirection(rotor.matrixWorld).distanceTo(normal) <
        1e-7,
      "Wheel plane must not tilt",
    );
    poses.push(rotor.quaternion.clone());
  }
  assert(poses[0].angleTo(poses[1]) > 1 && poses[1].angleTo(poses[2]) > 1);
}
test("the original licensed 458 remains selectable with centered shaft steering and upgrades", async () => {
  assert.deepEqual(
    CARS.map((c) => c.id),
    ["classic", "gt", "rally", "suv"],
  );
  const bytes = await readFile(
    new URL("../dist/assets/sports-car.glb", import.meta.url),
  );
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const template = gltf.scene.children[0];
  const view = {
    carTemplate: template,
    carTemplateBounds: new THREE.Box3().setFromObject(template),
    carAO: null,
    box(w, h, d, mat, x, y, z, parent) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    },
  };
  const classic = sportsCar(view, "#eac735", false, "classic", {
    spoiler: 2,
    rims: 3,
  });
  checkSteering(classic);
  assert.equal(classic.userData.wheels.length, 4);
  const centers = classic.userData.wheelSteering.map((p) => p.position.clone());
  animateWheels(classic, 30, 1 / 120, 1);
  classic.userData.wheelSteering.forEach((p, i) =>
    assert(p.position.distanceTo(centers[i]) < 1e-7),
  );
  assert.equal(classic.userData.exhaustPositions.length, 3);
});
test("all new models mount their lamps to the body and rotate steering around a fixed shaft", () => {
  for (const id of ["gt", "rally", "suv"]) {
    const car = makeOriginalSportsCar(id, "#c91820");
    checkSteering(car);
    car.traverse((m) => {
      if (!m.userData.surfaceMounted) return;
      const p = m.geometry.attributes.position;
      const ray = new THREE.Raycaster(),
        body = car.getObjectByName("body-shell");
      for (let i = 0; i < p.count; i += 5) {
        ray.set(
          new THREE.Vector3(p.getX(i), p.getY(i) + 0.1, p.getZ(i)),
          new THREE.Vector3(0, -1, 0),
        );
        const hit = ray.intersectObject(body, false)[0];
        assert(
          hit && hit.distance > 0.098 && hit.distance < 0.135,
          `${id} detail must lie just above the actual triangulated body`,
        );
      }
    });
    assert.equal(car.userData.headlights.length, 2);
    assert(
      car.userData.headlights.every((l) => l.isSpotLight && l.penumbra > 0.8),
    );
    addTurboExhaust(car);
    for (const strength of [0.2, 0.6, 1]) {
      updateTurboExhaust(car, { boosting: true, boostStrength: strength }, 3);
      car.userData.turboExhaust.children.forEach((m, i) => {
        const nozzle = car.userData.exhaustPositions[Math.floor(i / 2)];
        assert.equal(m.position.x, nozzle.x);
        assert.equal(m.position.y, nozzle.y);
        assert(
          Math.abs(
            m.position.z +
              (m.geometry.parameters.height * m.scale.y) / 2 -
              nozzle.z,
          ) < 1e-8,
        );
      });
    }
  }
});
test("existing garages gain the original car without losing credits or installed parts", () => {
  const old = {
    schema: 1,
    credits: 8700,
    level: 4,
    boxes: 2,
    inventory: { "engine:3": 2 },
    cars: { gt: { engine: 4 }, rally: { rims: 2 }, suv: {} },
    selectedCar: "rally",
    settled: ["old-run"],
    lastBox: null,
  };
  const p = migrateProfile(old);
  assert.equal(p.schema, 4);
  assert.deepEqual(p.cars.classic, {});
  const { classic, ...cars } = p.cars;
  assert.deepEqual(cars, old.cars);
  for (const key of [
    "credits",
    "level",
    "boxes",
    "inventory",
    "selectedCar",
    "settled",
  ])
    assert.deepEqual(p[key], old[key]);
  assert.equal(old.schema, 1);
});
test("roadside props break at the first contact and visibly move at that same timestamp; rewind restores them", () => {
  const view = {},
    root = new THREE.Group();
  root.position.set(0, 0, 3);
  const entry = registerBreakable(view, root, 0, 3, 4, 0.2);
  const state = { ...entry.definition, broken: false };
  const c = vehicle(0, 0.8);
  c.vz = 6;
  assert(treeContact(c, state, 20) > 0);
  assert(state.broken);
  assert.equal(state.fallenAt, 20);
  assert(c.vz < 6);
  updateBreakables(view, { poles: [state], time: 20 });
  assert(
    root.quaternion.angleTo(entry.base) > 0.1,
    "Immediate visual impulse, not a delayed ease-in",
  );
  updateBreakables(view, { poles: [{ ...state, broken: false }], time: 19 });
  assert(root.visible);
  assert(root.quaternion.angleTo(entry.base) < 1e-8);
  assert(root.position.equals(entry.position));
});
test("bridge panels withstand ordinary hits and fracture only on hard normal impacts", () => {
  assert(BRIDGE_BARRIERS.length >= 8);
  for (const definition of BRIDGE_BARRIERS.filter((_, i) => i % 9 === 0))
    for (const side of [-1, 1])
      for (const speed of [18, 65]) {
        const b = { ...definition },
          c = vehicle(
            b.x + Math.cos(b.angle) * side * 4,
            b.z - Math.sin(b.angle) * side * 4,
            b.angle - (side * Math.PI) / 2,
          );
        c.vx = -Math.cos(b.angle) * side * speed;
        c.vz = Math.sin(b.angle) * side * speed;
        for (let i = 0; i < 35; i++)
          stepVehicle(c, { throttle: 1 }, 1 / 120, [b]);
        const offset =
          (c.x - b.x) * Math.cos(b.angle) - (c.z - b.z) * Math.sin(b.angle);
        if (speed === 18) {
          assert(!b.broken);
          assert(offset * side > 0);
        } else {
          assert(b.broken);
          assert(offset * side < 0);
        }
        assert(c.health < 100);
        assert(
          !definition.broken,
          "Shared map data must not acquire run damage",
        );
      }
});
test("an upside-down living car recovers automatically even without a pre-existing flip timer", () => {
  const s = new ChaseSimulation();
  s.start("classic");
  s.police = [];
  s.traffic = [];
  s.trees = [];
  s.poles = [];
  s.ramps = [];
  s.nextWaveAt = Infinity;
  Object.assign(s.player, {
    roll: Math.PI,
    flipped: false,
    flipTimer: undefined,
    health: 40,
  });
  for (let i = 0; i < 110; i++) s.update(1 / 120, {});
  assert.equal(s.player.flipped, false);
  assert.equal(s.player.roll, 0);
  assert(s.player.health > 0);
  assert.equal(s.phase, "running");
});
