import { IS_BATUMI } from "./map-selection.js";
import * as THREE from "./vendor/three.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { simpleTree } from "./simple-tree.js";
export async function fetchTreeModels(mobile, scope) {
  const loader = new GLTFLoader(scope.manager);
  return IS_BATUMI
    ? [await scope.track(import("./palm-model.js").then((m) => m.palmModel()))]
    : await Promise.all(
        (mobile ? ["tree-far.glb"] : ["tree-near.glb", "tree-far.glb"]).map(
          (n) => scope.track(loader.loadAsync("./assets/" + n)),
        ),
      );
}
export async function loadTrees(v, models) {
  models ||= await fetchTreeModels(v.mobile, v.assetLoad);
  const near = models[0],
    far = models[1] || models[0];
  const bounds = new THREE.Box3().setFromObject(near.scene),
    height = bounds.max.y - bounds.min.y;
  const materials = new Map(),
    groups = [];
  const wind = { value: 0 };
  v.trees = {
    groups,
    height,
    wind,
    materials,
    lowAsset: models.length < 2 && !IS_BATUMI,
    hasSimple: true,
    nextUpdate: -1,
  };
  for (const [level, gltf] of [
    near,
    far,
    simpleTree(height, IS_BATUMI),
  ].entries()) {
    if (v.trees.lowAsset && level === 0) continue;
    addTreeModel(v, gltf, level);
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
  v.trees.stumps = stumps;
  updateTrees(v, { x: 0, z: 0 }, 0, v.treePositions, true);
}
function addTreeModel(v, gltf, level) {
  const { height, materials, groups, wind } = v.trees;
  gltf.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(gltf.scene),
    scale = height / Math.max(0.001, bounds.max.y - bounds.min.y);
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
      if (level < 2)
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
    geometry.translate(0, -bounds.min.y, 0).scale(scale, scale, scale);
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
export async function ensureDetailedTrees(v) {
  if (!v.trees?.lowAsset || v.budget.treeNear <= 0 || v.trees.detailPending)
    return;
  v.trees.detailPending = true;
  try {
    const model = await v.assetLoad.track(
      new GLTFLoader(v.assetLoad.manager).loadAsync("./assets/tree-near.glb"),
    );
    if (v.disposed) return;
    addTreeModel(v, model, 0);
    v.trees.lowAsset = false;
    v.trees.nextUpdate = -1;
  } catch {
    // Keep the existing far/simple trees visible if an optional detail download fails.
  } finally {
    if (v.trees) v.trees.detailPending = false;
  }
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
  wind.value = v.budget?.simpleTrees ? 0 : time;
  if (time < (v.trees.lastTime || 0)) v.trees.nextUpdate = -1;
  v.trees.lastTime = time;
  if (v.trees.lastStates !== states) {
    force = true;
    v.trees.lastStates = states;
  }
  if (states.some((t) => t.broken && time - t.fallenAt < 1.5)) force = true;
  if (!force && time < v.trees.nextUpdate) return;
  v.trees.nextUpdate = time + 0.3;
  // A tree's pose/color is shared by its bark/leaf submeshes. Build it once,
  // classify distance once, then copy the same packed data into each LOD batch.
  let work = v.trees.work;
  if (!work || work.states !== states) {
    work = v.trees.work = {
      states,
      dummy: new THREE.Object3D(),
      axis: new THREE.Vector3(),
      fall: new THREE.Quaternion(),
      color: new THREE.Color(),
      matrices: new Float32Array(states.length * 16),
      colors: new Float32Array(states.length * 3),
      levels: new Int8Array(states.length),
    };
    states.forEach((t, i) => {
      treePose(work.dummy, t, i, height);
      work.dummy.updateMatrix();
      work.dummy.matrix.toArray(work.matrices, i * 16);
      work.color
        .setHSL(
          0.23 + (i % 5) * 0.012,
          0.25 + (i % 3) * 0.04,
          0.75 + (i % 4) * 0.045,
        )
        .toArray(work.colors, i * 3);
    });
  }
  const { dummy, axis, fall, matrices, colors, levels } = work;
  const near = v.trees.lowAsset ? 0 : (v.budget?.treeNear ?? 105),
    far = v.budget?.treeFar ?? 420,
    horizon = v.trees.hasSimple ? (v.budget?.treeHorizon ?? far) : far,
    nearSq = near * near,
    farSq = far * far,
    horizonSq = horizon * horizon;
  let stumpCount = 0;
  for (let i = 0; i < states.length; i++) {
    const t = states[i],
      dx = t.x - p.x,
      dz = t.z - p.z,
      d = dx * dx + dz * dz;
    levels[i] =
      d > horizonSq
        ? -1
        : v.trees.hasSimple && (v.budget?.simpleTrees || d > farSq)
          ? 2
          : near > 0 && d <= nearSq
            ? 0
            : 1;
    if (t.broken) {
      const age = Math.max(0, time - t.fallenAt);
      if (age > 12) levels[i] = -1;
      else if (levels[i] >= 0) {
        treePose(dummy, t, i, height);
        axis.set(Math.cos(t.fallAngle), 0, -Math.sin(t.fallAngle));
        dummy.quaternion.premultiply(
          fall.setFromAxisAngle(axis, Math.min(1.49, 0.12 + age * 2.8)),
        );
        if (age > 10)
          dummy.scale.multiplyScalar(Math.max(0.001, (12 - age) / 2));
        dummy.updateMatrix();
        dummy.matrix.toArray(matrices, i * 16);
      }
      if (d < farSq) {
        dummy.position.set(t.x, 0.42, t.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        stumps.setMatrixAt(stumpCount++, dummy.matrix);
      }
    } else if (work.broken?.[i]) {
      // Rewind can restore an intact tree without changing the states array.
      treePose(dummy, t, i, height);
      dummy.updateMatrix();
      dummy.matrix.toArray(matrices, i * 16);
    }
  }
  work.broken ||= new Uint8Array(states.length);
  for (let i = 0; i < states.length; i++)
    work.broken[i] = states[i].broken ? 1 : 0;
  for (const { batch, level } of groups) {
    let count = 0;
    if (batch.userData.leaves && !batch.instanceColor)
      batch.setColorAt(0, work.color.setRGB(1, 1, 1));
    const out = batch.instanceMatrix.array,
      colorOut = batch.instanceColor?.array;
    for (let i = 0; i < states.length; i++) {
      if (levels[i] !== level) continue;
      for (let j = 0; j < 16; j++) out[count * 16 + j] = matrices[i * 16 + j];
      if (batch.userData.leaves)
        for (let j = 0; j < 3; j++) colorOut[count * 3 + j] = colors[i * 3 + j];
      count++;
    }
    batch.count = count;
    if (count) {
      batch.instanceMatrix.clearUpdateRanges();
      batch.instanceMatrix.addUpdateRange(0, count * 16);
      batch.instanceMatrix.needsUpdate = true;
      if (batch.instanceColor) {
        batch.instanceColor.clearUpdateRanges();
        batch.instanceColor.addUpdateRange(0, count * 3);
        batch.instanceColor.needsUpdate = true;
      }
    }
  }
  stumps.count = stumpCount;
  stumps.instanceMatrix.needsUpdate = true;
}
function treePose(dummy, t, i, height) {
  dummy.position.set(t.x, 0.18, t.z);
  const s = t.h / height;
  dummy.scale.set(s * (1.1 + (i % 4) * 0.08), s, s * (1.1 + (i % 3) * 0.08));
  dummy.rotation.set(0, i * 2.399, 0);
}
