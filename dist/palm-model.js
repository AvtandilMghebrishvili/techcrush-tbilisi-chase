import * as THREE from "./vendor/three.module.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
// One original palm mesh, instanced by the existing tree LOD and breakage system.
export function palmModel() {
  const scene = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({
    color: "#897359",
    roughness: 1,
  });
  bark.name = "palm_bark";
  const leaves = new THREE.MeshStandardMaterial({
    color: "#39835c",
    roughness: 0.93,
    side: THREE.DoubleSide,
  });
  leaves.name = "palm_leaves";
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.36, 8.4, 9),
    bark,
  );
  trunk.position.y = 4.2;
  scene.add(trunk);
  const geometries = [];
  for (let f = 0; f < 11; f++) {
    const a = (f * Math.PI * 2) / 11,
      positions = [];
    for (let i = 0; i < 10; i++) {
      const t = i / 10,
        u = (i + 1) / 10;
      const point = (v, side) => {
        const length = v * 4.1,
          width = Math.sin(v * Math.PI) * 0.6 * side;
        return [
          Math.cos(a) * length - Math.sin(a) * width,
          8.3 + Math.sin(v * Math.PI) * 1.1 - v * v * 2.1,
          Math.sin(a) * length + Math.cos(a) * width,
        ];
      };
      positions.push(
        ...point(t, -1),
        ...point(u, -1),
        ...point(u, 1),
        ...point(t, -1),
        ...point(u, 1),
        ...point(t, 1),
      );
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.computeVertexNormals();
    geometries.push(g);
  }
  const crown = new THREE.Mesh(mergeGeometries(geometries), leaves);
  geometries.forEach((g) => g.dispose());
  scene.add(crown);
  return { scene };
}
