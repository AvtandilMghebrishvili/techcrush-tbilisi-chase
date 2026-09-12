import { reservedExpansion } from "./world-sites.js";
import * as THREE from "./vendor/three.module.js";
import { ROADS, BUILDINGS, nearestRoad, containsPoint } from "./city-map.js";
import { LANDMARKS } from "./district-data.js";
import { inRiver } from "./water.js";
import { groundHeight } from "./terrain.js";
import { nearbyObstacles } from "./spatial-index.js";
// Static, tapered blade clusters. Spatial batches cull as one object and need
// no per-frame JS, per-blade mesh, shadow pass or downloaded texture.
export function buildGrass(view) {
  let seed = 1947;
  const random = () =>
    (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const vertices = [],
    colors = [];
  for (let i = 0; i < 7; i++) {
    const angle = random() * Math.PI * 2,
      x = (random() - 0.5) * 1.1,
      z = (random() - 0.5) * 1.1;
    const dx = Math.cos(angle) * 0.022,
      dz = Math.sin(angle) * 0.022,
      h = 0.16 + random() * 0.25;
    vertices.push(
      x - dx,
      0,
      z - dz,
      x + dx,
      0,
      z + dz,
      x + dx * 0.3 + 0.045,
      h * 0.6,
      z + dz * 0.3,
      x - dx,
      0,
      z - dz,
      x + dx * 0.3 + 0.045,
      h * 0.6,
      z + dz * 0.3,
      x + 0.08,
      h,
      z + 0.01,
    );
    for (let j = 0; j < 6; j++) {
      const c = new THREE.Color(j % 3 === 2 ? "#9ba26a" : "#4f6839");
      colors.push(c.r, c.g, c.b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const tiles = new Map();
  let total = 0;
  function place(x, z) {
    if (total >= 6500 || inRiver({ x, z })) return;
    const road = nearestRoad({ x, z });
    if (
      reservedExpansion({ x, z, w: 1, d: 1, angle: 0 }) ||
      road.distance < road.road.width / 2 + 4.5 ||
      nearbyObstacles(BUILDINGS, x, z, 2).some((b) => containsPoint(b, x, z, 2))
    )
      return;
    const y = Math.max(0.025, groundHeight(x, z) + 0.04);
    const key = Math.floor(x / 120) + ":" + Math.floor(z / 120);
    if (!tiles.has(key)) tiles.set(key, []);
    tiles
      .get(key)
      .push({ x, y, z, angle: random() * 6.28, scale: 0.7 + random() * 0.65 });
    total++;
  }
  for (const r of ROADS) {
    if (/Bridge/.test(r.name)) continue;
    for (let t = 5; t < r.length; t += 8)
      for (const side of [-1, 1]) {
        const offset = side * (r.width / 2 + 6 + random() * 3);
        for (let i = 0; i < 3; i++)
          place(
            r.start.x +
              Math.sin(r.angle) * t +
              Math.cos(r.angle) * offset +
              (random() - 0.5) * 3,
            r.start.z +
              Math.cos(r.angle) * t -
              Math.sin(r.angle) * offset +
              (random() - 0.5) * 3,
          );
      }
  }
  const p = LANDMARKS.rike;
  for (let x = -108; x < 110; x += 6)
    for (let z = -215; z < 215; z += 6)
      if ((x / 112) ** 2 + (z / 220) ** 2 < 1)
        place(p.x + x + (random() - 0.5) * 3, p.z + z + (random() - 0.5) * 3);
  const object = new THREE.Object3D();
  for (const points of tiles.values()) {
    const mesh = new THREE.InstancedMesh(geometry, material, points.length);
    points.forEach((p, i) => {
      object.position.set(p.x, p.y, p.z);
      object.rotation.y = p.angle;
      object.scale.setScalar(p.scale);
      object.updateMatrix();
      mesh.setMatrixAt(i, object.matrix);
    });
    mesh.computeBoundingSphere();
    mesh.receiveShadow = true;
    view.decor.add(mesh);
  }
  view.grassCount = total;
}
