import test from "node:test";
globalThis.location = new URL("http://localhost/?map=kutaisi");
const { checkDrift } = await import("./drift-check.mjs");
test(
  "Kutaisi: all cars and fused tires drift both ways, combine nitro, recover and re-enter",
  checkDrift,
);
