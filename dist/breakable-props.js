import * as THREE from "./vendor/three.module.js";
import { roadClear } from "./road-clearance.js";
import { overOpenWater } from "./surface-support.js";
import { BUILDINGS, containsPoint, nearestRoad } from "./city-map.js";

export function calibrateRoadsideProps(view) {
  const groups = new Map();
  for (const e of view.breakableProps || []) {
    if (!groups.has(e.root)) groups.set(e.root, []);
    groups.get(e.root).push(e);
  }
  let moved = 0;
  const world = new THREE.Vector3();
  for (const [root, entries] of groups) {
    root.getWorldPosition(world);
    if (world.y > 3) continue;
    const legal = (dx, dz) =>
      entries.every(({ definition: d }) => {
        const p = { x: d.x + dx, z: d.z + dz };
        return (
          roadClear(p, d.radius + 0.4) &&
          !overOpenWater(p) &&
          !BUILDINGS.some((b) => containsPoint(b, p.x, p.z, d.radius + 0.4))
        );
      });
    if (legal(0, 0)) continue;
    const d = entries[0].definition,
      r = nearestRoad(d).road;
    let shift = null;
    // Search perpendicular to the street first; only a junction needs a wider search.
    for (let radius = 1; radius <= 100 && !shift; radius += 1) {
      for (let i = 0; i < 16; i++) {
        const angle =
          r.angle +
          Math.PI / 2 +
          ((i % 2 ? -1 : 1) * Math.ceil(i / 2) * Math.PI) / 8;
        const dx = Math.sin(angle) * radius,
          dz = Math.cos(angle) * radius;
        if (legal(dx, dz)) {
          shift = { dx, dz };
          break;
        }
      }
    }
    if (!shift) throw Error("No safe roadside placement for prop " + d.id);
    world.x += shift.dx;
    world.z += shift.dz;
    root.parent.worldToLocal(world);
    root.position.copy(world);
    root.updateMatrix();
    for (const e of entries) {
      e.definition.x += shift.dx;
      e.definition.z += shift.dz;
      e.position.copy(root.position);
    }
    moved++;
  }
  view.roadsideCalibration = { groups: groups.size, moved };
}

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
