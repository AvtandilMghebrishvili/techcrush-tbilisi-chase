import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
test("all static module imports resolve locally, including transitive Three.js loaders", () => {
  const root = path.resolve("dist");
  for (const file of readdirSync(root, { recursive: true }).filter((f) =>
    f.endsWith(".js"),
  )) {
    const abs = path.join(root, file),
      source = readFileSync(abs, "utf8");
    for (const match of source.matchAll(
      /^\s*import[\s\S]*?from\s*['"]([^'"]+)['"]/gm,
    )) {
      const name = match[1];
      let target;
      if (name.startsWith(".")) target = path.resolve(path.dirname(abs), name);
      else if (name === "three")
        target = path.join(root, "vendor/three.module.js");
      else if (name.startsWith("three/addons/"))
        target = path.join(root, "vendor/addons", name.slice(13));
      else assert.fail(`Unexpected external module ${name} in ${file}`);
      assert(existsSync(target), `${file} imports missing ${name}`);
    }
  }
});
