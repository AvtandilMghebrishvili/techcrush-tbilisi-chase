import { PARTS, upgradedSpec } from "./progression.js";
export function partArtwork(part, extraClass = "", tier = 1) {
  const index = PARTS.findIndex((p) => p.id === part.id);
  return `<div class="part-art ${extraClass}" data-art-part="${part.id}" data-art-tier="${tier}" role="img" aria-label="${["Stock", "Bronze", "Silver", "Gold", "Diamond", "Platinum"][tier]} ${part.name} assembly" style="--art-x:${((index % 4) / 3) * 100}%;--art-y:${(Math.floor(index / 4) / 3) * 100}%"></div>`;
}
export const PART_DETAILS = {
  engine:
    "Rebuilt cylinders and freer breathing raise the speed ceiling and accelerate the car harder whenever you press the throttle.",
  ecu: "Recalibrated throttle and ignition increase acceleration. Reach the same top speed sooner after a corner.",
  turbo:
    "A larger compressor adds acceleration and a higher speed ceiling while turbo is active. It does not lengthen the nitro supply.",
  tank: "More nitro capacity reduces consumption per second. Hold turbo longer before the tank runs empty.",
  cooler:
    "Improved cooling replenishes nitro faster and shortens the recovery delay after releasing turbo.",
  gearbox:
    "Shorter, lighter gearing improves normal acceleration and raises the speed ceiling.",
  tires:
    "Touring tread becomes sport tread, semi-slicks and finally track slicks. Grip and steering response increase; the tire radius stays consistent.",
  rims: "Lighter forged wheels improve acceleration and top speed. Each tier has a different spoke pattern and metallic finish.",
  spoiler:
    "A larger rear wing improves steering response and the speed ceiling. Higher tiers add end plates and a double-element Diamond wing.",
  brakes:
    "Upgraded calipers and drilled discs increase braking force, helping you slow down sooner before tight corners.",
  armor:
    "Reinforcement reduces collision damage. The percentage shown is the reduction compared with your current build, not extra HP.",
  suspension:
    "Improved damping reduces hard-landing damage and sharpens steering response. It does not remove collision damage.",
  exhaust:
    "A freer-flowing exhaust raises top speed and turbo acceleration. The comparison shows performance; the installed exhaust outlet layout is retained.",
  weight:
    "Lightweight body panels reduce mass in the performance model, improving acceleration and the speed ceiling.",
};
export function comparisonRows(
  base,
  equipment,
  part,
  tier,
  stars = equipment.stars?.[part.id] || 0,
) {
  const before = upgradedSpec(base, equipment),
    after = upgradedSpec(base, {
      ...equipment,
      [part.id]: tier,
      stars: { ...equipment.stars, [part.id]: stars },
    });
  const descriptors = {
    topSpeed: ["Top speed", "km/h", (s) => s.topSpeed * 3.6, 430],
    acceleration: ["Acceleration", "m/s²", (s) => s.acceleration, 65],
    boostSpeed: [
      "Speed with turbo",
      "km/h",
      (s) => (s.topSpeed + s.boostSpeed) * 3.6,
      540,
    ],
    boostPower: ["Turbo acceleration", "m/s²", (s) => s.boostPower, 48],
    nitroDrain: ["Turbo duration", "s", (s) => 100 / s.nitroDrain, 7],
    nitroRegen: ["Nitro recharge", "%/s", (s) => s.nitroRegen, 18],
    boostDelay: ["Recharge delay", "s", (s) => s.boostDelay, 1, true],
    handling: ["Steering response", "%", (s) => s.handling * 100, 190],
    grip: ["Tire grip", "", (s) => s.grip, 12],
    braking: ["Braking force", "m/s²", (s) => s.braking, 50],
    protection: [
      "Impact damage received",
      "%",
      (s) => s.damageScale * 100,
      100,
      true,
    ],
    landingProtection: [
      "Landing damage received",
      "%",
      (s) => s.landingScale * 100,
      100,
      true,
    ],
  };
  return Object.keys(part.stats).map((key) => {
    const [label, unit, read, max, lower] = descriptors[key];
    return {
      key,
      label,
      unit,
      before: read(before),
      after: read(after),
      max,
      lower: !!lower,
    };
  });
}
export const partCategory = (id) =>
  ["tires", "brakes", "suspension"].includes(id)
    ? "handling"
    : ["rims", "spoiler", "armor", "weight"].includes(id)
      ? "body"
      : "power";
export function upgradeBenefits(
  base,
  equipment,
  part,
  tier,
  stars = equipment.stars?.[part.id] || 0,
) {
  const before = upgradedSpec(base, equipment),
    after = upgradedSpec(base, {
      ...equipment,
      [part.id]: tier,
      stars: { ...equipment.stars, [part.id]: stars },
    });
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
      `+${n((after.handling - before.handling) * 100)} steering-response points`,
    grip: () => `+${n(after.grip - before.grip, 2)} tire grip`,
    braking: () => `+${n(after.braking - before.braking)} m/s² braking`,
    protection: () =>
      `${n((1 - after.damageScale / before.damageScale) * 100)}% less impact damage`,
    landingProtection: () =>
      `${n((1 - after.landingScale / before.landingScale) * 100)}% softer landings`,
  };
  return Object.keys(part.stats).map((k) => labels[k]());
}
