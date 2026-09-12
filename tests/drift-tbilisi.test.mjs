import test from "node:test";
import { checkDrift } from "./drift-check.mjs";
test(
  "Tbilisi: all cars and fused tires drift both ways, combine nitro, recover and re-enter",
  checkDrift,
);
