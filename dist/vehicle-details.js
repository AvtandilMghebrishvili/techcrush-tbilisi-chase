import * as THREE from "./vendor/three.module.js";

export function bindSteering(car, rotor, axis = new THREE.Vector3(0, 0, 1)) {
  car.userData.steering = {
    rotor,
    axis: axis.clone(),
    rest: rotor.quaternion.clone(),
  };
}
const spin = new THREE.Quaternion();
export function turnSteering(car, input) {
  const s = car.userData.steering;
  if (!s) return;
  spin.setFromAxisAngle(
    s.axis,
    Math.max(-1, Math.min(1, input)) * Math.PI * 0.65,
  );
  s.rotor.quaternion.copy(s.rest).multiply(spin);
}
export function makeSteering(
  parent,
  material,
  trim,
  x = 0.36,
  y = 0.98,
  z = 0.3,
) {
  const column = new THREE.Group();
  column.position.set(x, y, z);
  column.rotation.x = 0.32;
  parent.add(column);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, 0.34, 16),
    material,
  );
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = 0.17;
  column.add(shaft);
  const rotor = new THREE.Group();
  rotor.name = "steering_wheel";
  column.add(rotor);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.168, 0.023, 12, 48),
    material,
  );
  rotor.add(rim);
  for (const angle of [Math.PI / 2, -Math.PI / 2, Math.PI]) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.033, 0.14, 0.025),
      trim,
    );
    spoke.position.set(Math.sin(angle) * 0.065, Math.cos(angle) * 0.065, 0);
    spoke.rotation.z = -angle;
    rotor.add(spoke);
  }
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.052, 0.047, 24),
    material,
  );
  hub.rotation.x = Math.PI / 2;
  rotor.add(hub);
  return rotor;
}
export function addHeadlights(car, anchors) {
  const lights = [];
  for (const p of anchors) {
    const light = new THREE.SpotLight("#fff2d5", 16, 33, Math.PI / 7, 0.9, 2);
    light.position.set(p.x, p.y, p.z);
    light.target.position.set(p.x, 0.08, p.z + 23);
    light.castShadow = false;
    car.add(light, light.target);
    lights.push(light);
  }
  car.userData.headlights = lights;
}
