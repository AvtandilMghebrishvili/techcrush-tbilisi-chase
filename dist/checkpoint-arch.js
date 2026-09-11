import * as THREE from "./vendor/three.module.js";
import { nearestRoad } from "./city-map.js";
export function makeCheckpointArch() {
  const g = new THREE.Group();
  g.name = "TECHCRUSH inflatable checkpoint";
  const palette = ["#ee123c", "#ffe34c", "#eef4f5", "#3466ee"];
  const mats = palette.map(
    (color) =>
      new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.1,
        roughness: 0.27,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        emissive: color,
        emissiveIntensity: 0.15,
      }),
  );
  const add = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  for (const side of [-1, 1]) {
    add(
      new THREE.CylinderGeometry(0.9, 1.04, 4.8, 20),
      mats[0],
      side * 12,
      2.4,
    );
    for (const y of [1.05, 3.1])
      add(
        new THREE.CylinderGeometry(0.93, 0.93, 0.3, 20),
        mats[y < 2 ? 1 : 3],
        side * 12,
        y,
      );
  }
  for (let segment = 0; segment < 12; segment++) {
    const points = Array.from({ length: 9 }, (_, i) => {
      const a = ((segment + i / 8) * Math.PI) / 12;
      return new THREE.Vector3(Math.cos(a) * 12, 4.8 + Math.sin(a) * 5.2, 0);
    });
    add(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        10,
        0.9,
        14,
        false,
      ),
      mats[Math.floor(segment / 3) % 4],
    );
  }
  const label = document.createElement("canvas");
  label.width = 1024;
  label.height = 128;
  const c = label.getContext("2d");
  c.font = "italic 900 110px Arial";
  c.fillStyle = "#111929";
  c.textAlign = "center";
  c.strokeStyle = "#fff";
  c.lineWidth = 5;
  c.strokeText("TECHCRUSH", 512, 105);
  c.fillText("TECHCRUSH", 512, 105);
  const texture = new THREE.CanvasTexture(label);
  texture.colorSpace = THREE.SRGBColorSpace;
  const textMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const logo = new THREE.TextureLoader().load("./assets/techcrush-logo.jpg");
  logo.colorSpace = THREE.SRGBColorSpace;
  const logoMat = new THREE.MeshBasicMaterial({ map: logo });
  for (const side of [-1, 1]) {
    const text = add(
      new THREE.PlaneGeometry(8.7, 1.09),
      textMat,
      0,
      9.95,
      side * 0.95,
    );
    text.rotation.y = side < 0 ? Math.PI : 0;
    for (const x of [-12, 12]) {
      const badge = add(
        new THREE.PlaneGeometry(1.25, 1.25),
        logoMat,
        x,
        2.1,
        side * 0.98,
      );
      badge.rotation.y = side < 0 ? Math.PI : 0;
    }
  }
  // Alternating pavement squares mark the exact gate plane; no opaque floating sign.
  const white = new THREE.MeshBasicMaterial({
    color: "#fff",
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const red = new THREE.MeshBasicMaterial({
    color: "#fa254b",
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  for (let i = 0; i < 24; i++)
    for (let row = 0; row < 2; row++) {
      const m = add(
        new THREE.PlaneGeometry(1, 0.6),
        (i + row) % 2 ? white : red,
        i - 11.5,
        0.085,
        (row - 0.5) * 0.6,
      );
      m.rotation.x = -Math.PI / 2;
    }
  return g;
}
export function positionCheckpointArch(g, cp) {
  g.visible = !!cp;
  if (!cp) return;
  g.position.set(cp.x, 0, cp.z);
  g.rotation.y = cp.angle;
  const road = nearestRoad(cp).road;
  g.scale.x = Math.max(8, Math.min(27, road.width - 2)) / 24;
}
