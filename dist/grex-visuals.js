import * as THREE from "./vendor/three.module.js";
import { GREX_MONUMENTS } from "./city-brand-sites.js";
import { GREX_COLOR, GREX_OUTLINE, GREX_EYE } from "./grex-logo-data.js";

export function grexGeometry() {
  const shape = new THREE.Shape(
    GREX_OUTLINE.map(([x, y]) => new THREE.Vector2(x, y)),
  );
  shape.holes.push(
    new THREE.Path(GREX_EYE.map(([x, y]) => new THREE.Vector2(x, y))),
  );
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.23,
    bevelEnabled: true,
    bevelSize: 0.015,
    bevelThickness: 0.015,
    bevelSegments: 2,
    steps: 1,
  });
  geo.translate(0, 0, -0.115);
  return geo;
}

export function signMaterial(lines, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 192;
  const c = canvas.getContext("2d");
  c.fillStyle = "#111923";
  c.fillRect(0, 0, 768, 192);
  c.fillStyle = color;
  c.fillRect(0, 0, 768, 6);
  c.textAlign = "center";
  lines.forEach((line, i) => {
    c.font = `${i ? "600 29" : "900 35"}px Arial`;
    c.fillStyle = i ? "#ffffff" : color;
    c.fillText(line, 384, 55 + i * 51, 732);
  });
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map, toneMapped: false });
}

export function buildGrex(v) {
  v.grexCrateMaterial = new THREE.MeshBasicMaterial({
    color: "#ffffff",
    toneMapped: false,
  });
  const face = new THREE.PlaneGeometry(2.42, 2.42);
  for (const crate of v.questCrates || (v.questCrate ? [v.questCrate] : [])) {
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2,
        panel = new THREE.Mesh(face, v.grexCrateMaterial);
      panel.position.set(
        Math.sin(angle) * 1.825,
        1.42,
        Math.cos(angle) * 1.825,
      );
      panel.rotation.y = angle;
      crate.root.add(panel);
    }
  }
  const geo = grexGeometry(),
    material = new THREE.MeshStandardMaterial({
      color: GREX_COLOR,
      emissive: GREX_COLOR,
      emissiveIntensity: 0.65,
      roughness: 0.3,
      metalness: 0.25,
      toneMapped: false,
    });
  const baseGeo = new THREE.CylinderGeometry(3.65, 3.85, 0.28, 24),
    baseMat = new THREE.MeshStandardMaterial({
      color: "#172027",
      metalness: 0.5,
      roughness: 0.4,
    });
  const labelGeo = new THREE.PlaneGeometry(6.3, 1.575),
    labelMat = signMaterial(
      [
        "GREX PULSE · −50 HP",
        "ALL PATROLS DESTROYED",
        "THEY RETURN IN 8 SECONDS",
      ],
      GREX_COLOR,
    );
  v.grexMeshes = [];
  for (const site of GREX_MONUMENTS) {
    const root = new THREE.Group();
    root.userData.dynamic = true;
    root.userData.environment = true;
    root.position.set(site.x, 0, site.z);
    root.rotation.y = site.facing;
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.15;
    const statue = new THREE.Mesh(geo, material);
    statue.scale.setScalar(3.25);
    statue.position.y = 4.4;
    statue.castShadow = true;
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(0, 1.1, 0.5);
    const backLabel = new THREE.Mesh(labelGeo, labelMat);
    backLabel.position.set(0, 1.1, -0.5);
    backLabel.rotation.y = Math.PI;
    root.add(base, statue, label, backLabel);
    v.decor.add(root);
    v.grexMeshes.push({ root, statue, site });
  }
}
export function applyGrex(v, texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, v.renderer.capabilities.getMaxAnisotropy());
  v.grexCrateMaterial.map = texture;
  v.grexCrateMaterial.needsUpdate = true;
}
export function updateGrex(v, sim, time) {
  for (const item of v.grexMeshes || []) {
    const used = sim.grexTriggers?.find((q) => q.id === item.site.id);
    const fade = used ? Math.min(1, Math.max(0, time - used.time) / 0.65) : 0;
    item.root.visible =
      fade < 1 &&
      (sim.player.x - item.site.x) ** 2 + (sim.player.z - item.site.z) ** 2 <
        500 ** 2;
    if (!item.root.visible) continue;
    item.statue.scale.setScalar(3.25 * (1 - fade));
    item.statue.position.y = 4.4 + Math.sin(time * 1.7 + item.site.id) * 0.08;
  }
}
