import { buildGrex, updateGrex, signMaterial } from "./grex-visuals.js";
import { activeRepairCount } from "./brand-rules.js";
import * as THREE from "./vendor/three.module.js";
import {
  FACADE_BANNERS,
  ROBOTICS_GEARS,
  GEAR_RADIUS,
} from "./city-brand-sites.js";
import {
  ROBOTICS_COLOR,
  GEAR_OUTLINE,
  GEAR_HOLE,
} from "./robotics-logo-data.js";

export function gearGeometry() {
  const shape = new THREE.Shape(
    GEAR_OUTLINE.map(([x, y]) => new THREE.Vector2(x, y)),
  );
  const hole = new THREE.Path();
  hole.absarc(0, 0, GEAR_HOLE, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.19,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    curveSegments: 32,
  });
  geo.translate(0, 0, -0.095);
  return geo;
}

export function bannerGeometry(site) {
  const fold = site.draped ? 1.7 : 0;
  const geometry = new THREE.PlaneGeometry(site.size, site.size + fold, 8, 24);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = geometry.attributes.uv.getY(i),
      fromTop = (1 - u) * (site.size + fold);
    // Fold across the roof edge, then let the rest hang clear of the cornices.
    p.setY(i, site.top - Math.max(0, fromTop - fold));
    p.setZ(
      i,
      fromTop < fold ? fromTop - fold : Math.sin(fromTop * 0.85) * 0.055,
    );
    // The fold is a spare fabric margin, never a cropped title or brand logo.
    geometry.attributes.uv.setY(
      i,
      Math.max(0, 1 - Math.max(0, fromTop - fold) / site.size),
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function buildCityBranding(v) {
  const group = new THREE.Group();
  group.name = "City facade sponsors";
  v.decor.add(group);
  v.facadeBrandMaterials = {
    robotics: new THREE.MeshBasicMaterial({
      color: "#ffffff",
      toneMapped: false,
    }),
    techcrush: new THREE.MeshBasicMaterial({
      color: "#ffffff",
      toneMapped: false,
    }),
  };
  for (const site of FACADE_BANNERS) {
    const banner = new THREE.Mesh(
      bannerGeometry(site),
      v.facadeBrandMaterials[site.brand],
    );
    banner.position.set(site.x, 0, site.z);
    banner.rotation.y = site.angle;
    banner.name = site.brand + " facade banner " + site.id;
    group.add(banner);
  }
  for (const item of v.cableBannerMeshes || []) {
    item.mesh.material.dispose();
    item.mesh.material = v.facadeBrandMaterials[item.brand];
  }
  buildGrex(v);
  const giftGeo = new THREE.PlaneGeometry(6.3, 1.575);
  const giftMat = signMaterial(
    ["GIFT FROM", "GEORGIAN ROBOTICS ASSOCIATION", "FULL REPAIR · HP 100%"],
    ROBOTICS_COLOR,
  );
  const geometry = gearGeometry();
  const red = new THREE.MeshStandardMaterial({
    color: ROBOTICS_COLOR,
    emissive: ROBOTICS_COLOR,
    emissiveIntensity: 0.4,
    metalness: 0.25,
    roughness: 0.32,
    toneMapped: false,
  });
  const plinth = new THREE.MeshStandardMaterial({
    color: "#18202a",
    roughness: 0.55,
    metalness: 0.5,
  });
  const rim = new THREE.MeshBasicMaterial({
    color: ROBOTICS_COLOR,
    toneMapped: false,
  });
  const baseGeo = new THREE.CylinderGeometry(
    GEAR_RADIUS + 0.3,
    GEAR_RADIUS + 0.45,
    0.25,
    32,
  );
  const ringGeo = new THREE.TorusGeometry(GEAR_RADIUS + 0.18, 0.06, 5, 48);
  v.roboticsGearMeshes = [];
  v.roboticsGearMaterial = red;
  for (const site of ROBOTICS_GEARS) {
    const root = new THREE.Group();
    root.userData.dynamic = true;
    root.userData.environment = true;
    root.position.set(site.x, 0, site.z);
    const base = new THREE.Mesh(baseGeo, plinth);
    base.position.y = 0.13;
    const ring = new THREE.Mesh(ringGeo, rim);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.28;
    const swivel = new THREE.Group();
    swivel.position.y = GEAR_RADIUS + 0.45;
    const gear = new THREE.Mesh(geometry, red);
    gear.scale.setScalar(GEAR_RADIUS);
    gear.castShadow = true;
    swivel.add(gear);
    const gift = new THREE.Mesh(giftGeo, giftMat);
    gift.position.set(
      Math.sin(site.facing) * 3.65,
      1.0,
      Math.cos(site.facing) * 3.65,
    );
    gift.rotation.y = site.facing;
    const backGift = new THREE.Mesh(giftGeo, giftMat);
    backGift.position.copy(gift.position).multiplyScalar(-1);
    backGift.position.y = 1;
    backGift.rotation.y = site.facing + Math.PI;
    root.add(base, ring, swivel, gift, backGift);
    v.decor.add(root);
    v.roboticsGearMeshes.push({ root, swivel, gear, ring, site });
  }
}

export function applyCityBranding(v, poster, logo) {
  poster.colorSpace = THREE.SRGBColorSpace;
  poster.anisotropy = Math.min(4, v.renderer.capabilities.getMaxAnisotropy());
  v.facadeBrandMaterials.robotics.map = poster;
  v.facadeBrandMaterials.robotics.needsUpdate = true;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const c = canvas.getContext("2d");
  c.fillStyle = "#090e17";
  c.fillRect(0, 0, 1024, 1024);
  c.fillStyle = "#fa244c";
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(300, 0);
  c.lineTo(0, 300);
  c.fill();
  c.beginPath();
  c.moveTo(1024, 724);
  c.lineTo(1024, 1024);
  c.lineTo(724, 1024);
  c.fill();
  c.save();
  c.beginPath();
  c.arc(512, 270, 148, 0, Math.PI * 2);
  c.clip();
  c.drawImage(logo, 364, 122, 296, 296);
  c.restore();
  c.fillStyle = "#ffffff";
  c.textAlign = "center";
  c.font = "italic 900 132px Arial,sans-serif";
  c.fillText("TECHCRUSH", 512, 605, 910);
  c.font = '900 74px "Segoe UI",sans-serif';
  c.fillText("გამოიწერე!", 512, 732, 930);
  c.fillStyle = "#ff6886";
  c.font = 'bold 43px "Segoe UI",sans-serif';
  c.fillText("რას ელოდები? :დდ", 512, 824, 880);
  c.fillStyle = "#a2b9c8";
  c.font = "bold 27px Arial";
  c.fillText("GEORGIAN STREETS. YOUR COMMUNITY.", 512, 942, 860);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = poster.anisotropy;
  v.facadeBrandMaterials.techcrush.map = texture;
  v.facadeBrandMaterials.techcrush.needsUpdate = true;
}

export function updateCityBranding(v, sim, time) {
  // Only the existing render loop advances these transforms. Pause/hidden tabs
  // stop it; map disposal releases the shared geometry and materials once.
  updateGrex(v, sim, time);
  for (const item of v.roboticsGearMeshes || []) {
    const near =
      (sim.player.x - item.site.x) ** 2 + (sim.player.z - item.site.z) ** 2 <
      500 ** 2;
    const collected = sim.gearRepairs?.find((p) => p.id === item.site.id);
    const fade = collected
      ? Math.min(1, Math.max(0, time - collected.time) / 0.6)
      : 0;
    item.root.visible =
      near && fade < 1 && item.site.id < activeRepairCount(sim.level);
    if (!near) continue;
    item.swivel.scale.setScalar(Math.max(0.001, 1 - fade));
    item.ring.scale.setScalar(1 + fade * 2);
    item.swivel.rotation.y = item.site.angle + time * 0.24;
    item.gear.rotation.z = time * 0.32;
  }
}
