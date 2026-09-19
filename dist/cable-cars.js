import * as THREE from "./vendor/three.module.js";
import { cableLoopPoint, cableLoopPhase } from "./cable-path.js";

export function buildCableCars(v, root, start, end, count) {
  const steel = new THREE.MeshStandardMaterial({
    color: "#525e66",
    metalness: 0.75,
    roughness: 0.32,
  });
  const paint = new THREE.MeshStandardMaterial({
    color: "#c82148",
    metalness: 0.3,
    roughness: 0.35,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: "#587f8e",
    metalness: 0.55,
    roughness: 0.17,
  });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const part = (parent, w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(cube, mat);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const curve = new THREE.Curve();
  curve.getPoint = (t, target = new THREE.Vector3()) => {
    const p = cableLoopPoint(start, end, t);
    return target.set(p.x, p.y, p.z);
  };
  root.add(
    new THREE.Mesh(new THREE.TubeGeometry(curve, 768, 0.07, 5, true), steel),
  );
  v.gondolas = [];
  v.cableBannerMeshes = [];
  for (let i = 0; i < count; i++) {
    const g = new THREE.Group();
    g.userData.dynamic = true;
    root.add(g);
    const side = i % 2 ? 1 : -1;
    part(g, 0.38, 0.26, 1.3, steel, 0, 5.02, 0); // cable clamp stays exactly on the cable
    part(g, 0.13, 3.2, 0.13, steel, 0, 3.35, 0);
    part(g, 3.4, 0.22, 2.75, steel, 0, 1.65, 0);
    part(g, 3.2, 1.35, 2.55, glass, 0, 0.75, 0);
    part(g, 3.25, 1.15, 2.6, paint, 0, -0.5, 0);
    part(g, 3.42, 0.2, 2.78, steel, 0, -1.14, 0);
    for (const x of [-1.61, 1.61])
      for (const z of [-1.3, 1.3])
        part(g, 0.095, 2.65, 0.095, steel, x, 0.16, z);
    for (const x of [-1.635, 1.635])
      part(g, 0.06, 1.6, 0.08, steel, x, 0.65, 0);
    for (const sign of [-1, 1]) {
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
      banner.position.set(0, -0.49, sign * 1.307);
      banner.rotation.y = sign < 0 ? Math.PI : 0;
      g.add(banner);
      v.cableBannerMeshes.push({
        mesh: banner,
        brand: i % 2 ? "techcrush" : "robotics",
      });
    }
    const cabin = { group: g, start, end, side, offset: i / count };
    v.gondolas.push(cabin);
    placeCabin(cabin, 0);
  }
}
function placeCabin(cabin, time) {
  const { start, end } = cabin,
    length = Math.hypot(end.x - start.x, end.z - start.z);
  const p = cableLoopPoint(
    start,
    end,
    cableLoopPhase(time, cabin.offset, length),
  );
  cabin.group.position.set(p.x, p.y - 5, p.z);
  cabin.group.rotation.y = p.heading;
}
export function updateCableCars(v, time) {
  for (const cabin of v.gondolas || []) placeCabin(cabin, time);
}
