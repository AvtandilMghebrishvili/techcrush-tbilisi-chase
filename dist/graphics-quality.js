export const GRAPHICS_LEVELS = ["auto", "low", "medium", "high", "ultra"];
export function normalizeQuality(value) {
  return value === "battery"
    ? "low"
    : GRAPHICS_LEVELS.includes(value)
      ? value
      : "auto";
}
export const QUALITY_PRESETS = {
  low: {
    pixels: 720000,
    ratio: 1,
    tier: "constrained",
    shadows: false,
    shadowSize: 512,
    treeNear: 0,
    treeFar: 230,
    treeHorizon: 1000,
    simpleTrees: true,
    buildingNear: 160,
    buildingLights: false,
    localLights: 0,
    lampEffects: 0,
    rainScale: 0.25,
    drawDistanceScale: 0.6,
    cameraFar: 2500,
    anisotropy: 2,
  },
  medium: {
    pixels: 1500000,
    ratio: 1.4,
    tier: "balanced",
    shadows: false,
    shadowSize: 1024,
    treeNear: 70,
    treeFar: 330,
    treeHorizon: 1200,
    simpleTrees: false,
    buildingNear: 360,
    buildingLights: true,
    localLights: 1,
    lampEffects: 24,
    rainScale: 0.5,
    drawDistanceScale: 0.8,
    cameraFar: 3400,
    anisotropy: 4,
  },
  high: {
    pixels: 2400000,
    ratio: 1.7,
    tier: "high",
    shadows: true,
    shadowSize: 1024,
    treeNear: 105,
    treeFar: 420,
    treeHorizon: 1500,
    simpleTrees: false,
    buildingNear: 700,
    buildingLights: true,
    localLights: 2,
    lampEffects: 48,
    rainScale: 1,
    drawDistanceScale: 1,
    cameraFar: 4800,
    anisotropy: 8,
  },
  ultra: {
    pixels: 3600000,
    ratio: 2,
    tier: "ultra",
    shadows: true,
    shadowSize: 2048,
    treeNear: 180,
    treeFar: 650,
    treeHorizon: 1900,
    simpleTrees: false,
    buildingNear: 1200,
    buildingLights: true,
    localLights: 3,
    lampEffects: 64,
    rainScale: 1,
    drawDistanceScale: 1.15,
    cameraFar: 5600,
    anisotropy: 16,
  },
};
export function qualityLevel(mode, profile = {}, mobile = false) {
  mode = normalizeQuality(mode);
  if (mode !== "auto") return mode;
  const tier = profile.tier || (mobile ? "constrained" : "high");
  return tier === "constrained"
    ? "low"
    : tier === "balanced"
      ? "medium"
      : "high";
}
export const QUALITY_HELP = {
  auto: "Adjusts to your device. Resolution adapts during play; nearby objects remain detailed.",
  low: "Simple trees and distant buildings · building lights and shadows off · lighter effects. Best for slower computers.",
  medium:
    "Detailed objects nearby · simple distant scenery · building lights on · shadows off.",
  high: "Longer detail distance · detailed trees · shadows and city lights on.",
  ultra:
    "Longest detail distance · highest tree detail, sharper shadows and resolution · full city lighting.",
};
