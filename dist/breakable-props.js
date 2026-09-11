import * as THREE from "./vendor/three.module.js";

export function registerBreakable(
  view,
  root,
  x,
  z,
  height = 8,
  radius = 0.18,
  soundMaterial = "metal",
) {
  view.breakableProps ||= [];
  root.userData.dynamic = true;
  root.userData.environment = true;
  root.userData.breakableIds ||= [];
  root.userData.breakableIds.push(view.breakableProps.length);
  root.updateMatrix();
  const entry = {
    root,
    base: root.quaternion.clone(),
    position: root.position.clone(),
    definition: {
      id: view.breakableProps.length,
      x,
      z,
      h: height,
      radius,
      breakSpeed: 0.5,
      soundMaterial,
      linked: root.userData.breakableIds,
    },
  };
  view.breakableProps.push(entry);
  return entry;
}
const axis = new THREE.Vector3(),
  fall = new THREE.Quaternion();
export function updateBreakables(view, sim) {
  for (const entry of view.breakableProps || []) {
    const state = sim.poles?.[entry.definition.id];
    const age = state?.broken ? Math.max(0, sim.time - state.fallenAt) : 0;
    entry.root.visible = !state?.broken || age < 14;
    entry.root.position.copy(entry.position);
    entry.root.quaternion.copy(entry.base);
    if (state?.broken) {
      // An immediate kick makes contact visible in the very same simulation frame.
      const amount = Math.min(1, 0.09 + age / 0.55);
      axis.set(Math.cos(state.fallAngle), 0, -Math.sin(state.fallAngle));
      fall.setFromAxisAngle(axis, amount * Math.PI * 0.49);
      entry.root.quaternion.premultiply(fall);
    }
  }
}
