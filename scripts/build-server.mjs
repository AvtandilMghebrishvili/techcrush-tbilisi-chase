import { build } from "esbuild";
import { mkdir, cp, readdir, copyFile } from "node:fs/promises";
await mkdir("dist/server", { recursive: true });
await mkdir("dist/client", { recursive: true });
for (const entry of await readdir("dist", { withFileTypes: true })) {
  if (["client", "server", ".openai"].includes(entry.name)) continue;
  await cp("dist/" + entry.name, "dist/client/" + entry.name, {
    recursive: true,
  });
}
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
