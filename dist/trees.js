import { IS_BATUMI } from "./map-selection.js";
import * as THREE from "./vendor/three.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
export async function loadTrees(v) {
  const loader = new GLTFLoader();
  const models = IS_BATUMI
    ? [(await import("./palm-model.js")).palmModel()]
    : await Promise.all(
        (v.mobile ? ["tree-far.glb"] : ["tree-near.glb", "tree-far.glb"]).map(
          (n) => loader.loadAsync("./assets/" + n),
        ),
      );
  const near = models[0],
    far = models[1] || models[0];
  const bounds = new THREE.Box3().setFromObject(near.scene),
    height = bounds.max.y - bounds.min.y;
  const materials = new Map(),
    groups = [];
  const wind = { value: 0 };
  for (const [level, gltf] of [near, far].entries()) {
    if (v.mobile && level === 0) continue;
    gltf.scene.updateMatrixWorld(true);
    const meshes = [];
    gltf.scene.traverse((m) => {
      if (m.isMesh) meshes.push(m);
    });
    for (const m of meshes) {
      let material = materials.get(m.material.name);
      if (!material) {
        material = m.material;
        material.roughness = 0.92;
        material.side = THREE.DoubleSide;
        material.onBeforeCompile = (shader) => {
          shader.uniforms.treeTime = wind;
          shader.vertexShader =
            "uniform float treeTime;\n" + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
            float crown=clamp(position.y/${height.toFixed(5)}-0.3,0.0,1.0);
            transformed.x+=sin(treeTime*1.3+instanceMatrix[3].x*.08+position.y)*crown*.018;
            transformed.z+=cos(treeTime*.9+instanceMatrix[3].z*.06)*crown*.012;`,
          );
        };
        materials.set(material.name, material);
      }
      const geometry = m.geometry.clone().applyMatrix4(m.matrixWorld);
      geometry.translate(0, -bounds.min.y, 0);
      const batch = new THREE.InstancedMesh(
        geometry,
        material,
        v.treePositions.length,
      );
      batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      batch.userData.leaves = material.name.includes("leaves");
      batch.castShadow = level === 0;
      batch.receiveShadow = true;
      batch.frustumCulled = false;
      v.decor.add(batch);
      groups.push({ batch, level });
    }
  }
  const stumps = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.28, 0.4, 0.5, 10),
    new THREE.MeshStandardMaterial({ color: "#6c6250", roughness: 1 }),
    v.treePositions.length,
  );
  stumps.castShadow = true;
  stumps.count = 0;
  stumps.frustumCulled = false;
  v.decor.add(stumps);
  v.trees = {
    groups,
    height,
    wind,
    stumps,
    lowAsset: !!v.mobile,
    nextUpdate: -1,
  };
  updateTrees(v, { x: 0, z: 0 }, 0, v.treePositions, true);
}
export function updateTrees(
  v,
  p,
  time,
  states = v.treePositions,
  force = false,
) {
  if (!v.trees) return;
  const { groups, height, wind, stumps } = v.trees;
  wind.value = time;
  if (time < (v.trees.lastTime || 0)) v.trees.nextUpdate = -1;
  v.trees.lastTime = time;
  if (v.trees.lastStates !== states) {
    force = true;
    v.trees.lastStates = states;
  }
  if (states.some((t) => t.broken && time - t.fallenAt < 1.5)) force = true;
  if (!force && time < v.trees.nextUpdate) return;
  v.trees.nextUpdate = time + 0.3;
  const dummy = new THREE.Object3D();
  for (const { batch, level } of groups) {
    let count = 0;
    states.forEach((t, i) => {
      const d = Math.hypot(t.x - p.x, t.z - p.z);
      const near = v.trees.lowAsset ? 0 : (v.budget?.treeNear ?? 105),
        far = v.budget?.treeFar ?? 420;
      if (level === 0 ? d > near || near === 0 : d <= near || d > far) return;
      if (t.broken && time - t.fallenAt > 12) return;
      dummy.position.set(t.x, 0.18, t.z);
      const s = t.h / height;
      dummy.scale.set(
        s * (1.1 + (i % 4) * 0.08),
        s,
        s * (1.1 + (i % 3) * 0.08),
      );
      dummy.rotation.set(0, i * 2.399, 0);
      if (t.broken) {
        const age = Math.max(0, time - t.fallenAt),
          angle = Math.min(1.49, 0.12 + age * 2.8);
        dummy.quaternion.premultiply(
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(Math.cos(t.fallAngle), 0, -Math.sin(t.fallAngle)),
            angle,
          ),
        );
        if (age > 10)
          dummy.scale.multiplyScalar(Math.max(0.001, (12 - age) / 2));
      }
      dummy.updateMatrix();
      batch.setMatrixAt(count, dummy.matrix);
      if (batch.userData.leaves)
        batch.setColorAt(
          count,
          new THREE.Color().setHSL(
            0.23 + (i % 5) * 0.012,
            0.25 + (i % 3) * 0.04,
            0.75 + (i % 4) * 0.045,
          ),
        );
      count++;
    });
    batch.count = count;
    batch.instanceMatrix.needsUpdate = true;
    if (batch.instanceColor) batch.instanceColor.needsUpdate = true;
  }
  let count = 0;
  for (const t of states)
    if (
      t.broken &&
      Math.hypot(t.x - p.x, t.z - p.z) < (v.budget?.treeFar ?? 420)
    ) {
      dummy.position.set(t.x, 0.42, t.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      stumps.setMatrixAt(count++, dummy.matrix);
    }
  stumps.count = count;
  stumps.instanceMatrix.needsUpdate = true;
}
