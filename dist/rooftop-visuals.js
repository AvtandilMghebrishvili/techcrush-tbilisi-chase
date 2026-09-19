import * as THREE from "./vendor/three.module.js";
import { ROOFTOP_QUESTS } from "./world-sites.js";
import { batchStatic } from "./expansion-visuals.js";

export function buildExtraRooftops(v) {
  v.questCrates = [{ ...v.questCrate, id: ROOFTOP_QUESTS[0].roof.id }];
  const root = new THREE.Group();
  root.userData.environment = true;
  root.name = "Rooftop challenge yards";
  v.decor.add(root);
  const cap = new THREE.MeshStandardMaterial({
    color: "#344853",
    roughness: 0.7,
  });
  const stripes = new THREE.MeshStandardMaterial({
    color: "#e1fe28",
    roughness: 0.7,
  });
  for (const q of ROOFTOP_QUESTS.slice(1)) {
    const r = q.roof,
      group = new THREE.Group();
    group.position.set(r.x, 0, r.z);
    group.rotation.y = r.angle;
    root.add(group);
    const box = (w, h, d, m, x, y, z) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
    };
    box(r.w, r.h - 0.15, r.d, v.expansionFacades[1], 0, (r.h - 0.15) / 2, 0);
    box(r.w, 0.15, r.d, cap, 0, r.h - 0.075, 0);
    for (const side of [-1, 1])
      box(0.35, 0.025, r.d - 8, stripes, side * (r.w / 2 - 2), r.h + 0.025, 0);
    // Share crate geometry/materials, including the one GREX texture applied later.
    const crate = v.questCrate.root.clone(true);
    crate.position.set(q.box.x, q.box.y, q.box.z);
    crate.rotation.y = r.angle;
    crate.userData.dynamic = true;
    const beaconIndex = v.questCrate.root.children.indexOf(v.questCrate.beacon);
    const beacon = crate.children[beaconIndex];
    root.add(crate);
    v.questCrates.push({ id: r.id, root: crate, beacon });
  }
  batchStatic(root);
}
