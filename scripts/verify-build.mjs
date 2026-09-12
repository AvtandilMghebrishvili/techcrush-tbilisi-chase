import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist/client");
const local = async (url, parent) => {
  if (/^(?:[a-z]+:|\/\/|#)/i.test(url)) return;
  const file = path.resolve(parent, url.split(/[?#]/)[0]);
  assert(
    file === root || file.startsWith(root + path.sep),
    `Link escapes client: ${url}`,
  );
  const info = await stat(file);
  if (info.isDirectory()) await stat(path.join(file, "index.html"));
};
for (const name of await readdir(root)) {
  const file = path.join(root, name),
    parent = path.dirname(file);
  if (name.endsWith(".html")) {
    const html = await readFile(file, "utf8");
    for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g))
      await local(m[1], parent);
  }
  if (name.endsWith(".css")) {
    const css = await readFile(file, "utf8");
    for (const m of css.matchAll(/url\(["']?([^"')]+)["']?\)/g))
      await local(m[1], parent);
  }
}
const manifest = JSON.parse(
  await readFile(path.join(root, "manifest.webmanifest"), "utf8"),
);
for (const icon of manifest.icons || []) await local(icon.src, root);
let assetBytes = 0,
  assets = 0;
for (const name of await readdir(path.join(root, "assets"), {
  recursive: true,
})) {
  const file = path.join(root, "assets", name);
  if (!(await stat(file)).isFile()) continue;
  const built = await readFile(file),
    source = await readFile(path.join("dist/assets", name));
  assert(built.equals(source), `Runtime art/model/audio was altered: ${name}`);
  assets++;
  assetBytes += built.length;
}
const html = await readFile(path.join(root, "index.html"), "utf8");
assert(!html.includes('src="./main.js"'));
assert(!html.includes('type="importmap"'));
for (const name of await readdir(root))
  if (name.endsWith(".js"))
    assert(
      !(await readFile(path.join(root, name), "utf8")).includes(
        "globalThis.qa",
      ),
    );
console.log(
  `Production links resolve; ${assets} runtime assets (${assetBytes} bytes) are byte-identical to source. No QA globals or obsolete module entry.`,
);
