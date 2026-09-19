import * as THREE from "./vendor/three.module.js";
import { AssetScope } from "./resource-lifetime.js";
import { fetchTreeModels } from "./trees.js";
import { fetchSportsAssets } from "./sports-car.js";

// Start the selected city's downloads before CPU geometry construction/profile I/O.
// No other city's models, persistent caches, speculative garage or audio downloads.
export function prepareSceneAssets(mobile) {
  const scope = new AssetScope(new THREE.LoadingManager());
  const loader = new THREE.TextureLoader(scope.manager);
  let completed = 0;
  scope.progress = () => {};
  const track = (p) =>
    p.then((value) => {
      scope.progress(
        12 + Math.round((++completed / 9) * 76),
        "LOADING CITY, CARS & TREES",
      );
      return value;
    });
  scope.ready = Promise.all([
    ...[
      "road-day.png",
      "limestone.png",
      "techcrush-logo.jpg",
      "techcrush-wordmark.png",
      "hills-diff.jpg",
      "hills-nor_gl.jpg",
      "robotics/robo-battle.webp",
    ].map((name) => track(scope.track(loader.loadAsync("./assets/" + name)))),
    track(fetchTreeModels(mobile, scope)),
    track(fetchSportsAssets(scope)),
  ]).catch((error) => {
    scope.dispose();
    throw error;
  });
  // The world may still be building synchronously when an early request fails.
  scope.ready.catch(() => {});
  return scope;
}
