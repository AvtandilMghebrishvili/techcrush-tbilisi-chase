import * as THREE from "./vendor/three.module.js";
import { routeBetween, distance, CHECKPOINTS } from "./simulation.js";

// Sample a street route by distance, so arrows follow corners instead of pointing through buildings.
export function sampleRoute(from, route, spacing = 13, reach = 175) {
  const points = [];
  let prior = from,
    travelled = 0,
    next = 7;
  for (const end of route) {
    const length = distance(prior, end);
    if (length < 0.01) continue;
    while (next <= travelled + length && next <= reach) {
      const t = (next - travelled) / length;
      points.push({
        x: prior.x + (end.x - prior.x) * t,
        z: prior.z + (end.z - prior.z) * t,
        angle: Math.atan2(end.x - prior.x, end.z - prior.z),
        along: next,
      });
      next += spacing;
    }
    travelled += length;
    prior = end;
    if (travelled >= reach) break;
  }
  return points;
}

export function makeRouteGuide(scene) {
  const group = new THREE.Group();
  group.userData.environment = true;
  group.visible = false;
  scene.add(group);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -2.5, 0, -1.5, -1.5, 0, -2.3, 0, 0, -0.5, 1.5, 0, -2.3, 2.5, 0, -1.5, 0,
        0, 1.7,
      ],
      3,
    ),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 5, 2, 3, 4, 2, 4, 5]);
  const arrows = Array.from({ length: 15 }, () => {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: "#74fff0",
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    mesh.renderOrder = 2;
    mesh.visible = false;
    group.add(mesh);
    return mesh;
  });
  return { group, arrows, points: [], checkpoint: -1, refreshAt: -1 };
}

export function updateRouteGuide(guide, sim) {
  const cp = CHECKPOINTS[sim.checkpoint];
  guide.group.visible = !!cp && ["running", "paused"].includes(sim.phase);
  if (!guide.group.visible) return;
  if (
    sim.checkpoint !== guide.checkpoint ||
    sim.time >= guide.refreshAt ||
    sim.time < guide.refreshAt - 0.3
  ) {
    guide.points = sampleRoute(sim.player, routeBetween(sim.player, cp));
    guide.checkpoint = sim.checkpoint;
    guide.refreshAt = sim.time + 0.2;
  }
  guide.arrows.forEach((mesh, i) => {
    const p = guide.points[i];
    mesh.visible = !!p;
    if (!p) return;
    const wave = (Math.sin(p.along * 0.11 - sim.time * 5) + 1) / 2;
    mesh.position.set(p.x, 0.18 + wave * 0.12, p.z);
    mesh.rotation.y = p.angle;
    mesh.material.opacity =
      (0.38 + wave * 0.57) * Math.min(1, (185 - p.along) / 35);
    mesh.scale.setScalar(0.9 + wave * 0.12);
  });
}
