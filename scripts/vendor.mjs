import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
await mkdir("dist/vendor", { recursive: true });
for (const file of ["three.module.js", "three.core.js"])
  await copyFile("node_modules/three/build/" + file, "dist/vendor/" + file);
await copyFile("node_modules/three/LICENSE", "dist/vendor/THREE-LICENSE.txt");
for (const file of [
  "loaders/GLTFLoader.js",
  "loaders/HDRLoader.js",
  "utils/BufferGeometryUtils.js",
]) {
  const dest = "dist/vendor/addons/" + file;
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile("node_modules/three/examples/jsm/" + file, dest);
}
