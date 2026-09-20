import * as THREE from "./vendor/three.module.js";
import { AssetScope } from "./resource-lifetime.js";
import { fetchTreeModels } from "./trees.js";
import { fetchSportsAssets } from "./sports-car.js";
import { qualityLevel } from "./graphics-quality.js";

// Start the selected city's downloads before CPU geometry construction/profile I/O.
// No other city's models, persistent caches, speculative garage or audio downloads.
export function prepareSceneAssets(mobile, profile = {}) {
  const scope = new AssetScope(new THREE.LoadingManager());
  const loader = new THREE.TextureLoader(scope.manager);
  let completed = 0;
  scope.progress = () => {};
  const track = (p) =>
    p.then((value) => {
      scope.progress(
        12 + Math.round((++completed / 10) * 76),
        "LOADING CITY, CARS & TREES",
      );
      return value;
    });
  scope.profile = profile;
  let selected = "auto";
  try {
    selected =
      JSON.parse(localStorage.getItem("techcrush-mobile") || "{}").quality ||
      "auto";
  } catch {}
  const low = qualityLevel(selected, profile, mobile) === "low",
    texture = (name) =>
      low ? name.replace(/\.(png|jpg)$/i, "-low.webp") : name;
  scope.ready = Promise.all([
    ...[
      texture("road-day.png"),
      texture("limestone.png"),
      "techcrush-logo.jpg",
      "techcrush-wordmark.png",
      texture("hills-diff.jpg"),
      texture("hills-nor_gl.jpg"),
      low ? "robotics/robo-battle-low.webp" : "robotics/robo-battle.webp",
      low ? "grex/grex-low.webp" : "grex/grex.webp",
    ].map((name) => track(scope.track(loader.loadAsync("./assets/" + name)))),
    track(fetchTreeModels(low, scope)),
    track(fetchSportsAssets(scope)),
  ]).catch((error) => {
    scope.dispose();
    throw error;
  });
  // The world may still be building synchronously when an early request fails.
  scope.ready.catch(() => {});
  return scope;
}
