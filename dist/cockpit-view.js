import * as THREE from "./vendor/three.module.js";
import { portraitFov } from "./mobile-input.js";

// Keep the driver's eyes inside the canopy, above the instruments and far
// enough above the wheel to preserve the road. Tall canopies need more roof
// clearance so the roof liner does not fill the upper half of the windscreen.
export function cockpitSeat(roof, shift = 0, x = 0.36) {
  return { x, y: roof - (roof <= 1.25 ? 0.08 : 0.18), z: shift - 0.23 };
}

const target = new THREE.Vector3();
const fallbackSeat = cockpitSeat(1.46);
export function positionCockpitCamera(camera, car) {
  const seat = car.userData.cockpitSeat || fallbackSeat;
  // Use the rendered chassis, including tyre/kerb support and pitch/roll.
  // Simulation Y alone put the driver's eyes below the dash on raised paving.
  car.updateWorldMatrix(true, false);
  camera.position.set(seat.x, seat.y, seat.z).applyMatrix4(car.matrixWorld);
  target.set(seat.x, seat.y - 0.8, seat.z + 50).applyMatrix4(car.matrixWorld);
  camera.up.set(0, 1, 0).transformDirection(car.matrixWorld);
  camera.lookAt(target);
  camera.fov = portraitFov(76, camera.aspect);
}
