import * as THREE from "./vendor/three.module.js";
// Street lamps retain individual physical contacts, but share spatial GPU draws.
// Only a lamp that is falling, disappearing or restored by rewind uploads again.
export function batchStreetLamps(view) {
  const tiles = new Map(),
    unit = new THREE.BoxGeometry(1, 1, 1),
    roots = new Set((view.streetLamps || []).map((l) => l.head.parent));
  for (const root of roots) {
    root.updateWorldMatrix(true, true);
    root.userData.lampInstances = [];
    for (const mesh of root.children) {
      if (!mesh.isMesh || mesh.geometry.type !== "BoxGeometry") continue;
      const key =
          mesh.material.uuid +
          ":" +
          Math.floor(root.position.x / 180) +
          ":" +
          Math.floor(root.position.z / 180),
        p = mesh.geometry.parameters;
      if (!tiles.has(key))
        tiles.set(key, { material: mesh.material, items: [] });
      const item = {
        root,
        local: mesh.matrix
          .clone()
          .multiply(new THREE.Matrix4().makeScale(p.width, p.height, p.depth)),
        lamp: view.streetLamps.some((l) => l.head === mesh),
      };
      tiles.get(key).items.push(item);
      root.userData.lampInstances.push(item);
      mesh.layers.disableAll();
      mesh.geometry.dispose();
    }
  }
  for (const { material, items } of tiles.values()) {
    const batch = new THREE.InstancedMesh(unit, material, items.length);
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    batch.castShadow = batch.receiveShadow = true;
    items.forEach((item, index) => {
      item.batch = batch;
      item.index = index;
      batch.setMatrixAt(
        index,
        item.root.matrixWorld.clone().multiply(item.local),
      );
    });
    batch.computeBoundingSphere();
    batch.boundingSphere.radius += 12;
    view.decor.add(batch);
  }
  view.lampBatchCount = tiles.size;
}
const matrix = new THREE.Matrix4(),
  hidden = new THREE.Matrix4().makeScale(0, 0, 0);
export function syncLampInstances(root, broken) {
  const items = root.userData.lampInstances;
  if (!items) return;
  root.updateWorldMatrix(true, false);
  for (const item of items) {
    item.batch.setMatrixAt(
      item.index,
      !root.visible || (item.lamp && broken)
        ? hidden
        : matrix.copy(root.matrixWorld).multiply(item.local),
    );
    item.batch.instanceMatrix.needsUpdate = true;
  }
}
