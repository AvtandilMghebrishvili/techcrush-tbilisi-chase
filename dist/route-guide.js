import * as THREE from "./vendor/three.module.js";
import { distance } from "./simulation.js";
import { playerRoute } from "./navigation-cache.js";

const GUIDE_VIEWS = {
  chase: { scale: 0.68, height: 0.23, tilt: 0, screenWidth: 0.085 },
  cockpit: { scale: 0.4, height: 0.85, tilt: -0.38, screenWidth: 0.055 },
  hood: { scale: 0.46, height: 0.75, tilt: -0.38, screenWidth: 0.06 },
  aerial: { scale: 0.88, height: 0.23, tilt: 0, screenWidth: 0.085 },
};
const cameraForward = new THREE.Vector3();
const cameraOffset = new THREE.Vector3();

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
  return { group, arrows, points: [], checkpoint: -1 };
}

export function updateRouteGuide(guide, sim, mode = "chase", camera = null) {
  const style = GUIDE_VIEWS[mode] || GUIDE_VIEWS.chase;
  const interior = mode === "cockpit" || mode === "hood";
  const cp = sim.checkpoints[sim.checkpoint];
  guide.group.visible = !!cp && ["running", "paused"].includes(sim.phase);
  if (!guide.group.visible) return;
  if (
    sim.checkpoint !== guide.checkpoint ||
    sim.level !== guide.level ||
    sim.player.x !== guide.originX ||
    sim.player.z !== guide.originZ
  ) {
    // Sample the current position each moving frame, rather than jumping every
    // 200 ms. The street graph already caches its shortest-path trees.
    guide.points = sampleRoute(sim.player, playerRoute(sim));
    guide.checkpoint = sim.checkpoint;
    guide.level = sim.level;
    guide.originX = sim.player.x;
    guide.originZ = sim.player.z;
  }
  if (camera) camera.getWorldDirection(cameraForward);
  guide.arrows.forEach((mesh, i) => {
    const p = guide.points[i];
    const nearFade =
      p && interior
        ? THREE.MathUtils.smoothstep(distance(sim.player, p), 12, 24)
        : 1;
    mesh.visible = !!p && nearFade > 0;
    if (!p) return;
    const wave = (Math.sin(p.along * 0.11 - sim.time * 3.3) + 1) / 2;
    // Animate only light: no bobbing or expanding arrows across the windshield.
    mesh.position.set(p.x, style.height, p.z);
    mesh.rotation.set(style.tilt, p.angle, 0, "YXZ");
    mesh.material.opacity =
      (interior ? 0.64 + wave * 0.16 : 0.48 + wave * 0.24) *
      nearFade *
      (1 - THREE.MathUtils.smoothstep(p.along, 140, 180));
    let scale = style.scale;
    if (camera) {
      const depth = cameraOffset
        .copy(mesh.position)
        .sub(camera.position)
        .dot(cameraForward);
      // Bound projected width on narrow screens too; retain natural perspective
      // in the distance instead of enlarging far arrows into a solid ribbon.
      const visibleWidth =
        2 *
        Math.max(0, depth - 2) *
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
        camera.aspect;
      scale = Math.min(scale, (visibleWidth * style.screenWidth) / 5);
      mesh.visible &&= depth > 2;
    }
    mesh.scale.setScalar(scale);
  });
}
