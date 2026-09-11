import * as THREE from "./vendor/three.module.js";
export function createExplosion(scene, event) {
  const group = new THREE.Group();
  group.position.set(event.x, 1, event.z);
  scene.add(group);
  const particles = [];
  for (let i = 0; i < 28; i++) {
    const smoke = i > 15,
      mesh = new THREE.Mesh(
        smoke
          ? new THREE.IcosahedronGeometry(0.6, 0)
          : new THREE.BoxGeometry(0.22, 0.22, 0.45),
        new THREE.MeshBasicMaterial({
          color: smoke ? "#3e4449" : i % 2 ? "#ffb538" : "#ff5120",
          transparent: true,
          opacity: 1,
          depthWrite: false,
        }),
      );
    const a = i * 2.399;
    const speed = smoke ? 2 : 5 + (i % 5);
    group.add(mesh);
    particles.push({
      mesh,
      vx: Math.cos(a) * speed,
      vz: Math.sin(a) * speed,
      vy: smoke ? 4 + (i % 4) : 3 + (i % 6),
      smoke,
    });
  }
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.MeshBasicMaterial({
      color: "#ffd478",
      transparent: true,
      opacity: 1,
      depthWrite: false,
    }),
  );
  group.add(flash);
  return { group, particles, flash, born: event.born };
}
export function animateExplosion(fx, time) {
  const age = time - fx.born;
  fx.flash.visible = age < 0.55;
  fx.flash.scale.setScalar(1 + age * 12);
  fx.flash.material.opacity = Math.max(0, 1 - age / 0.55);
  for (const p of fx.particles) {
    p.mesh.position.set(
      p.vx * age,
      p.vy * age - (p.smoke ? 0 : 4 * age * age),
      p.vz * age,
    );
    p.mesh.rotation.set(age * 4, age * 2, age * 3);
    p.mesh.scale.setScalar(p.smoke ? 1 + age * 3 : 1);
    p.mesh.material.opacity = Math.max(0, 1 - age / 2.2);
  }
}
export function disposeGroup(scene, group) {
  scene.remove(group);
  const materials = new Set(),
    textures = new Set();
  group.traverse((m) => {
    if (m.isMesh || m.isSprite) {
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
export function updatePatrolHealthBar(bar, health) {
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
  c.fillText("PATROL · " + hp + " HP", 128, 21);
  c.fillStyle = "#3a4a53";
  c.fillRect(10, 30, 236, 9);
  c.fillStyle = hp < 35 ? "#ff745e" : "#7ce6ce";
  c.fillRect(10, 30, (236 * hp) / 100, 9);
  bar.texture.needsUpdate = true;
}
