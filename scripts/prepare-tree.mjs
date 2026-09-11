// Poly Haven Tree Small 02, Rico Cilliers, CC0. Original assets stay in an ignored cache.
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, weld, simplify, prune } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
const cache = ".sites-runtime/tree-source";
await mkdir(cache, { recursive: true });
const manifest = await (
  await fetch("https://api.polyhaven.com/files/tree_small_02")
).json();
const source = manifest.gltf["1k"].gltf;
await writeFile(
  "data/tree-source.json",
  JSON.stringify(
    { asset: "tree_small_02", author: "Rico Cilliers", license: "CC0", source },
    null,
    2,
  ),
);
const files = { "tree.gltf": source, ...source.include };
await Promise.all(
  Object.entries(files).map(async ([name, f]) => {
    const dest = path.join(cache, name);
    try {
      await access(dest);
      return;
    } catch {}
    const response = await fetch(f.url);
    if (!response.ok) throw Error(`${response.status}: ${name}`);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, new Uint8Array(await response.arrayBuffer()));
  }),
);
console.log("Tree source downloaded");
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(path.join(cache, "tree.gltf"));
const count = () =>
  doc
    .getRoot()
    .listMeshes()
    .reduce(
      (n, m) =>
        n +
        m
          .listPrimitives()
          .reduce(
            (v, p) =>
              v +
              (p.getIndices()?.getCount() ||
                p.getAttribute("POSITION").getCount()) /
                3,
            0,
          ),
      0,
    );
console.log("Original triangles:", count());
await doc.transform(
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.06, error: 0.15 }),
  prune(),
);
console.log("Near tree triangles:", count());
// Enlarge retained leaf islands to preserve canopy coverage after polygon reduction.
function growLeaves(factor) {
  for (const mesh of doc.getRoot().listMeshes())
    for (const primitive of mesh.listPrimitives()) {
      if (!primitive.getMaterial()?.getName().includes("leaves")) continue;
      const position = primitive.getAttribute("POSITION"),
        array = position.getArray(),
        indices = primitive.getIndices().getArray();
      const parent = Int32Array.from(
        { length: position.getCount() },
        (_, i) => i,
      );
      const root = (i) => {
        while (parent[i] !== i) {
          parent[i] = parent[parent[i]];
          i = parent[i];
        }
        return i;
      };
      for (let i = 0; i < indices.length; i += 3) {
        const a = root(indices[i]);
        parent[root(indices[i + 1])] = a;
        parent[root(indices[i + 2])] = a;
      }
      const centers = new Map();
      for (let i = 0; i < parent.length; i++) {
        const id = root(i);
        if (!centers.has(id)) centers.set(id, [0, 0, 0, 0]);
        const c = centers.get(id);
        for (let k = 0; k < 3; k++) c[k] += array[i * 3 + k];
        c[3]++;
      }
      for (let i = 0; i < parent.length; i++) {
        const c = centers.get(root(i));
        for (let k = 0; k < 3; k++) {
          const center = c[k] / c[3];
          array[i * 3 + k] = center + (array[i * 3 + k] - center) * factor;
        }
      }
    }
}
growLeaves(1.5);
await io.write("dist/assets/tree-near.glb", doc);
await doc.transform(
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.17, error: 0.4 }),
  prune(),
);
console.log("Distant tree triangles:", count());
growLeaves(1.25);
await io.write("dist/assets/tree-far.glb", doc);
