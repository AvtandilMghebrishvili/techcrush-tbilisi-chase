import * as THREE from "./vendor/three.module.js";
import {
  ROADS,
  NODES,
  BUILDINGS,
  geo,
  nearestRoad,
  START,
  CLOCK_BUILDING,
} from "./city-map.js";
import { flagTexture, addFlag, tower } from "./scenery.js";
import { buildTechcrushGarage } from "./landmarks.js";
import { makeKartlisDeda } from "./kartlis-deda.js";
import { TOWER } from "./config.js";
const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.83, ...extra });
export function terrainHeight(x, z) {
  const west =
    315 * Math.exp(-(((x - 1160) / 640) ** 2) - ((z + 390) / 1490) ** 2);
  const south =
    215 * Math.exp(-(((x + 30) / 1480) ** 2) - ((z + 1490) / 560) ** 2);
  const fade = Math.max(
    0,
    Math.min(1, Math.max((x - 680) / 350, (-z - 770) / 380)),
  );
  return (
    (west + south) *
      (1 +
        0.055 * Math.sin(x * 0.011) * Math.sin(z * 0.008) +
        0.025 * Math.sin(x * 0.038 + z * 0.017)) *
      fade -
    3
  );
}
function mountains(v) {
  const geometry = new THREE.PlaneGeometry(6200, 5400, 180, 160);
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.attributes.position,
    colors = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      h = terrainHeight(x, z);
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
  const sx = -430,
    sz = -1190;
  statue.position.set(sx, terrainHeight(sx, sz), sz);
  statue.rotation.y = 0;
  statue.scale.setScalar(1.8);
  v.decor.add(statue);
  const base = v.box(
    20,
    4,
    20,
    mat("#9a9388"),
    sx,
    terrainHeight(sx, sz) + 2,
    sz,
  );
  base.castShadow = true;
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
  v.box(2500, 0.2, 2300, mat("#7c8070"), 0, -0.4, 0);
  const facades = ["#f4ecda", "#d8cfbb", "#dad3c6", "#bfc5bf", "#d1bca5"].map(
    (c) => {
      const m = mat(c);
      v.buildingMaterials.push(m);
      return m;
    },
  );
  for (const r of ROADS) {
    const x = (r.start.x + r.end.x) / 2,
      z = (r.start.z + r.end.z) / 2;
    const base = v.box(r.width + 9, 0.28, r.length + 3, concrete, x, -0.1, z);
    base.rotation.y = r.angle;
    const mesh = v.box(r.width, 0.1, r.length + 2, road, x, 0.015, z);
    mesh.rotation.y = r.angle;
    mesh.userData.preserveUV = true;
    const uv = mesh.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, (uv.getX(i) * r.width) / 9, (uv.getY(i) * r.length) / 9);
    const fx = Math.sin(r.angle),
      fz = Math.cos(r.angle),
      rx = fz,
      rz = -fx;
    for (let along = 9; along < r.length - 7; along += 13) {
      for (const offset of r.width > 24
        ? [-r.width / 4, 0, r.width / 4]
        : [0]) {
        const stripe = v.box(
          0.13,
          0.012,
          5.5,
          line,
          r.start.x + fx * along + rx * offset,
          0.081,
          r.start.z + fz * along + rz * offset,
        );
        stripe.rotation.y = r.angle;
      }
    }
    for (const side of [-1, 1]) {
      const m = v.box(
        0.25,
        0.2,
        Math.max(1, r.length - r.width),
        curb,
        x + rx * (r.width / 2 + 0.15) * side,
        0.1,
        z + rz * (r.width / 2 + 0.15) * side,
      );
      m.rotation.y = r.angle;
    }
  }
  // Flat intersection discs join the exact road center lines without gaps.
  for (const node of NODES) {
    const width = Math.max(...node.links.map((l) => ROADS[l.road].width));
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(width / 2 + 0.2, 20),
      road,
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(node.x, 0.072, node.z);
    mesh.receiveShadow = true;
    v.decor.add(mesh);
  }
  for (const b of BUILDINGS) {
    if (b.landmark) continue;
    const facade = facades[b.tint],
      m = v.box(b.w, b.h, b.d, facade, b.x, b.h / 2, b.z);
    m.rotation.y = b.angle;
    for (const y of [1, b.h * 0.25, b.h * 0.5, b.h * 0.75, b.h + 0.3]) {
      const cornice = v.box(b.w + 0.65, 0.32, b.d + 0.65, curb, b.x, y, b.z);
      cornice.rotation.y = b.angle;
    }
    const cap = v.box(b.w + 0.8, 0.55, b.d + 0.8, roof, b.x, b.h + 0.9, b.z);
    cap.rotation.y = b.angle;
    // Light wells and chimneys give the roof a believable silhouette from high chase.
    if (b.h > 20) v.box(2, 2.5, 2, concrete, b.x + 3, b.h + 2.1, b.z - 3);
  }
  streetDetails(v, line);
  clockBuilding(v, facades[1]);
  mountains(v);
  buildTechcrushGarage(v);
  for (const i of [15, 48, 93, 134, 177]) {
    const n = NODES[i];
    if (n) addFlag(v, n.x + 15, n.z, 10, 0.58);
  }
}
function streetDetails(v, line) {
  const metal = mat("#424c4b", { metalness: 0.7, roughness: 0.4 }),
    bark = mat("#625e4e");
  const lamp = mat("#eae1c8", { emissive: "#fff4d8", emissiveIntensity: 0.3 });
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
        if (nearestRoad({ x, z }).distance < r.width / 2 + 1) continue;
        v.box(0.15, 8, 0.15, metal, x, 4, z);
        const arm = v.box(
          2.5,
          0.12,
          0.12,
          metal,
          x - rx * side,
          8,
          z - rz * side,
        );
        arm.rotation.y = r.angle;
        const light = v.box(
          1.2,
          0.12,
          0.55,
          lamp,
          x - rx * side * 2,
          7.95,
          z - rz * side * 2,
        );
        light.rotation.y = r.angle;
        trees.push({
          x: x + fx * 12,
          z: z + fz * 12,
          h: 8 + Math.sin(x * 10) * 1.8,
        });
      }
    }
  }
  v.treePositions = trees;
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.16, 0.3, 1, 7),
    bark,
    trees.length,
  );
  const foliage = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    mat("#ffffff", { roughness: 1 }),
    trees.length * 45,
  );
  const dummy = new THREE.Object3D();
  let i = 0;
  for (const t of trees) {
    dummy.position.set(t.x, t.h * 0.42, t.z);
    dummy.scale.set(1, t.h * 0.8, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    for (let k = 0; k < 45; k++) {
      const a = k * 2.399,
        r = Math.sqrt((k + 0.5) / 45) * 2.75,
        h = Math.sin(k * 1.9) * 1.7;
      dummy.position.set(t.x + Math.sin(a) * r, t.h + h, t.z + Math.cos(a) * r);
      dummy.scale.set(0.72 + (k % 3) * 0.13, 0.8, 0.74);
      dummy.rotation.set(k, 0.4 * k, k);
      dummy.updateMatrix();
      foliage.setMatrixAt(i * 45 + k, dummy.matrix);
      foliage.setColorAt(
        i * 45 + k,
        new THREE.Color(
          ["#647a47", "#48603b", "#768657", "#849054", "#536c40"][k % 5],
        ),
      );
    }
    i++;
  }
  trunks.castShadow = true;
  foliage.castShadow = true;
  foliage.receiveShadow = true;
  v.decor.add(trunks, foliage);
  v.proceduralTrees = [trunks, foliage];
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
  v.decor.add(sign);
  v.box(0.12, 5, 0.12, metal, sign.position.x, 2.5, sign.position.z);
}
export function applyTreeTexture(v, texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = mat("#ffffff", {
    map: texture,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  // Treat the generated pale matte as empty space in the billboard shader.
  // The original RGB source is preserved unchanged, including fine leaf gaps.
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
    if(min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b))>.28) discard;
  `,
    );
  };
  const geometry = new THREE.PlaneGeometry(12, 15);
  geometry.translate(0, 7.35, 0);
  const trees = new THREE.InstancedMesh(
      geometry,
      material,
      v.treePositions.length * 2,
    ),
    dummy = new THREE.Object3D();
  v.treePositions.forEach((t, i) => {
    for (let side = 0; side < 2; side++) {
      dummy.position.set(t.x, 0, t.z);
      dummy.scale.setScalar(t.h / 9);
      dummy.rotation.set(0, i * 0.73 + (side * Math.PI) / 2, 0);
      dummy.updateMatrix();
      trees.setMatrixAt(i * 2 + side, dummy.matrix);
    }
  });
  trees.receiveShadow = true;
  v.decor.add(trees);
  for (const m of v.proceduralTrees) {
    v.decor.remove(m);
    m.geometry.dispose();
    m.material.dispose();
  }
}
