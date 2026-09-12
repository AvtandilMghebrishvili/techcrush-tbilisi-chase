// A shuffled three-level bag guarantees variety without giving different
// players different visibility on the same ranked course. No mutable RNG.
export function levelHash(value) {
  let x = (value + 0x6d2b79f5) | 0;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}
// Every new run starts at night; Auto completes the same full 180-second cycle.
export function levelCondition() {
  return { mode: "night", label: "NIGHT", offset: 0 };
}
