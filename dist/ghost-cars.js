import * as THREE from "./vendor/three.module.js";
import { carSpec } from "./config.js";

const MAX_GHOSTS = 12;
const root = new THREE.Object3D();
const part = new THREE.Object3D();
const world = new THREE.Matrix4();

function makeBatch(geometry, material, count) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.count = 0;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.renderOrder = 8;
  return mesh;
}

export class GhostCars {
  constructor(scene) {
    const material = new THREE.MeshBasicMaterial({
      color: "#79eaff",
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      toneMapped: false,
    });
    const dark = material.clone();
    dark.color.set("#d8fbff");
    dark.opacity = 0.2;
    this.group = new THREE.Group();
    this.group.name = "ghost-players";
    this.group.userData.environment = true;
    this.body = makeBatch(new THREE.BoxGeometry(1, 1, 1), material, MAX_GHOSTS);
    this.cabin = makeBatch(new THREE.BoxGeometry(1, 1, 1), dark, MAX_GHOSTS);
    this.wheels = makeBatch(
      new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10),
      dark,
      MAX_GHOSTS * 4,
    );
    this.group.add(this.body, this.cabin, this.wheels);
    scene.add(this.group);
  }
  update(ghosts = []) {
    const list = ghosts.slice(0, MAX_GHOSTS);
    let wheelIndex = 0;
    list.forEach((ghost, index) => {
      const spec = carSpec(ghost.car);
      const width = spec.width,
        length = spec.length,
        tall =
          spec.id === "creator" ? 1.35 : spec.id === "falcon" ? 1.05 : 0.82;
      root.position.set(ghost.x, ghost.y, ghost.z);
      root.rotation.order = "YXZ";
      root.rotation.set(ghost.pitch || 0, ghost.angle, ghost.roll || 0);
      root.scale.set(1, 1, 1);
      root.updateMatrix();

      part.position.set(0, 0.62, 0);
      part.rotation.set(0, 0, 0);
      part.scale.set(width, 0.48 + tall * 0.14, length);
      part.updateMatrix();
      world.multiplyMatrices(root.matrix, part.matrix);
      this.body.setMatrixAt(index, world);

      part.position.set(0, 1.02, -length * 0.05);
      part.scale.set(width * 0.72, tall * 0.48, length * 0.46);
      part.updateMatrix();
      world.multiplyMatrices(root.matrix, part.matrix);
      this.cabin.setMatrixAt(index, world);

      for (const z of [-length * 0.31, length * 0.31])
        for (const x of [-width * 0.49, width * 0.49]) {
          part.position.set(x, 0.43, z);
          part.rotation.set(0, 0, Math.PI / 2);
          part.scale.set(1, 1, 1);
          part.updateMatrix();
          world.multiplyMatrices(root.matrix, part.matrix);
          this.wheels.setMatrixAt(wheelIndex++, world);
        }
    });
    this.body.count = this.cabin.count = list.length;
    this.wheels.count = wheelIndex;
    this.body.instanceMatrix.needsUpdate = true;
    this.cabin.instanceMatrix.needsUpdate = true;
    this.wheels.instanceMatrix.needsUpdate = true;
    this.group.visible = list.length > 0;
  }
}
