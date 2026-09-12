import test from "node:test";
import { checkCornering } from "./cornering-check.mjs";
test(
  "Tbilisi: corner scrub and speed-dependent turning stay controlled across cars and frame rates",
  checkCornering,
);
