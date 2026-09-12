import { facadeMaterial, batchStatic } from "./expansion-visuals.js";
import { reservedExpansion } from "./world-sites.js";
import { buildGrass } from "./grass.js";
import * as THREE from "./vendor/three.module.js";
import { registerBreakable } from "./breakable-props.js";
import {
  ROADS,
  NODES,
  BUILDINGS,
  geo,
  nearestRoad,
  containsPoint,
  START,
  CLOCK_BUILDING,
} from "./city-map.js";
import { flagTexture, addFlag, tower } from "./scenery.js";
import { buildTechcrushGarage } from "./landmarks.js";
import { makeKartlisDeda } from "./kartlis-deda.js";
import { TREES } from "./world-props.js";
import { TOWER } from "./config.js";
import { buildRoadSurface } from "./road-surface.js";
import { buildTbilisiDistricts, terrainMound } from "./tbilisi-districts.js";
import { LANDMARKS, riverDistance } from "./district-data.js";
const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.83, ...extra });
import { terrainHeight, mountainHeight } from "./terrain.js";
export { terrainHeight } from "./terrain.js";
function mountains(v) {
  const geometry = new THREE.PlaneGeometry(6200, 5400, 180, 160);
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.attributes.position,
    colors = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      h = mountainHeight(x, z);
    p.setY(i, h);
    const mottled =
      Math.sin(x * 0.034 + Math.sin(z * 0.028) * 4) * Math.sin(z * 0.063) +
      Math.sin(x * 0.21 + z * 0.13) * 0.18;
    const c = new THREE.Color(h > 245 ? "#7f8065" : "#647355").multiplyScalar(
      0.92 + mottled * 0.1,
    );
    colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  v.terrainMaterial = mat("#ffffff", { vertexColors: true });
  const terrain = new THREE.Mesh(geometry, v.terrainMaterial);
  terrain.receiveShadow = true;
  v.decor.add(terrain);
  const statue = makeKartlisDeda();
  const sx = LANDMARKS.mother.x,
    sz = LANDMARKS.mother.z;
  statue.position.set(sx, 91, sz);
  statue.rotation.y = 0;
  statue.scale.setScalar(1.8);
  v.decor.add(statue);
  const base = v.box(20, 4, 20, mat("#9a9388"), sx, 90, sz);
  base.castShadow = true;
  const shoulderMaterial = mat("#92977d", { vertexColors: true });
  v.localHillMaterials = [shoulderMaterial];
  terrainMound(v.decor, { x: sx, z: sz }, 165, 135, 93, shoulderMaterial);
  tower(v);
}
function clockBuilding(v, facade) {
  const loc = CLOCK_BUILDING,
    g = new THREE.Group();
  g.position.set(loc.x, 0, loc.z);
  g.rotation.y = -Math.PI / 2;
  v.decor.add(g);
  const limestone = mat("#c3bca9"),
    cornice = mat("#ded5bf"),
    window = mat("#283336", { metalness: 0.4, roughness: 0.19 }),
    bronze = mat("#777b70", { metalness: 0.55 });
  window.emissive.set("#ffc57b");
  v.nightWindowMaterials = [window];
  const box = (w, h, d, m, x, y, z) => v.box(w, h, d, m, x, y, z, g);
  box(27, 31, 34, facade, 0, 15.5, -9);
  box(25, 1.2, 34, cornice, 0, 31.5, -9);
  for (const y of [3.5, 8.7, 14, 19.3, 24.6, 29.8])
    box(28, 0.35, 35, cornice, 0, y, -9);
  // Narrow corner tower: recessed arcade, tall pilasters and a round clock below the cupola.
  box(14, 30, 2, limestone, 0, 15, 9);
  box(8, 24, 0.5, window, 0, 14, 10.1);
  for (const x of [-5.2, -3.6, 3.6, 5.2])
    box(0.7, 26, 1.1, cornice, x, 14, 10.5);
  for (const y of [6, 11, 16, 21]) {
    box(10, 0.45, 2.5, cornice, 0, y, 10.6);
    for (let x = -4; x <= 4; x += 0.7)
      box(0.11, 1.2, 0.11, bronze, x, y + 0.7, 11.6);
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const c = canvas.getContext("2d");
  c.fillStyle = "#ddd0a4";
  c.beginPath();
  c.arc(128, 128, 124, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#314044";
  c.lineWidth = 4;
  for (let n = 0; n < 12; n++) {
    const a = (n * Math.PI) / 6;
    c.beginPath();
    c.moveTo(128 + Math.sin(a) * 101, 128 - Math.cos(a) * 101);
    c.lineTo(128 + Math.sin(a) * 116, 128 - Math.cos(a) * 116);
    c.stroke();
  }
  c.lineWidth = 9;
  c.beginPath();
  c.moveTo(128, 49);
  c.lineTo(128, 128);
  c.lineTo(77, 105);
  c.stroke();
  const clock = new THREE.Mesh(
    new THREE.CircleGeometry(2.55, 48),
    new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(canvas),
      roughness: 0.65,
    }),
  );
  clock.position.set(0, 30, 11.4);
  g.add(clock);
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2, 7.5, 6, 12),
    facade,
  );
  drum.position.set(0, 34.2, 0);
  g.add(drum);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(6.6, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    bronze,
  );
  dome.scale.y = 1.1;
  dome.position.set(0, 37.2, 0);
  g.add(dome);
  box(0.3, 5, 0.3, cornice, 0, 45, 0);
  const wing = new THREE.Group();
  wing.position.set(-30, 0, -14);
  g.add(wing);
  v.box(46, 27, 25, facade, 0, 13.5, 0, wing);
  for (const y of [3, 8, 13, 18, 23, 27.5])
    v.box(47, 0.4, 26, cornice, 0, y, 0, wing);
  addFlag(v, loc.x - 19, loc.z - 24, 12, 0.65);
}
export function buildRealisticCity(v) {
  v.decor = new THREE.Group();
  v.decor.userData.environment = true;
  v.scene.add(v.decor);
  v.flags = [];
  v.georgiaFlag = flagTexture();
  const road = mat("#ffffff"),
    concrete = mat("#b7b5a9"),
    curb = mat("#d0ccc0"),
    line = mat("#e4e1cb"),
    roof = mat("#7d817d");
  v.roadMaterial = road;
  v.buildingMaterials = [];
  v.oldTownMaterials = [];
  const facades = ["#f4ecda", "#d8cfbb", "#dad3c6", "#bfc5bf", "#d1bca5"].map(
    (c) => {
      const m = mat(c);
      v.buildingMaterials.push(m);
      return m;
    },
  );
  const newFacades = [0, 1, 2, 3].map(facadeMaterial);
  v.buildingMaterials.push(...newFacades);
  v.expansionFacades = newFacades;
  const staticCity = new THREE.Group();
  staticCity.userData.environment = true;
  v.decor.add(staticCity);
  buildRoadSurface(v, road, concrete, curb);
  const paving = document.createElement("canvas");
  paving.width = paving.height = 512;
  const pc = paving.getContext("2d");
  pc.fillStyle = "#a7a69e";
  pc.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const light = 166 + ((x * 17 + y * 31) % 23);
      pc.fillStyle = `rgb(${light},${light},${light - 7})`;
      pc.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
    }
  const ptex = new THREE.CanvasTexture(paving);
  ptex.wrapS = ptex.wrapT = THREE.RepeatWrapping;
  ptex.repeat.set(3, 3);
  ptex.colorSpace = THREE.SRGBColorSpace;
  concrete.map = ptex;
  concrete.bumpMap = ptex;
  concrete.bumpScale = 0.05;
  for (const r of ROADS) {
    const fx = Math.sin(r.angle),
      fz = Math.cos(r.angle),
      rx = fz,
      rz = -fx;
    const endGap = (n) =>
      n.links.length > 2
        ? Math.max(...n.links.map((l) => ROADS[l.road].width)) / 2 + 2
        : 3;
    for (
      let along = endGap(r.start);
      along < r.length - endGap(r.end);
      along += 13
    ) {
      for (const offset of r.width > 24
        ? [-r.width / 4, 0, r.width / 4]
        : [0]) {
        const stripe = v.box(
          0.13,
          0.008,
          Math.min(5.5, r.length - endGap(r.end) - along),
          line,
          r.start.x + fx * along + rx * offset,
          0.075,
          r.start.z + fz * along + rz * offset,
          staticCity,
        );
        stripe.rotation.y = r.angle;
      }
    }
  }
  for (const b of BUILDINGS) {
    if (b.landmark) continue;
    const facade =
        b.tint === 0
          ? newFacades[Math.abs(Math.round(b.x + b.z)) % 3]
          : facades[b.tint],
      m = v.box(b.w, b.h, b.d, facade, b.x, b.h / 2, b.z, staticCity);
    m.rotation.y = b.angle;
    for (const y of [1, b.h * 0.25, b.h * 0.5, b.h * 0.75, b.h + 0.3]) {
      const cornice = v.box(
        b.w + 0.65,
        0.32,
        b.d + 0.65,
        curb,
        b.x,
        y,
        b.z,
        staticCity,
      );
      cornice.rotation.y = b.angle;
    }
    const cap = v.box(
      b.w + 0.8,
      0.55,
      b.d + 0.8,
      roof,
      b.x,
      b.h + 0.9,
      b.z,
      staticCity,
    );
    cap.rotation.y = b.angle;
    // Light wells and chimneys give the roof a believable silhouette from high chase.
    if (b.h > 20)
      v.box(2, 2.5, 2, concrete, b.x + 3, b.h + 2.1, b.z - 3, staticCity);
  }
  batchStatic(staticCity);
  streetDetails(v, line);
  clockBuilding(v, facades[1]);
  mountains(v);
  buildTechcrushGarage(v);
  buildTbilisiDistricts(v);
  buildGrass(v);
  for (const i of [15, 48, 93, 134, 177]) {
    const n = NODES[i];
    if (n) addFlag(v, n.x + 15, n.z, 10, 0.58);
  }
}
function streetDetails(v, line) {
  const metal = mat("#424c4b", { metalness: 0.7, roughness: 0.4 }),
    bark = mat("#625e4e");
  const lamp = mat("#eae1c8", { emissive: "#fff4d8", emissiveIntensity: 0.3 });
  v.streetLamps = [];
  v.streetLampMaterials = [lamp];
  const trees = [];
  for (const r of ROADS) {
    const fx = Math.sin(r.angle),
      fz = Math.cos(r.angle),
      rx = fz,
      rz = -fx;
    for (let t = 18; t < r.length - 9; t += 38) {
      for (const side of [-1, 1]) {
        const x = r.start.x + fx * t + rx * (r.width / 2 + 2.4) * side,
          z = r.start.z + fz * t + rz * (r.width / 2 + 2.4) * side;
        if (
          reservedExpansion({ x, z, w: 2, d: 2, angle: 0 }) ||
          nearestRoad({ x, z }).distance < r.width / 2 + 1
        )
          continue;
        const pole = new THREE.Group();
        pole.position.set(x, 0, z);
        v.decor.add(pole);
        const prop = registerBreakable(v, pole, x, z);
        v.box(0.15, 8, 0.15, metal, 0, 4, 0, pole);
        const arm = v.box(
          2.5,
          0.12,
          0.12,
          metal,
          -rx * side,
          8,
          -rz * side,
          pole,
        );
        arm.rotation.y = r.angle;
        const light = v.box(
          1.2,
          0.12,
          0.55,
          lamp,
          -rx * side * 2,
          7.95,
          -rz * side * 2,
          pole,
        );
        light.rotation.y = r.angle;
        v.streetLamps.push({ head: light, propId: prop.definition.id });
        trees.push({
          x: x + fx * 12,
          z: z + fz * 12,
          h: 8 + Math.sin(x * 10) * 1.8,
        });
      }
    }
  }
  v.treePositions = TREES;
  // Road-name signs orient the player without a cluttered satellite-map overlay.
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 1024;
  signCanvas.height = 256;
  const c = signCanvas.getContext("2d");
  c.fillStyle = "#28513c";
  c.fillRect(0, 0, 1024, 256);
  c.strokeStyle = "#ebeadf";
  c.lineWidth = 8;
  c.strokeRect(12, 12, 1000, 232);
  c.fillStyle = "#fff";
  c.font = "bold 58px Arial";
  c.textAlign = "center";
  c.fillText("ბარათაშვილის გამზირი", 512, 102);
  c.font = "44px Arial";
  c.fillText("BARATASHVILI AVENUE", 512, 184);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 2),
    new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(signCanvas),
      side: THREE.DoubleSide,
    }),
  );
  const p = nearestRoad(START);
  sign.position.set(p.x - 8, 5, p.z - 14);
  sign.rotation.y = -Math.PI / 2;
  const post = new THREE.Group();
  post.position.set(sign.position.x, 0, sign.position.z);
  sign.position.set(0, 5, 0);
  post.add(sign);
  v.decor.add(post);
  v.box(0.12, 5, 0.12, metal, 0, 2.5, 0, post);
  registerBreakable(v, post, post.position.x, post.position.z, 5);
}
