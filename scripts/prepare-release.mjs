import { cp, mkdir, rm, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// This legacy game authors files in dist/. Sites' general packager copies that
// whole directory, so give it an isolated checkout containing only build output.
const project = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
if (path.resolve() !== project) throw Error("Run from the game project root");
const stage = path.resolve(project, ".sites-runtime/release-stage");
if (
  path.dirname(stage) !== path.join(project, ".sites-runtime") ||
  path.basename(stage) !== "release-stage"
)
  throw Error("Unsafe release staging path");
await mkdir(path.dirname(stage), { recursive: true });
for (const directory of [path.dirname(stage), stage]) {
  const info = await lstat(directory).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  if (info?.isSymbolicLink())
    throw Error("Refusing a linked release directory");
}
await rm(stage, { recursive: true, force: true });
await mkdir(path.join(stage, ".openai"), { recursive: true });
await cp(
  path.join(project, ".openai/hosting.json"),
  path.join(stage, ".openai/hosting.json"),
);
for (const directory of ["client", "server", ".openai"])
  await cp(
    path.join(project, "dist", directory),
    path.join(stage, "dist", directory),
    { recursive: true },
  );
console.log(stage);
