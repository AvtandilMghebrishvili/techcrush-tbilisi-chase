import * as THREE from "./vendor/three.module.js";
import { makeSedan, mergeCarParts } from "./patrol-car.js";
import { makePatrolHealthBar } from "./effects.js";
const material = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.43,
    metalness: 0.58,
    ...extra,
  });
function builder(root) {
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = root) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const box = (w, h, d, mat, x = 0, y = 0, z = 0, parent = root) =>
    mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  const beam = (a, b, r, mat, parent = root) => {
    const p = new THREE.Vector3(...a),
      q = new THREE.Vector3(...b),
      dir = q.clone().sub(p);
    const m = mesh(
      new THREE.CylinderGeometry(r, r, dir.length(), 10),
      mat,
      0,
      0,
      0,
      parent,
    );
    m.position.copy(p).add(q).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    return m;
  };
  return { mesh, box, beam };
}
function policeDecal() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = "#123460";
  x.fillRect(0, 0, 512, 128);
  x.fillStyle = "white";
  x.font = "bold 62px Arial";
  x.textAlign = "center";
  x.fillText("POLICE · 112", 256, 86);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.disposable = true;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 });
}
export function makeTank() {
  const g = new THREE.Group();
  g.name = "Heavy tracked police blockade";
  g.userData.kind = "tank";
  const { mesh, box } = builder(g),
    paint = material("#526a78"),
    dark = material("#1b232a"),
    steel = material("#8196a1"),
    rubber = material("#11171b", { metalness: 0.1 });
  box(2.7, 0.65, 5.4, paint, 0, 0.9, 0);
  box(2.62, 0.18, 4.8, steel, 0, 1.29, 0);
  for (const sign of [-1, 1]) {
    box(0.53, 0.77, 5.7, rubber, sign * 1.3, 0.61, 0);
    for (let i = 0; i < 7; i++) {
      const z = -2.28 + i * 0.76;
      const wheel = mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.56, 16),
        steel,
        sign * 1.3,
        0.61,
        z,
      );
      wheel.rotation.z = Math.PI / 2;
      const hub = mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.57, 12),
        dark,
        sign * 1.3,
        0.61,
        z,
      );
      hub.rotation.z = Math.PI / 2;
    }
    for (let i = 0; i < 18; i++)
      for (const y of [0.2, 1.02])
        box(0.58, 0.075, 0.17, steel, sign * 1.3, y, -2.73 + i * 0.32);
    box(0.1, 0.45, 4.9, paint, sign * 1.57, 1.02, -0.1);
    const decal = mesh(
      new THREE.PlaneGeometry(2.2, 0.42),
      policeDecal(),
      sign * 1.63,
      1.05,
      0,
    );
    decal.rotation.y = (sign * Math.PI) / 2;
  }
  const nose = box(2.68, 0.5, 1.2, paint, 0, 1.15, 2.42);
  nose.rotation.x = 0.22;
  const turret = new THREE.Group();
  turret.position.set(0, 1.46, -0.12);
  g.add(turret);
  mesh(new THREE.CylinderGeometry(1.02, 1.16, 0.25, 16), dark, 0, 0, 0, turret);
  const upper = box(1.9, 0.73, 2.1, paint, 0, 0.43, 0, turret);
  upper.rotation.x = -0.05;
  mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.13, 16),
    steel,
    -0.4,
    0.89,
    -0.3,
    turret,
  );
  const barrel = mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 2.6, 16),
    steel,
    0,
    0.53,
    2.05,
    turret,
  );
  barrel.rotation.x = Math.PI / 2;
  const muzzle = mesh(
    new THREE.CylinderGeometry(0.19, 0.19, 0.37, 12),
    dark,
    0,
    0.53,
    3.35,
    turret,
  );
  muzzle.rotation.x = Math.PI / 2;
  box(0.75, 0.12, 0.3, dark, 0, 0.94, 0.08, turret);
  const lights = ["#f52446", "#2683ff"].map((color) =>
    material(color, { emissive: color, emissiveIntensity: 5 }),
  );
  lights.forEach((m, i) =>
    box(0.32, 0.13, 0.24, m, (i ? 1 : -1) * 0.2, 1.07, 0.08, turret),
  );
  const lamp = material("#d5eafa", {
    emissive: "#d5eafa",
    emissiveIntensity: 1.5,
  });
  for (const x of [-0.96, 0.96]) box(0.22, 0.16, 0.09, lamp, x, 1.17, 3.03);
  const hp = makePatrolHealthBar();
  hp.sprite.position.y = 3.5;
  g.add(hp.sprite);
  g.userData.healthBar = hp;
  g.userData.lights = lights;
  g.userData.turret = turret;
  mergeCarParts(g);
  return g;
}
export function makePoliceVehicle(view, cop) {
  const g =
    cop.kind === "tank"
      ? makeTank()
      : makeSedan(
          view,
          true,
          "#e5e8e3",
          cop.kind === "suv" ? "patrolSUV" : "modern",
        );
  g.userData.kind = cop.kind;
  return g;
}
export function makeHelicopter() {
  const g = new THREE.Group();
  g.name = "Police air support";
  const { mesh, box, beam } = builder(g),
    paint = material("#d4dce0"),
    blue = material("#16395d"),
    dark = material("#101820"),
    glass = material("#162c3f", { metalness: 0.8, roughness: 0.1 });
  const body = mesh(new THREE.CapsuleGeometry(0.9, 2.3, 6, 18), paint);
  body.rotation.x = Math.PI / 2;
  const canopy = mesh(
    new THREE.SphereGeometry(1, 24, 16),
    glass,
    0,
    0.16,
    1.13,
  );
  canopy.scale.set(0.84, 0.75, 1.22);
  const belly = mesh(new THREE.SphereGeometry(1, 20, 12), blue, 0, -0.45, 0.02);
  belly.scale.set(0.87, 0.49, 1.87);
  const engine = mesh(
    new THREE.CapsuleGeometry(0.5, 1.1, 4, 12),
    paint,
    0,
    0.79,
    -0.6,
  );
  engine.rotation.x = Math.PI / 2;
  const tail = mesh(
    new THREE.CylinderGeometry(0.15, 0.43, 4.7, 14),
    paint,
    0,
    0.16,
    -3.97,
  );
  tail.rotation.x = -Math.PI / 2;
  box(0.09, 1.8, 1.1, blue, 0, 0.61, -6.24);
  box(2.55, 0.08, 0.8, paint, 0, 0.22, -5.7);
  for (const sign of [-1, 1]) {
    beam([sign * 0.9, -1.22, -2.05], [sign * 0.9, -1.22, 2.02], 0.075, dark);
    for (const z of [-0.98, 0.98])
      beam([sign * 0.55, -0.52, z], [sign * 0.9, -1.22, z], 0.065, paint);
    const decal = mesh(
      new THREE.PlaneGeometry(1.82, 0.37),
      policeDecal(),
      sign * 0.905,
      -0.03,
      -0.4,
    );
    decal.rotation.y = (sign * Math.PI) / 2;
  }
  beam([0, 0.9, -0.3], [0, 1.72, -0.3], 0.11, dark);
  const rotor = new THREE.Group();
  rotor.position.set(0, 1.75, -0.3);
  g.add(rotor);
  for (let i = 0; i < 4; i++) {
    const blade = box(0.2, 0.045, 4.45, dark, 0, 0, 2.23, rotor);
    const pivot = new THREE.Group();
    rotor.remove(blade);
    pivot.add(blade);
    pivot.rotation.y = (i * Math.PI) / 2;
    rotor.add(pivot);
  }
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.19, 0.55, -6.25);
  g.add(tailRotor);
  for (let i = 0; i < 2; i++) {
    const b = box(0.055, 0.95, 0.11, dark, 0, 0, 0, tailRotor);
    b.rotation.x = (i * Math.PI) / 2;
  }
  const light = new THREE.SpotLight("#e1f4ff", 2200, 140, 0.37, 0.8, 1.5);
  light.position.set(0, -0.65, 1.1);
  g.add(light);
  const target = new THREE.Object3D();
  target.position.set(0, -54, 0);
  g.add(target);
  light.target = target;
  const beacon = material("#fc2345", {
    emissive: "#fc2345",
    emissiveIntensity: 4,
  });
  mesh(new THREE.SphereGeometry(0.08, 8, 6), beacon, 0, 1.12, -5.9);
  g.userData = { rotor, tailRotor, searchlight: light, searchTarget: target };
  g.scale.setScalar(1.5);
  mergeCarParts(g);
  return g;
}
export function updateHelicopterMesh(mesh, h, time) {
  mesh.visible = !!h;
  if (!h) return;
  mesh.position.set(h.x, h.y, h.z);
  mesh.rotation.y = h.angle;
  mesh.rotation.z = Math.sin(time * 0.5) * 0.045;
  mesh.userData.rotor.rotation.y = h.rotor;
  mesh.userData.tailRotor.rotation.x = h.rotor * 1.4;
  mesh.userData.searchlight.intensity = h.tracking ? 2600 : 1000;
  mesh.updateMatrixWorld(true);
  const target = mesh.worldToLocal(
    new THREE.Vector3(h.lastSeen.x, 0.2, h.lastSeen.z),
  );
  mesh.userData.searchTarget.position.copy(target);
}
