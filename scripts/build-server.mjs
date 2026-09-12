import { build } from "esbuild";
import {
  mkdir,
  cp,
  readdir,
  copyFile,
  readFile,
  writeFile,
  rm,
  lstat,
} from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const project = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
if (path.resolve() !== project)
  throw Error("Run the build from the game project root");
const client = path.resolve(project, "dist/client");
// dist/ is authored source. Only this verified, generated child may be cleared.
if (
  path.dirname(client) !== path.resolve(project, "dist") ||
  path.basename(client) !== "client"
)
  throw Error("Unsafe build output");
const existing = await lstat(client).catch((e) => {
  if (e.code !== "ENOENT") throw e;
});
if (existing?.isSymbolicLink())
  throw Error("Refusing to clear a linked build directory");
await rm(client, { recursive: true, force: true });
await mkdir("dist/server", { recursive: true });
await mkdir(client, { recursive: true });
// Keep early reference/source assets in Git; they have no game-runtime references.
const sourceOnly = new Set([
  "asphalt.png",
  "old-tbilisi.png",
  "paint.png",
  "plane-tree.png",
  "ferrari.glb",
  "building.png",
  "city-reference.png",
]);
for (const file of await readdir("dist")) {
  if (!/\.(js|css|html)$/.test(file)) continue;
  const source = await readFile("dist/" + file, "utf8");
  for (const asset of sourceOnly)
    if (source.includes(asset))
      throw Error(`Cannot exclude ${asset}: referenced by ${file}`);
}
let excludedBytes = 0;
for (const entry of await readdir("dist/assets", { withFileTypes: true })) {
  if (sourceOnly.has(entry.name)) {
    excludedBytes += (await lstat("dist/assets/" + entry.name)).size;
    continue;
  }
  await cp("dist/assets/" + entry.name, "dist/client/assets/" + entry.name, {
    recursive: true,
  });
}
for (const file of [
  "credits.html",
  "manifest.webmanifest",
  "road-data.js",
  "road-surface-data.js",
])
  await copyFile("dist/" + file, "dist/client/" + file);
await mkdir("dist/client/vendor", { recursive: true });
await copyFile(
  "dist/vendor/THREE-LICENSE.txt",
  "dist/client/vendor/THREE-LICENSE.txt",
);
const js = await build({
  entryPoints: ["dist/main.js"],
  bundle: true,
  minify: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  splitting: true,
  metafile: true,
  outdir: "dist/client",
  entryNames: "app-[hash]",
  chunkNames: "chunk-[hash]",
  legalComments: "linked",
  plugins: [
    {
      name: "vendored-three",
      setup(build) {
        build.onResolve(
          { filter: /^three(?:\/addons\/.*)?$/ },
          ({ path: name }) => ({
            path: path.resolve(
              name === "three"
                ? "dist/vendor/three.module.js"
                : "dist/vendor/addons/" + name.slice(13),
            ),
          }),
        );
      },
    },
  ],
});
let html = await readFile("dist/index.html", "utf8");
const styles = [
  ...html.matchAll(/<link rel="stylesheet" href="\.\/([^\"]+)"\s*\/>/g),
].map((m) => m[1]);
const css = await build({
  stdin: {
    contents: styles.map((f) => `@import "./${f}";`).join("\n"),
    resolveDir: path.resolve("dist"),
    loader: "css",
  },
  bundle: true,
  minify: true,
  write: false,
  external: ["./assets/*"],
  outfile: "app.css",
});
const cssBytes = css.outputFiles[0].contents;
const cssName =
  "app-" +
  createHash("sha256").update(cssBytes).digest("hex").slice(0, 12) +
  ".css";
await writeFile(path.join(client, cssName), cssBytes);
const main = Object.entries(js.metafile.outputs).find(
  ([, v]) => v.entryPoint === "dist/main.js",
)[0];
html = html
  .replace(/\s*<link rel="stylesheet" href="[^\"]+"\s*\/>/g, "")
  .replace("</head>", `<link rel="stylesheet" href="./${cssName}" />\n</head>`)
  .replace(/\s*<script type="importmap">[\s\S]*?<\/script>/, " ")
  .replace('src="./main.js"', `src="./${path.basename(main)}"`);
await writeFile(path.join(client, "index.html"), html);
console.log(
  `Browser code: ${Object.values(js.metafile.outputs).reduce((n, o) => n + o.bytes, 0)} bytes; CSS: ${cssBytes.length} bytes. Excluded ${excludedBytes} bytes of source-only assets.`,
);
await build({
  entryPoints: ["server/worker.mjs"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: "dist/server/index.js",
});
await mkdir("dist/.openai", { recursive: true });
await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");
await cp("drizzle", "dist/.openai/drizzle", { recursive: true });
console.log("Worker, static game and database migrations are ready.");
