import { PARTS, upgradedSpec } from "./progression.js";
export function partArtwork(part, extraClass = "") {
  const index = PARTS.findIndex((p) => p.id === part.id);
  return `<div class="part-art ${extraClass}" role="img" aria-label="${part.name} performance part" style="--art-x:${((index % 4) / 3) * 100}%;--art-y:${(Math.floor(index / 4) / 3) * 100}%"></div>`;
}
export const partCategory = (id) =>
  ["tires", "brakes", "suspension"].includes(id)
    ? "handling"
    : ["rims", "spoiler", "armor", "weight"].includes(id)
      ? "body"
      : "power";
export function upgradeBenefits(base, equipment, part, tier) {
  const before = upgradedSpec(base, equipment),
    after = upgradedSpec(base, { ...equipment, [part.id]: tier });
  const n = (value, digits = 1) => Number(value.toFixed(digits));
  const labels = {
    topSpeed: () =>
      `+${n((after.topSpeed - before.topSpeed) * 3.6)} km/h top speed`,
    acceleration: () =>
      `+${n(after.acceleration - before.acceleration)} m/s² acceleration`,
    boostSpeed: () =>
      `+${n((after.boostSpeed - before.boostSpeed) * 3.6)} km/h on turbo`,
    boostPower: () =>
      `+${n(after.boostPower - before.boostPower)} turbo thrust`,
    nitroDrain: () =>
      `+${n(100 / after.nitroDrain - 100 / before.nitroDrain, 2)} sec turbo duration`,
    nitroRegen: () =>
      `+${n(after.nitroRegen - before.nitroRegen)} charge/sec recharge`,
    boostDelay: () =>
      `${n(before.boostDelay - after.boostDelay, 2)} sec faster recovery`,
    handling: () =>
      `+${n((after.handling - before.handling) * 100)}% steering response`,
    grip: () => `+${n(after.grip - before.grip, 2)} tire grip`,
    braking: () => `+${n(after.braking - before.braking)} m/s² braking`,
    protection: () =>
      `${n((1 - after.damageScale / before.damageScale) * 100)}% less impact damage`,
    landingProtection: () =>
      `${n((1 - after.landingScale / before.landingScale) * 100)}% softer landings`,
  };
  return Object.keys(part.stats).map((k) => labels[k]());
}
