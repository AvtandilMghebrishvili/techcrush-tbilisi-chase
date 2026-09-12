import * as THREE from "./vendor/three.module.js";
import { BRIDGE_BARRIERS } from "./bridge-data.js";
export function buildBridgeRails(view, stone, metal) {
  const pieces = [[], []];
  for (const rail of BRIDGE_BARRIERS) {
    pieces[0].push({ rail, y: 0.2, z: 0, w: rail.w, h: 0.35, d: rail.d });
    pieces[1].push({ rail, y: 1.35, z: 0, w: 0.14, h: 0.13, d: rail.d });
    for (let t = -rail.d / 2 + 0.2; t < rail.d / 2; t += 1.8)
      pieces[1].push({ rail, y: 0.77, z: t, w: 0.08, h: 1.18, d: 0.08 });
  }
  view.bridgeRails = pieces.map((list, i) => {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      [stone, metal][i],
      list.length,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Broken panels move up to 3 metres, so keep conservative fixed bounds.
    mesh.frustumCulled = false;
    view.decor.add(mesh);
    return { mesh, list, previous: new Map() };
  });
  updateBridgeRails(view, BRIDGE_BARRIERS, 0);
}
const panel = new THREE.Object3D(),
  piece = new THREE.Object3D(),
  matrix = new THREE.Matrix4();
export function updateBridgeRails(view, barriers, time) {
  if (
    view.bridgeStateSource !== barriers ||
    view.bridgeStateLength !== barriers.length
  ) {
    view.bridgeStateSource = barriers;
    view.bridgeStateLength = barriers.length;
    view.bridgeStates = new Map(
      barriers.filter((b) => b.barrier).map((b) => [b.id, b]),
    );
  }
  const states = view.bridgeStates;
  for (const batch of view.bridgeRails || []) {
    let dirty = false;
    batch.list.forEach((p, i) => {
      const rail = states.get(p.rail.id) || p.rail;
      const fall = rail.broken
        ? Math.min(1, Math.max(0.06, (time - rail.fallenAt) / 0.55))
        : 0;
      if (batch.previous.get(i) === fall) return;
      batch.previous.set(i, fall);
      dirty = true;
      panel.position.set(
        rail.x + Math.cos(rail.angle) * fall * 1.8,
        -fall * 0.55,
        rail.z - Math.sin(rail.angle) * fall * 1.8,
      );
      panel.rotation.set(0, rail.angle, -fall * 1.45, "YXZ");
      panel.updateMatrix();
      piece.position.set(0, p.y, p.z);
      piece.scale.set(p.w, p.h, p.d);
      piece.updateMatrix();
      matrix.multiplyMatrices(panel.matrix, piece.matrix);
      batch.mesh.setMatrixAt(i, matrix);
    });
    if (dirty) batch.mesh.instanceMatrix.needsUpdate = true;
  }
}
