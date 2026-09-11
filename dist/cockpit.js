import * as THREE from "./vendor/three.module.js";
export function makeCockpit() {
  const root = new THREE.Group();
  root.visible = false;
  const material = new THREE.MeshBasicMaterial({ color: "#14202a" }),
    trim = new THREE.MeshBasicMaterial({ color: "#697a80" });
  function box(w, h, d, x, y, z, m = material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  }
  box(2.9, 0.55, 0.55, 0, -0.95, -1.18);
  box(2.9, 0.06, 0.58, 0, -0.65, -1.16, trim);
  for (const side of [-1, 1]) {
    const pillar = box(0.085, 1.7, 0.09, side * 1.14, 0.05, -1.28);
    pillar.rotation.z = side * 0.16;
  }
  box(2.55, 0.12, 0.16, 0, 0.85, -1.28);
  box(0.48, 0.17, 0.1, 0.22, 0.62, -1.05);
  box(0.025, 0.17, 0.025, 0.22, 0.79, -1.05, trim);
  const wheel = new THREE.Group();
  wheel.position.set(-0.43, -0.43, -1.05);
  root.add(wheel);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.036, 8, 32), trim));
  const hub = new THREE.Mesh(new THREE.CircleGeometry(0.085, 16), material);
  hub.position.z = 0.01;
  wheel.add(hub);
  for (const angle of [0, Math.PI * 0.67, Math.PI * 1.33]) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.21, 0.025),
      trim,
    );
    spoke.position.set(Math.sin(angle) * 0.13, Math.cos(angle) * 0.13, 0);
    spoke.rotation.z = -angle;
    wheel.add(spoke);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const texture = new THREE.CanvasTexture(canvas);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.76, 0.24),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  panel.position.set(0.31, -0.61, -1.04);
  root.add(panel);
  root.traverse((m) => {
    if (m.isMesh) {
      m.renderOrder = 10;
      m.material.depthTest = false;
      m.material.depthWrite = false;
      // Interior overlays must draw after transparent road guidance and other world effects.
      m.material.transparent = true;
    }
  });
  wheel.traverse((m) => {
    if (m.isMesh) m.renderOrder = 20;
  });
  panel.renderOrder = 21;
  return { root, wheel, canvas, texture, lastSpeed: -1 };
}
export function updateCockpit(cockpit, player, steer) {
  cockpit.wheel.rotation.z = -steer * 0.8;
  const speed = Math.round(Math.abs(player.speed) * 3.6);
  if (speed === cockpit.lastSpeed) return;
  cockpit.lastSpeed = speed;
  const c = cockpit.canvas.getContext("2d");
  c.fillStyle = "#08171e";
  c.fillRect(0, 0, 512, 160);
  c.fillStyle = "#e8ff76";
  c.font = "bold 88px monospace";
  c.fillText(String(speed).padStart(3, "0"), 20, 110);
  c.font = "24px monospace";
  c.fillStyle = "#8bc3c9";
  c.fillText("KM/H", 222, 72);
  c.fillText(player.speed < 0 ? "R" : "D", 222, 111);
  c.fillStyle = "#eee";
  c.fillRect(342, 42, 96, 64);
  c.fillStyle = "#cf1735";
  c.fillRect(383, 42, 14, 64);
  c.fillRect(342, 68, 96, 13);
  for (const x of [361, 420])
    for (const y of [55, 93]) {
      c.fillRect(x - 2, y - 7, 4, 14);
      c.fillRect(x - 7, y - 2, 14, 4);
    }
  cockpit.texture.needsUpdate = true;
}
