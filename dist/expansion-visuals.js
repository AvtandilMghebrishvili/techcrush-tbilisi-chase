import * as THREE from "./vendor/three.module.js";
import { detachStaticMeshes } from "./static-detach.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  BANK_SITE,
  BANK_SOLIDS,
  TOWERS,
  ROOFTOP,
  QUEST_BOX,
  STUNT_APRONS,
} from "./world-sites.js";
const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
function canvasTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
// Four original facade atlases: weathered brick, stucco balconies, limestone
// arches and glazed offices. Drawn once; window masks share exactly the same layout.
export function facadeMaterial(style) {
  const c = document.createElement("canvas"),
    e = document.createElement("canvas");
  c.width = e.width = 512;
  c.height = e.height = 512;
  const x = c.getContext("2d"),
    glow = e.getContext("2d");
  const colors = ["#9e7664", "#c6bfa9", "#c7c1b3", "#49707b"];
  x.fillStyle = colors[style];
  x.fillRect(0, 0, 512, 512);
  glow.fillStyle = "#000";
  glow.fillRect(0, 0, 512, 512);
  let seed = 771 + style;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 11000; i++) {
    x.fillStyle = rand() > 0.5 ? "#ffffff0d" : "#0000000c";
    x.fillRect(rand() * 512, rand() * 512, rand() * 3 + 1, rand() * 4 + 1);
  }
  if (style === 0)
    for (let row = 0; row < 43; row++)
      for (let col = -1; col < 19; col++) {
        x.strokeStyle = "#66544b55";
        x.strokeRect(col * 30 + (row % 2) * 15, row * 12, 30, 12);
      }
  for (let floor = 0; floor < 4; floor++) {
    const y = floor * 128;
    if (style !== 3) {
      x.fillStyle = "#ebdfc955";
      x.fillRect(0, y + 120, 512, 5);
      x.fillStyle = "#493d332f";
      x.fillRect(0, y + 126, 512, 2);
    }
    for (let col = 0; col < 4; col++) {
      const left = col * 128 + 25,
        top = y + 22,
        w = 78,
        h = 84;
      x.fillStyle = style === 3 ? "#b8c5c9" : "#ded4be";
      x.fillRect(left - 5, top - 5, w + 10, h + 10);
      const grad = x.createLinearGradient(left, top, left + w, top + h);
      grad.addColorStop(0, "#263a43");
      grad.addColorStop(0.52, style === 3 ? "#7594a0" : "#48606a");
      grad.addColorStop(1, "#17242d");
      x.fillStyle = grad;
      if (style === 2) {
        x.beginPath();
        x.roundRect(left, top, w, h, [w / 2, w / 2, 0, 0]);
        x.fill();
      } else x.fillRect(left, top, w, h);
      x.fillStyle = "#ccd1c166";
      x.fillRect(left + w * 0.48, top, 3, h);
      x.fillRect(left, top + h * 0.52, w, 3);
      if (rand() > 0.42) {
        glow.fillStyle = ["#b89765", "#6e5636", "#b19d78"][col % 3];
        glow.fillRect(left + 3, top + 6, w - 6, h - 10);
        glow.fillStyle = "#000";
        glow.fillRect(left + w * 0.48, top, 4, h);
        glow.fillRect(left, top + h * 0.52, w, 4);
      }
      if (style === 1) {
        x.fillStyle = "#756b56";
        x.fillRect(left - 10, top + h - 11, w + 20, 4);
        for (let k = 0; k < 9; k++)
          x.fillRect(left - 7 + k * 12, top + h - 10, 2, 22);
        x.fillStyle = "#d1c5a9";
        x.fillRect(left - 11, top + h + 11, w + 22, 6);
      }
      if (style === 0) {
        x.fillStyle = "#3b584c";
        x.fillRect(left - 17, top, 11, h);
        x.fillRect(left + w + 6, top, 11, h);
      }
    }
  }
  const m = mat("#ffffff", {
    map: canvasTexture(c),
    emissive: "#ffffff",
    emissiveMap: canvasTexture(e),
    emissiveIntensity: 0,
    roughness: style === 3 ? 0.28 : 0.9,
    metalness: style === 3 ? 0.45 : 0,
  });
  m.userData.originalFacade = true;
  return m;
}
export function batchStatic(group, tile = 160) {
  group.updateMatrixWorld(true);
  const batches = new Map(),
    remove = [];
  group.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    for (let p = o; p && p !== group; p = p.parent)
      if (p.userData.dynamic) return;
    const pos = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
    const key =
      o.material.uuid +
      ":" +
      Math.floor(pos.x / tile) +
      ":" +
      Math.floor(pos.z / tile);
    if (!batches.has(key)) batches.set(key, { mat: o.material, geos: [] });
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    if (o.material.userData.metricFacade && g.attributes.uv) {
      const p = g.attributes.position,
        n = g.attributes.normal,
        uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++)
        uv.setXY(
          i,
          (Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) : p.getX(i)) / 16,
          p.getY(i) / 14,
        );
    }
    g.applyMatrix4(o.matrixWorld);
    if (!g.attributes.uv)
      g.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(
          new Float32Array(g.attributes.position.count * 2),
          2,
        ),
      );
    batches.get(key).geos.push(g);
    remove.push(o);
  });
  detachStaticMeshes(remove);
  for (const geometry of new Set(remove.map((o) => o.geometry)))
    geometry.dispose();
  for (const batch of batches.values()) {
    const g = mergeGeometries(batch.geos);
    batch.geos.forEach((g) => g.dispose());
    if (!g) continue;
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, batch.mat);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  }
}
export function buildExpansion(v, root, box, label, materials) {
  const stone = mat("#b7b4a8"),
    glass = mat("#567783", {
      roughness: 0.24,
      metalness: 0.45,
      emissive: "#c9ad75",
      emissiveIntensity: 0,
    }),
    metal = mat("#344853", { metalness: 0.5 }),
    white = mat("#eee9d8"),
    orange = mat("#ed732b");
  v.nightWindowMaterials.push(glass);
  const grain = document.createElement("canvas");
  grain.width = grain.height = 128;
  const gx = grain.getContext("2d");
  gx.fillStyle = "#ccc9be";
  gx.fillRect(0, 0, 128, 128);
  let grainSeed = 113;
  const grainRandom = () =>
    (grainSeed = (grainSeed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 7000; i++) {
    gx.fillStyle = i % 2 ? "#00000006" : "#ffffff0a";
    gx.fillRect(grainRandom() * 128, grainRandom() * 128, 1, 1);
  }
  stone.map = canvasTexture(grain);
  stone.bumpMap = stone.map;
  stone.bumpScale = 0.035;
  // Geometry and collider volumes are drawn from the same dimensions, including
  // the clearance under each cantilever rather than an invisible solid cuboid.
  for (const b of BANK_SOLIDS) {
    box(b.w, b.h - b.base, b.d, stone, b.x, (b.h + b.base) / 2, b.z, root);
    if (b.base)
      for (const y of [b.base + 3.1, b.base + 7.5]) {
        box(b.w + 0.08, 2.5, b.d + 0.08, glass, b.x, y, b.z, root);
        box(b.w + 0.22, 0.35, b.d + 0.22, white, b.x, y - 1.45, b.z, root);
        if (b.w > b.d)
          for (let dx = -b.w / 2 + 2; dx < b.w / 2; dx += 3)
            for (const sign of [-1, 1])
              box(
                0.22,
                2.65,
                0.35,
                white,
                b.x + dx,
                y,
                b.z + (sign * b.d) / 2,
                root,
              );
        else
          for (let dz = -b.d / 2 + 2; dz < b.d / 2; dz += 3)
            for (const sign of [-1, 1])
              box(
                0.35,
                2.65,
                0.22,
                white,
                b.x + (sign * b.w) / 2,
                y,
                b.z + dz,
                root,
              );
      }
  }
  box(110, 0.2, 101, metal, BANK_SITE.x, 0.05, BANK_SITE.z, root);
  label("BANK OF GEORGIA · 1975", 17, 1.3, BANK_SITE.x, 7, BANK_SITE.z + 42, 0);
  label(
    "SPACE CITY / TBILISI LANDMARK",
    15,
    0.7,
    BANK_SITE.x,
    5.8,
    BANK_SITE.z + 42,
    0,
  );
  for (const t of TOWERS) {
    box(t.w, t.h, t.d, materials[3], t.x, t.h / 2, t.z, root);
    for (let y = 4; y < t.h; y += 7)
      box(t.w + 0.2, 0.35, t.d + 0.2, white, t.x, y, t.z, root);
    for (const side of [-1, 1])
      box(
        1.2,
        t.h,
        t.d + 0.3,
        metal,
        t.x + side * (t.w / 2 - 0.5),
        t.h / 2,
        t.z,
        root,
      );
    box(t.w * 0.7, 4, t.d * 0.7, metal, t.x, t.h + 2, t.z, root);
  }
  box(
    ROOFTOP.w,
    ROOFTOP.h - 0.15,
    ROOFTOP.d,
    materials[0],
    ROOFTOP.x,
    (ROOFTOP.h - 0.15) / 2,
    ROOFTOP.z,
    root,
  );
  box(
    ROOFTOP.w,
    0.15,
    ROOFTOP.d,
    metal,
    ROOFTOP.x,
    ROOFTOP.h - 0.075,
    ROOFTOP.z,
    root,
  );
  // Roof landing pad stays flush and driveable: no decorative collision mismatch.
  for (const side of [-1, 1])
    box(
      0.3,
      0.012,
      ROOFTOP.d - 8,
      orange,
      ROOFTOP.x + side * 18,
      ROOFTOP.h + 0.025,
      ROOFTOP.z,
      root,
    );
  label(
    "TECHCRUSH · SKYBOX",
    30,
    3,
    ROOFTOP.x,
    9,
    ROOFTOP.z - ROOFTOP.d / 2 - 0.08,
    Math.PI,
  );
  for (const a of STUNT_APRONS) {
    for (const side of [-1, 1]) {
      const line = box(
        0.25,
        0.012,
        a.d,
        orange,
        a.x + Math.cos(a.angle) * side * (a.w / 2 - 1),
        0.084,
        a.z - Math.sin(a.angle) * side * (a.w / 2 - 1),
        root,
      );
      line.rotation.y = a.angle;
    }
  }
  const crate = new THREE.Group();
  crate.userData.dynamic = true;
  crate.position.set(QUEST_BOX.x, QUEST_BOX.y, QUEST_BOX.z);
  root.add(crate);
  const red = mat("#e3204b", {
    metalness: 0.35,
    emissive: "#d3203e",
    emissiveIntensity: 0.25,
  });
  box(3.4, 2.6, 3.4, red, 0, 1.4, 0, crate);
  box(3.6, 0.22, 3.6, metal, 0, 2.8, 0, crate);
  for (const x of [-1, 1])
    for (const z of [-1, 1])
      box(0.22, 2.8, 0.22, orange, x * 1.7, 1.4, z * 1.7, crate);
  const beacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.15),
    mat("#ffd176", { emissive: "#fbc051", emissiveIntensity: 1.1 }),
  );
  beacon.position.y = 5.5;
  crate.add(beacon);
  label(
    "SKYBOX · +1 UPGRADE BOX",
    14,
    1.4,
    QUEST_BOX.x,
    QUEST_BOX.y + 7,
    QUEST_BOX.z,
    Math.PI,
  );
  v.questCrate = { root: crate, beacon };
}
export function updateExpansion(v, sim) {
  if (!v.questCrate) return;
  const done =
    sim.runQuests.includes(ROOFTOP.id) ||
    sim.runOptions?.completedQuests?.includes(ROOFTOP.id);
  v.questCrate.root.visible = !done;
  v.questCrate.beacon.rotation.y = sim.time * 0.8;
  v.questCrate.beacon.position.y = 5.5 + Math.sin(sim.time * 2) * 0.3;
}
