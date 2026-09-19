import * as THREE from "./vendor/three.module.js";
import { roadClear } from "./road-clearance.js";
import { overOpenWater } from "./surface-support.js";

// Light paving frames the buildings; roads and water keep their original surfaces.
export function buildHeritagePlazas(root, courts, material, accent) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const seen = new Set();
  for (const { apron: r } of courts) {
    for (
      let x = Math.ceil((r.x - r.w / 2) / 8) * 8;
      x < r.x + r.w / 2 - 4;
      x += 8
    )
      for (
        let z = Math.ceil((r.z - r.d / 2) / 8) * 8;
        z < r.z + r.d / 2 - 4;
        z += 8
      ) {
        const key = x + ":" + z;
        if (seen.has(key)) continue;
        seen.add(key);
        if (
          !roadClear({ x, z }, 6) ||
          [-4, 4].some((dx) =>
            [-4, 4].some((dz) => overOpenWater({ x: x + dx, z: z + dz })),
          )
        )
          continue;
        const mesh = new THREE.Mesh(
          geometry,
          ((x + z) / 8) % 8 === 0 ? accent : material,
        );
        mesh.scale.set(7.96, 0.04, 7.96);
        mesh.position.set(x, -0.015, z);
        mesh.receiveShadow = true;
        root.add(mesh);
      }
  }
}
