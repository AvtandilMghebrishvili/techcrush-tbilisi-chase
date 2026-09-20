import * as THREE from "./vendor/three.module.js";
// Small geometry, no leaf textures or alpha overdraw. A real tree silhouette at
// every planted position, also used as the distant representation on higher modes.
export function simpleTree(height, palm = false) {
  const scene = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({
    color: "#75634d",
    roughness: 1,
  });
  bark.name = "simple_bark";
  const leaves = new THREE.MeshStandardMaterial({
    color: palm ? "#39835c" : "#466e3f",
    roughness: 1,
  });
  leaves.name = "simple_leaves";
  const trunkHeight = height * (palm ? 0.84 : 0.62);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(height * 0.022, height * 0.038, trunkHeight, 5),
    bark,
  );
  trunk.position.y = trunkHeight / 2;
  scene.add(trunk);
  if (palm) {
    const positions = [];
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7,
        x = Math.cos(a),
        z = Math.sin(a),
        h = height;
      positions.push(
        0,
        h * 0.85,
        0,
        x * h * 0.23 - z * h * 0.075,
        h * 0.97,
        z * h * 0.23 + x * h * 0.075,
        x * h * 0.48,
        h * 0.76,
        z * h * 0.48,
        0,
        h * 0.85,
        0,
        x * h * 0.48,
        h * 0.76,
        z * h * 0.48,
        x * h * 0.23 + z * h * 0.075,
        h * 0.97,
        z * h * 0.23 - x * h * 0.075,
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.computeVertexNormals();
    leaves.side = THREE.DoubleSide;
    scene.add(new THREE.Mesh(geometry, leaves));
  } else {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), leaves);
    crown.scale.set(height * 0.33, height * 0.38, height * 0.32);
    crown.position.y = height * 0.64;
    scene.add(crown);
  }
  return { scene };
}
