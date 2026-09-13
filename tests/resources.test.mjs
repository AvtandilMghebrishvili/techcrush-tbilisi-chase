import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../dist/vendor/three.module.js";
import { AssetScope, releaseResources } from "../dist/resource-lifetime.js";
import { updateTrees } from "../dist/trees.js";

test("whole-world teardown disposes shared GPU resources once, including uniforms, instances and shadow targets", () => {
  const texture = new THREE.Texture(),
    geometry = new THREE.BoxGeometry();
  const material = new THREE.ShaderMaterial({
    uniforms: { image: { value: texture } },
  });
  const scene = new THREE.Scene(),
    shadow = new THREE.WebGLRenderTarget(16, 16);
  scene.environment = texture;
  scene.add(
    new THREE.Mesh(geometry, material),
    new THREE.Mesh(geometry, material),
  );
  const instanced = new THREE.InstancedMesh(geometry, material, 2);
  const light = new THREE.DirectionalLight();
  light.shadow.map = shadow;
  scene.add(instanced, light);
  const calls = new Map();
  for (const value of [texture, geometry, material, instanced, shadow])
    value.addEventListener("dispose", () =>
      calls.set(value, (calls.get(value) || 0) + 1),
    );
  const released = releaseResources([scene, shadow]);
  releaseResources([scene, shadow], released);
  assert.equal(calls.size, 5);
  assert([...calls.values()].every((count) => count === 1));
});

test("late loader completion cannot retain assets after page exit; cancellation is idempotent", async () => {
  let resolve,
    aborts = 0;
  const scope = new AssetScope({ abort: () => aborts++ });
  const texture = new THREE.Texture();
  let disposals = 0;
  texture.addEventListener("dispose", () => disposals++);
  const pending = scope.track(new Promise((r) => (resolve = r)));
  scope.dispose();
  scope.dispose();
  resolve(texture);
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(aborts, 1);
  assert.equal(disposals, 1);
  assert.equal(scope.values.length, 0);
});

test("garage teardown preserves borrowed geometry and HDR while releasing its own materials", () => {
  const geometry = new THREE.BoxGeometry(),
    hdr = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: hdr });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.sharedGeometry = true;
  const calls = [];
  for (const [name, object] of Object.entries({ geometry, hdr, material }))
    object.addEventListener("dispose", () => calls.push(name));
  releaseResources([mesh], new WeakSet(), {
    preserveShared: true,
    protectedTextures: [hdr],
  });
  assert.deepEqual(calls, ["material"]);
});

function treeFixture(lowAsset = false) {
  const states = Array.from({ length: 160 }, (_, i) => ({
    x: (i % 16) * 32 - 250,
    z: Math.floor(i / 16) * 32 - 160,
    h: 7 + (i % 5),
    broken: i % 11 === 0,
    fallenAt: 2,
    fallAngle: i * 0.3,
  }));
  return {
    treePositions: states,
    budget: { treeNear: 105, treeFar: 420 },
    trees: {
      height: 2,
      wind: { value: 0 },
      lowAsset,
      nextUpdate: -1,
      stumps: new THREE.InstancedMesh(
        new THREE.BoxGeometry(),
        new THREE.MeshBasicMaterial(),
        states.length,
      ),
      groups: [0, 0, 1, 1]
        .filter((level) => !lowAsset || level === 1)
        .map((level, i) => {
          const batch = new THREE.InstancedMesh(
            new THREE.BoxGeometry(),
            new THREE.MeshBasicMaterial(),
            states.length,
          );
          batch.userData.leaves = i % 2 === 0;
          return { level, batch };
        }),
    },
  };
}
export { treeFixture };

function expectedTree(t, i, time) {
  const m = new THREE.Object3D(),
    s = t.h / 2;
  m.position.set(t.x, 0.18, t.z);
  m.scale.set(s * (1.1 + (i % 4) * 0.08), s, s * (1.1 + (i % 3) * 0.08));
  m.rotation.y = i * 2.399;
  if (t.broken) {
    const age = Math.max(0, time - t.fallenAt);
    m.quaternion.premultiply(
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(Math.cos(t.fallAngle), 0, -Math.sin(t.fallAngle)),
        Math.min(1.49, 0.12 + age * 2.8),
      ),
    );
    if (age > 10) m.scale.multiplyScalar(Math.max(0.001, (12 - age) / 2));
  }
  m.updateMatrix();
  return new Float32Array(m.matrix.elements);
}
test("packed tree updates preserve exact LOD, poses, color, falling, despawn and rewind on both budgets", () => {
  for (const mobile of [false, true]) {
    const v = treeFixture(mobile),
      states = v.treePositions;
    for (const [time, x, z] of [
      [2, 0, 0],
      [2.3, 100, 0],
      [3, 300, 50],
      [13, 0, 0],
      [15, 0, 0],
      [2.1, 0, 0],
      [1, 0, 0],
    ]) {
      if (time === 1) for (const t of states) t.broken = false;
      updateTrees(v, { x, z }, time, states, true);
      for (const { batch, level } of v.trees.groups) {
        let count = 0;
        states.forEach((t, i) => {
          const d = Math.hypot(t.x - x, t.z - z),
            near = mobile ? 0 : 105;
          if (level === 0 ? d > near || !near : d <= near || d > 420) return;
          if (t.broken && time - t.fallenAt > 12) return;
          assert.deepEqual(
            batch.instanceMatrix.array.slice(count * 16, count * 16 + 16),
            expectedTree(t, i, time),
          );
          if (batch.userData.leaves) {
            const expected = new Float32Array(
              new THREE.Color()
                .setHSL(
                  0.23 + (i % 5) * 0.012,
                  0.25 + (i % 3) * 0.04,
                  0.75 + (i % 4) * 0.045,
                )
                .toArray(),
            );
            assert.deepEqual(
              batch.instanceColor.array.slice(count * 3, count * 3 + 3),
              expected,
            );
          }
          count++;
        });
        assert.equal(batch.count, count);
      }
      assert.equal(
        v.trees.stumps.count,
        states.filter((t) => t.broken && Math.hypot(t.x - x, t.z - z) < 420)
          .length,
      );
    }
  }
});
