import * as THREE from "./vendor/three.module.js";
export {
  createExplosion,
  animateExplosion,
  createImpactBurst,
  animateImpactBurst,
} from "./crash-effects.js";
export function disposeGroup(scene, group) {
  scene.remove(group);
  const materials = new Set(),
    textures = new Set();
  group.traverse((m) => {
    if (m.isMesh || m.isSprite || m.isLine) {
      if (!m.userData.sharedGeometry) m.geometry?.dispose();
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
        materials.add(mat);
        if (mat.map && mat.map.userData.disposable) textures.add(mat.map);
      }
    }
  });
  for (const m of materials) m.dispose();
  for (const t of textures) t.dispose();
}
export function makePatrolHealthBar() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 48;
  const texture = new THREE.CanvasTexture(canvas);
  texture.userData.disposable = true;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: true }),
  );
  sprite.position.y = 3.4;
  sprite.scale.set(4.5, 0.84, 1);
  return { canvas, texture, sprite, previous: -1 };
}
export function updatePatrolHealthBar(
  bar,
  health,
  maxHealth = 100,
  kind = "sedan",
) {
  const hp = Math.ceil(health);
  if (hp === bar.previous) return;
  bar.previous = hp;
  const c = bar.canvas.getContext("2d");
  c.clearRect(0, 0, 256, 48);
  c.fillStyle = "#091923e8";
  c.fillRect(0, 0, 256, 48);
  c.fillStyle = "#dce6e9";
  c.font = "bold 20px sans-serif";
  c.textAlign = "center";
  c.fillText(
    (kind === "tank" ? "TANK" : kind === "suv" ? "SUV" : "PATROL") +
      " · " +
      hp +
      " HP",
    128,
    21,
  );
  c.fillStyle = "#3a4a53";
  c.fillRect(10, 30, 236, 9);
  c.fillStyle = hp < 35 ? "#ff745e" : "#7ce6ce";
  c.fillRect(10, 30, (236 * Math.min(hp, maxHealth)) / maxHealth, 9);
  bar.texture.needsUpdate = true;
}
