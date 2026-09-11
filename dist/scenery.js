import * as THREE from "./vendor/three.module.js";
import { registerBreakable } from "./breakable-props.js";
import { GRID, GRID_RADIUS, MAP_SIZE, ROAD_EDGE, TOWER } from "./config.js";
import { buildDistantLandmarks, buildTechcrushGarage } from "./landmarks.js";
const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
export function flagTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 256;
  const c = canvas.getContext("2d");
  c.fillStyle = "#fff";
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = "#cf1735";
  c.fillRect(171, 0, 42, 256);
  c.fillRect(0, 107, 384, 42);
  for (const x of [86, 298])
    for (const y of [54, 202]) {
      c.fillRect(x - 7, y - 25, 14, 50);
      c.fillRect(x - 25, y - 7, 50, 14);
    }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function beam(parent, a, b, r, material) {
  const aa = new THREE.Vector3(...a),
    bb = new THREE.Vector3(...b);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, aa.distanceTo(bb), 6),
    material,
  );
  mesh.position.copy(aa).add(bb).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    bb.sub(aa).normalize(),
  );
  parent.add(mesh);
  return mesh;
}
export function addFlag(v, x, z, height = 11, scale = 1) {
  const pole = mat("#9caaa7");
  const root=new THREE.Group();
  root.position.set(x,0,z);
  v.decor.add(root);
  registerBreakable(v,root,x,z,height);
  v.box(0.18, height, 0.18, pole, 0, height / 2, 0, root);
  const geo = new THREE.PlaneGeometry(6 * scale, 4 * scale, 12, 5);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      map: v.georgiaFlag,
      side: THREE.DoubleSide,
      roughness: 0.9,
      emissive: "#ffffff",
      emissiveMap: v.georgiaFlag,
      emissiveIntensity: 0.2,
    }),
  );
  mesh.position.set(3 * scale, height - 2 * scale, 0);
  root.add(mesh);
  v.flags.push(mesh);
}
export function tower(v) {
  const g = new THREE.Group();
  g.position.set(TOWER.x, TOWER.y || 0, TOWER.z);
  v.decor.add(g);
  const white = mat("#d1c7bc"),
    red = mat("#a63c37"),
    steel = mat("#708994"),
    glass = mat("#264b65", { metalness: 0.55, roughness: 0.3 });
  v.box(32, 1, 32, mat("#bbafa0"), 0, 0.5, 0, g);
  const radius = (y) => 15 * (1 - y / 105) + 2;
  for (let leg = 0; leg < 3; leg++) {
    const a = (leg * Math.PI * 2) / 3;
    for (let y = 1; y < 105; y += 13) {
      const r = radius(y),
        r2 = radius(y + 13),
        next = a + (Math.PI * 2) / 3;
      beam(
        g,
        [Math.cos(a) * r, y, Math.sin(a) * r],
        [Math.cos(a) * r2, y + 13, Math.sin(a) * r2],
        0.85,
        y % 26 < 13 ? white : red,
      );
      beam(
        g,
        [Math.cos(a) * r, y, Math.sin(a) * r],
        [Math.cos(next) * r2, y + 13, Math.sin(next) * r2],
        0.28,
        steel,
      );
    }
  }
  for (const [y, r, h, m] of [
    [98, 11, 3, white],
    [104, 9, 8, glass],
    [109, 12, 2, red],
    [130, 3, 37, white],
    [158, 2, 20, red],
    [178, 1, 20, white],
  ]) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), m);
    mesh.position.y = y;
    g.add(mesh);
  }
  const light = new THREE.Mesh(
    new THREE.SphereGeometry(1.25, 8, 6),
    new THREE.MeshBasicMaterial({ color: "#ff3146" }),
  );
  light.position.y = 189;
  g.add(light);
  v.towerLight = light;
}
export function buildGeorgianCity(v) {
  v.decor = new THREE.Group();
  v.decor.userData.environment = true;
  v.scene.add(v.decor);
  v.flags = [];
  v.georgiaFlag = flagTexture();
  const road = mat("#293846"),
    concrete = mat("#82918f"),
    line = mat("#e4dfc9"),
    roof = mat("#824d3f"),
    trim = mat("#d7c6a3"),
    dark = mat("#27394a");
  v.roadMaterial = road;
  v.buildingMaterials = [];
  v.oldTownMaterials = [];
  v.box(MAP_SIZE + 180, 0.3, MAP_SIZE + 180, mat("#384d49"), 0, -0.6, 0);
  for (let i = -GRID_RADIUS; i <= GRID_RADIUS; i++) {
    v.box(30, 0.12, MAP_SIZE, road, i * GRID, -0.05, 0);
    v.box(MAP_SIZE, 0.12, 30, road, 0, -0.045, i * GRID);
    for (let j = -MAP_SIZE / 2; j < MAP_SIZE / 2; j += 14)
      if (Math.abs(j / GRID - Math.round(j / GRID)) * GRID > 19) {
        v.box(0.16, 0.015, 6, line, i * GRID, 0.03, j);
        v.box(6, 0.015, 0.16, line, j, 0.035, i * GRID);
      }
  }
  let seed = 44;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const facades = ["#ead7bb", "#d8b28d", "#c5a691", "#a9c1bd", "#cfb88a"].map(
    (c) => {
      const m = mat(c, { emissive: "#a77742", emissiveIntensity: 0.08 });
      v.oldTownMaterials.push(m);
      return m;
    },
  );
  const modern = ["#8294a0", "#6d838a", "#869399"].map((c) => {
    const m = mat(c);
    v.buildingMaterials.push(m);
    return m;
  });
  for (let gx = -GRID_RADIUS; gx < GRID_RADIUS; gx++)
    for (let gz = -GRID_RADIUS; gz < GRID_RADIUS; gz++) {
      const cx = gx * GRID + 70,
        cz = gz * GRID + 70;
      v.box(106, 0.5, 106, concrete, cx, 0, cz);
      if (gx === -1 && gz === 1) {
        v.box(94, 0.12, 94, mat("#507058"), cx, 0.31, cz);
        continue;
      }
      for (let a = 0; a < 2; a++)
        for (let b = 0; b < 2; b++) {
          const x = cx + (a - 0.5) * 51,
            z = cz + (b - 0.5) * 51,
            w = 37 + rng() * 5,
            d = 37 + rng() * 5;
          const isModern = Math.abs(gx) > 2 && Math.abs(gz) > 2 && rng() > 0.5;
          const h = isModern ? 26 + rng() * 22 : 7 + rng() * 14;
          v.box(
            w,
            h,
            d,
            isModern
              ? modern[Math.floor(rng() * modern.length)]
              : facades[Math.floor(rng() * facades.length)],
            x,
            h / 2 + 0.3,
            z,
          );
          v.box(w + 1, 0.65, d + 1, isModern ? dark : roof, x, h + 0.6, z);
          if (!isModern) {
            // Terracotta hipped roof and carved-balcony silhouettes frame the texture.
            const top = new THREE.Mesh(
              new THREE.ConeGeometry(Math.max(w, d) * 0.73, 4, 4),
              roof,
            );
            top.rotation.y = Math.PI / 4;
            top.scale.z = d / w;
            top.position.set(x, h + 2.8, z);
            v.decor.add(top);
            for (const side of [-1, 1]) {
              v.box(
                w - 3,
                0.35,
                2.1,
                trim,
                x,
                h * 0.51,
                z + side * (d / 2 + 0.7),
              );
              v.box(
                w - 3,
                0.18,
                0.2,
                dark,
                x,
                h * 0.51 + 1.4,
                z + side * (d / 2 + 1.65),
              );
              for (let k = -w / 2 + 3; k < w / 2 - 2; k += 3)
                v.box(
                  0.15,
                  1.4,
                  0.15,
                  dark,
                  x + k,
                  h * 0.51 + 0.7,
                  z + side * (d / 2 + 1.65),
                );
            }
          }
        }
    }
  const lamp = mat("#36494c"),
    glow = mat("#ffebbe", { emissive: "#ffcf85", emissiveIntensity: 2.3 });
  for (let g = -GRID_RADIUS; g <= GRID_RADIUS; g++)
    for (let z = -ROAD_EDGE + 25; z < ROAD_EDGE; z += 70) {
      if (Math.abs(z / GRID - Math.round(z / GRID)) * GRID < 20) continue;
      for (const side of [-1, 1]) {
        const x = g * GRID + side * 17;
        v.box(0.25, 8, 0.25, lamp, x, 4, z);
        v.box(2.6, 0.2, 0.3, lamp, x - side * 1, 8, z);
        v.box(1.5, 0.12, 0.7, glow, x - side * 1.9, 7.9, z);
      }
    }
  for (let x = -ROAD_EDGE; x <= ROAD_EDGE; x += GRID)
    for (let z = -ROAD_EDGE; z <= ROAD_EDGE; z += GRID)
      for (let p = -11; p <= 11; p += 3) {
        v.box(1.4, 0.015, 4, line, x + p, 0.04, z - 19);
        v.box(4, 0.015, 1.4, line, x - 19, 0.04, z + p);
      }
  for (const [x, z] of [
    [17, 18],
    [-17, 85],
    [157, 118],
    [-157, 118],
    [297, -70],
    [-297, -258],
    [17, 398],
    [-123, 252],
  ])
    addFlag(v, x, z);
  tower(v);
  buildDistantLandmarks(v);
  buildTechcrushGarage(v);
}
export function updateScenery(v, time) {
  for (const flag of v.flags) {
    const pos = flag.geometry.attributes.position;
    const w = flag.geometry.parameters.width;
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) + w / 2) / w;
      pos.setZ(i, Math.sin(time * 3 + u * 7) * u * 0.55);
    }
    pos.needsUpdate = true;
    flag.geometry.computeVertexNormals();
  }
  if (v.towerLight) v.towerLight.visible = Math.sin(time * 2) > -0.2;
}
