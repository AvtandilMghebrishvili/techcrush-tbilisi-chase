import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, weld, simplify, prune } from "@gltf-transform/functions";
import draco from "draco3dgltf";
import { MeshoptSimplifier } from "meshoptimizer";
await MeshoptSimplifier.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "draco3d.decoder": await draco.createDecoderModule(),
  });
const doc = await io.read("dist/assets/ferrari.glb");
for (const ext of doc.getRoot().listExtensionsUsed())
  if (ext.extensionName === "KHR_draco_mesh_compression") ext.dispose();
await doc.transform(
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.28, error: 0.012 }),
  prune(),
);
await io.write("dist/assets/sports-car.glb", doc);
let triangles = 0;
for (const mesh of doc.getRoot().listMeshes())
  for (const p of mesh.listPrimitives())
    triangles +=
      (p.getIndices()?.getCount() || p.getAttribute("POSITION").getCount()) / 3;
console.log("Sports car prepared:", triangles, "triangles; original 358788");
