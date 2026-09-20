import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../dist/vendor/three.module.js";
import { detachStaticMeshes } from "../dist/static-detach.js";
import {
  batchStatic,
  updateDistanceCulledStatic,
} from "../dist/expansion-visuals.js";
import { compileScene } from "../dist/compile-scene.js";
test("bulk mesh detachment preserves parent/child events, sibling order and dynamic groups", () => {
  const root = new THREE.Group(),
    nested = new THREE.Group();
  root.add(nested);
  const objects = Array.from({ length: 2000 }, () => new THREE.Object3D());
  root.add(...objects);
  const sub = new THREE.Object3D();
  nested.add(sub);
  let removed = 0,
    parentEvents = 0;
  objects.forEach((o) => o.addEventListener("removed", () => removed++));
  root.addEventListener("childremoved", () => parentEvents++);
  const gone = objects.filter((_, i) => i % 3 !== 0);
  detachStaticMeshes([...gone, sub]);
  assert.deepEqual(root.children, [
    nested,
    ...objects.filter((_, i) => i % 3 === 0),
  ]);
  assert.equal(removed, gone.length);
  assert.equal(parentEvents, gone.length);
  assert(gone.every((o) => o.parent === null));
  assert.equal(sub.parent, null);
});
test("static batching retains transformed vertices and skips animated subtrees", () => {
  const root = new THREE.Group(),
    material = new THREE.MeshStandardMaterial();
  const a = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 4), material);
  a.position.set(4, 8, 9);
  a.rotation.y = 0.7;
  const b = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 7), material);
  b.position.set(12, 2, 10);
  const moving = new THREE.Group();
  moving.userData.dynamic = true;
  const child = new THREE.Mesh(new THREE.BoxGeometry(), material);
  moving.add(child);
  root.add(a, b, moving);
  root.updateMatrixWorld(true);
  const expected = [a, b].flatMap((m) =>
    Array.from(
      m.geometry.toNonIndexed().applyMatrix4(m.matrixWorld).attributes.position
        .array,
    ),
  );
  batchStatic(root);
  assert.equal(moving.parent, root);
  assert.equal(child.parent, moving);
  const merged = root.children.find((o) => o.isMesh);
  assert.equal(merged.userData.maxDrawDistance, 3000);
  root.updateMatrixWorld(true);
  const actual = merged.geometry.clone().applyMatrix4(merged.matrixWorld)
    .attributes.position.array;
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < actual.length; i++)
    assert(
      Math.abs(actual[i] - expected[i]) < 0.00003,
      "batch must preserve world coordinates",
    );
  assert.equal(root.children.length, 2);
});
test("distance-cull batches keep full geometry and swap only very distant tiles", () => {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial();
  const near = new THREE.Mesh(new THREE.BoxGeometry(20, 40, 20), material);
  const far = near.clone();
  near.position.set(0, 20, 0);
  far.position.set(1200, 20, 0);
  root.add(near, far);
  batchStatic(root, 100, { maxDrawDistance: 400, lowScale: 0.75 });
  const batches = root.children.filter((o) => o.isMesh);
  assert.equal(batches.length, 2);
  assert(batches.every((m) => m.geometry.attributes.position.count > 0));
  assert.equal(updateDistanceCulledStatic(batches, { x: 0, z: 0 }), 1);
  assert.equal(batches.filter((m) => m.visible).length, 1);
  assert.equal(updateDistanceCulledStatic(batches, { x: 1200, z: 0 }), 1);
  assert.equal(batches.filter((m) => m.visible).length, 1);
});
function fixture() {
  let id = 0;
  const tasks = new Map(),
    programs = [
      {
        ready: false,
        isReady() {
          return this.ready;
        },
      },
    ];
  const renderer = {
    compile: () => new Set([{}]),
    properties: { get: () => ({ currentProgram: programs[0] }) },
    domElement: new EventTarget(),
    getContext: () => ({ isContextLost: () => false }),
  };
  const timers = {
    setTimeout(fn) {
      tasks.set(++id, fn);
      return id;
    },
    clearTimeout(n) {
      tasks.delete(n);
    },
  };
  const step = () => {
    const list = [...tasks.values()];
    tasks.clear();
    list.forEach((fn) => fn());
  };
  return { renderer, timers, programs, tasks, step };
}
test("shader warm-up cancels its polling before a renderer is disposed", async () => {
  const f = fixture(),
    life = new AbortController();
  const result = compileScene(f.renderer, {}, {}, life.signal, f.timers);
  f.step();
  assert.equal(f.tasks.size, 1);
  life.abort();
  await assert.rejects(result, { name: "AbortError" });
  assert.equal(f.tasks.size, 0);
});
test("shader warm-up completes without a remaining timeout and rejects lost contexts", async () => {
  const f = fixture(),
    life = new AbortController();
  const result = compileScene(f.renderer, {}, {}, life.signal, f.timers);
  f.programs[0].ready = true;
  f.step();
  await result;
  assert.equal(f.tasks.size, 0);
  const g = fixture(),
    pending = compileScene(g.renderer, {}, {}, life.signal, g.timers);
  g.renderer.domElement.dispatchEvent(new Event("webglcontextlost"));
  await assert.rejects(pending, /Graphics context lost/);
  assert.equal(g.tasks.size, 0);
});
