import test from "node:test";
globalThis.location = new URL("http://localhost/?map=kutaisi");
const { checkCornering } = await import("./cornering-check.mjs");
test(
  "Kutaisi: corner scrub and speed-dependent turning stay controlled across cars and frame rates",
  checkCornering,
);
