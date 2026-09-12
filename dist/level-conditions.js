// A shuffled three-level bag guarantees variety without giving different
// players different visibility on the same ranked course. No mutable RNG.
export function levelHash(value) {
  let x = (value + 0x6d2b79f5) | 0;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}
export function levelCondition(level = 1) {
  level = Math.max(1, Math.floor(level));
  const bag = ["dawn", "night", "day"];
  const block = Math.floor((level - 1) / 3);
  if (block) {
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(levelHash(block * 13 + i) * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  const mode = bag[(level - 1) % 3];
  return {
    mode,
    label: mode.toUpperCase(),
    offset: { dawn: 0, night: 175, day: 45 }[mode],
  };
}
