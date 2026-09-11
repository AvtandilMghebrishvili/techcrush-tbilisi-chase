import * as THREE from "./vendor/three.module.js";
import { ROAD_SURFACE } from "./road-surface-data.js";
export function surfaceGeometry(polygons, height) {
  const positions = [],
    uvs = [];
  for (const polygon of polygons) {
    const rings = polygon.map((r) =>
      r.slice(0, -1).map(([x, z]) => new THREE.Vector2(x, z)),
    );
    const points = rings.flat();
    const triangles = THREE.ShapeUtils.triangulateShape(
      rings[0],
      rings.slice(1),
    );
    for (const triangle of triangles) {
      const [a, b, c] = triangle.map((i) => points[i]);
      // X/Z triangulation must face upward in the Y-up game world.
      const ordered =
        (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0
          ? [a, c, b]
          : [a, b, c];
      for (const p of ordered) {
        positions.push(p.x, height, p.y);
        uvs.push(p.x / 9, p.y / 9);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}
export function buildRoadSurface(v, road, concrete, curb) {
  for (const [polygons, height, material] of [
    [ROAD_SURFACE.asphalt, 0.065, road],
    [ROAD_SURFACE.sidewalk, 0.18, concrete],
  ]) {
    const mesh = new THREE.Mesh(surfaceGeometry(polygons, height), material);
    mesh.receiveShadow = true;
    v.decor.add(mesh);
  }
  // One uninterrupted curb wall follows every outer edge and city block island.
  const p = [];
  for (const polygon of ROAD_SURFACE.asphalt)
    for (const ring of polygon)
      for (let i = 1; i < ring.length; i++) {
        const [ax, az] = ring[i - 1],
          [bx, bz] = ring[i];
        p.push(
          ax,
          0.065,
          az,
          bx,
          0.18,
          bz,
          bx,
          0.065,
          bz,
          ax,
          0.065,
          az,
          ax,
          0.18,
          az,
          bx,
          0.18,
          bz,
        );
      }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  geometry.computeVertexNormals();
  const material = curb.clone();
  material.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  v.decor.add(mesh);
}
