import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "../dist/vendor/three.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CARS } from "../dist/config.js";
import { makeOriginalSportsCar } from "../dist/car-models.js";
import { sportsCar } from "../dist/sports-car.js";
import { turnSteering } from "../dist/vehicle-details.js";
import { positionCockpitCamera } from "../dist/cockpit-view.js";

const bytes = await readFile(
  new URL("../dist/assets/sports-car.glb", import.meta.url),
);
const gltf = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
const template = gltf.scene.children[0];
const source = {
  carTemplate: template,
  carTemplateBounds: new THREE.Box3().setFromObject(template),
  carAO: null,
};
const cars = CARS.map(({ id }) => [
  id,
  id === "classic"
    ? sportsCar(source, "#eecb39")
    : makeOriginalSportsCar(id, "#eecb39"),
]);

test("every cabin keeps the steering wheel below the road on desktop, square and portrait views", () => {
  for (const [id, car] of cars) {
    const camera = new THREE.PerspectiveCamera(76, 16 / 9, 0.06, 4800);
    for (const aspect of [16 / 9, 977 / 857, 390 / 844]) {
      camera.aspect = aspect;
      for (const steer of [-1, 0, 1]) {
        turnSteering(car, steer);
        car.updateMatrixWorld(true);
        positionCockpitCamera(camera, car);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
        let top = -Infinity;
        car.userData.steering.rotor.traverse((mesh) => {
          if (!mesh.geometry) return;
          const points = mesh.geometry.attributes.position;
          for (let i = 0; i < points.count; i++) {
            const p = new THREE.Vector3()
              .fromBufferAttribute(points, i)
              .applyMatrix4(mesh.matrixWorld)
              .project(camera);
            top = Math.max(top, p.y);
          }
        });
        assert(
          top < -0.09,
          `${id} ${aspect}: wheel intrudes into road (${top})`,
        );
      }
    }
    // Actual triangles, not only the seat coordinates: the driver's forward
    // sightline must pass through the windscreen rather than a roof/dash/hood.
    const origin = camera.position.clone();
    const ray = new THREE.Raycaster();
    for (const [distance, height] of [
      [12, 0.075],
      [25, 0.075],
      [50, 0.075],
      [50, origin.y],
    ]) {
      const road = new THREE.Vector3(origin.x, height, distance);
      ray.set(origin, road.clone().sub(origin).normalize());
      ray.far = origin.distanceTo(road);
      const hits = ray.intersectObject(car, true).filter(({ object }) => {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        return materials.some((m) => !m.transparent || m.opacity > 0.8);
      });
      assert.equal(
        hits.length,
        0,
        `${id}: road ${distance}m occluded by ${hits.map((h) => h.object.name || h.object.geometry.type)}`,
      );
    }
  }
});

test("driver camera follows chassis support, jumps, banking and heading without drifting into the dash", () => {
  for (const [id, car] of cars) {
    const camera = new THREE.PerspectiveCamera();
    const seat = car.userData.cockpitSeat;
    for (const [height, pitch, yaw, roll] of [
      [0.08, 0, 0, 0],
      [0.22, 0, 1.8, 0.035],
      [6, -0.3, -2.3, 0.2],
      [3, 0.7, 2, 2.5],
    ]) {
      car.position.set(310, height, -208);
      car.rotation.set(pitch, yaw, roll, "YXZ");
      positionCockpitCamera(camera, car);
      const local = car.worldToLocal(camera.position.clone());
      assert(
        local.distanceTo(new THREE.Vector3(seat.x, seat.y, seat.z)) < 1e-7,
        `${id}: eye leaves its seat`,
      );
      const up = new THREE.Vector3(0, 1, 0).transformDirection(car.matrixWorld);
      assert(
        camera.up.distanceTo(up) < 1e-7,
        `${id}: camera bank diverges from cabin`,
      );
    }
    car.position.set(0, 0, 0);
    car.rotation.set(0, 0, 0);
  }
});
