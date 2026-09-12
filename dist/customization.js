import * as THREE from "./vendor/three.module.js";
import { TIERS } from "./progression.js";

export const PAINTS = [
  ["Rosso", "#d52230"],
  ["Solar", "#efce38"],
  ["Glacier", "#e1e8ec"],
  ["Graphite", "#303944"],
  ["Electric", "#2478d6"],
  ["Jade", "#178a76"],
  ["Violet", "#8750c8"],
  ["Copper", "#b76239"],
];
export const paintColor = (equipment, fallback) =>
  /^#[0-9a-f]{6}$/i.test(equipment?.paint || "") ? equipment.paint : fallback;
export const tierValue = (n) =>
  Math.max(0, Math.min(8, Math.floor(Number(n) || 0)));
export const metal = (color, roughness = 0.27) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.88, roughness });
export function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
export const box = (p, w, h, d, m, x = 0, y = 0, z = 0) =>
  mesh(p, new THREE.BoxGeometry(w, h, d), m, x, y, z);
const ring = (p, r, t, m, x, y, z) =>
  mesh(p, new THREE.TorusGeometry(r, t, 8, 48), m, x, y, z);

// Dimensions are in metres. All wheel variants keep the same rolling radius and hub.
export function makeWheel(equipment = {}, side = 1, radius = 0.35) {
  const root = new THREE.Group(),
    rims = tierValue(equipment.rims),
    tires = tierValue(equipment.tires),
    brakes = tierValue(equipment.brakes);
  root.name = "wheel-kit";
  root.userData.tiers = { rims, tires, brakes };
  const rim = metal(TIERS[rims].color),
    dark = metal("#1a2026", 0.5),
    steel = metal("#a8afb4", 0.34);
  const rubber = new THREE.MeshStandardMaterial({
    color: "#111315",
    roughness: 0.95,
  });
  const width = 0.23 + tires * 0.009,
    outer = side * (width / 2 + 0.007),
    r = radius;
  const tire = mesh(root, new THREE.CylinderGeometry(r, r, width, 64), rubber);
  tire.rotation.z = Math.PI / 2;
  const disc = mesh(
    root,
    new THREE.CylinderGeometry(r * 0.65, r * 0.65, 0.018, 48),
    steel,
    outer - side * 0.027,
  );
  disc.rotation.z = Math.PI / 2;
  const lip = ring(root, r * 0.73, 0.014, rim, outer, 0, 0);
  lip.rotation.y = Math.PI / 2;
  const inner = ring(root, r * 0.87, 0.007, dark, outer - side * 0.006, 0, 0);
  inner.rotation.y = Math.PI / 2;
  const spokes = [5, 5, 7, 10, 6, 9, 8, 11, 12][rims];
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    for (const offset of rims >= 4 ? [-0.065, 0.065] : [0]) {
      const spoke = box(
        root,
        0.026,
        r * 0.62,
        rims === 2 ? 0.024 : 0.035,
        rim,
        outer,
        Math.cos(a + offset) * r * 0.37,
        Math.sin(a + offset) * r * 0.37,
      );
      spoke.rotation.x = a + offset;
    }
  }
  const hub = mesh(
    root,
    new THREE.CylinderGeometry(r * 0.17, r * 0.17, 0.035, 24),
    rim,
    outer + side * 0.006,
  );
  hub.rotation.z = Math.PI / 2;
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    mesh(
      root,
      new THREE.SphereGeometry(0.009, 6, 4),
      steel,
      outer + side * 0.026,
      Math.cos(a) * 0.037,
      Math.sin(a) * 0.037,
    );
  }
  // Actual tread bars and sidewall band distinguish touring, road sport, semi-slick and track tires.
  const count = [28, 32, 36, 40, 0, 0, 0, 0, 0][tires];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const tread = box(
      root,
      width * 0.82,
      0.006,
      tires >= 3 ? 0.012 : 0.021,
      dark,
      0,
      Math.cos(a) * (r + 0.001),
      Math.sin(a) * (r + 0.001),
    );
    tread.rotation.x = a;
  }
  if (tires) {
    const band = ring(
      root,
      r * 0.91,
      0.005,
      metal(TIERS[tires].color, 0.55),
      outer,
      0,
      0,
    );
    band.rotation.y = Math.PI / 2;
  }
  // Caliper is a stationary sibling of the wheel at installation time.
  const caliper = box(
    root,
    0.052,
    0.12,
    0.075,
    metal(TIERS[brakes].color, 0.35),
    outer - side * 0.039,
    r * 0.42,
    -r * 0.36,
  );
  caliper.name = "brake-caliper";
  if (brakes > 1)
    for (let i = 0; i < 16 + brakes * 4; i++) {
      const a = (i / (16 + brakes * 4)) * Math.PI * 2;
      const hole = mesh(
        root,
        new THREE.CircleGeometry(0.008, 6),
        dark,
        outer - side * 0.016,
        Math.cos(a) * r * 0.52,
        Math.sin(a) * r * 0.52,
      );
      hole.rotation.y = (side * Math.PI) / 2;
    }
  return root;
}

export function makeSpoiler(
  tier,
  width = 1.65,
  baseY = 0.8,
  z = -1.85,
  stockWing = false,
) {
  tier = tierValue(tier);
  const root = new THREE.Group();
  root.name = "rear-wing";
  root.userData.tier = tier;
  if (!tier && !stockWing) return root;
  const height = baseY + 0.14 + tier * 0.075,
    carbon = metal("#202730", 0.4),
    finish = metal(TIERS[tier].color);
  const span = width + tier * 0.035,
    depth = 0.23 + tier * 0.025;
  for (const s of [-1, 1]) {
    box(
      root,
      0.052,
      height - baseY,
      0.11,
      carbon,
      s * width * 0.32,
      (height + baseY) / 2,
      z,
    );
    box(root, 0.14, 0.028, 0.2, carbon, s * width * 0.32, baseY + 0.006, z);
  }
  const wing = box(root, span, 0.048, depth, carbon, 0, height, z);
  wing.rotation.x = -0.045 * tier;
  box(root, span, 0.018, 0.024, finish, 0, height + 0.025, z - depth / 2);
  if (tier >= 2)
    for (const s of [-1, 1])
      box(
        root,
        0.027,
        0.11 + tier * 0.013,
        depth + 0.04,
        finish,
        (s * span) / 2,
        height + 0.024,
        z,
      );
  if (tier >= 4)
    box(
      root,
      span * 0.91,
      0.023,
      depth * 0.48,
      carbon,
      0,
      height + 0.105,
      z - 0.065,
    );
  return root;
}

// Install replacement assemblies on existing hubs, never on an approximate wheelbase.
export function installWheelKits(car, equipment, { classic = false } = {}) {
  if (classic && !equipment.rims && !equipment.tires && !equipment.brakes)
    return;
  car.updateMatrixWorld(true);
  const old = car.userData.wheels || [],
    centers = old.map((w) =>
      car.worldToLocal(w.getWorldPosition(new THREE.Vector3())),
    );
  const wheels = [],
    pivots = [];
  old.forEach((w) => {
    w.visible = false;
  });
  for (const center of centers) {
    const pivot = new THREE.Group();
    pivot.position.copy(center);
    car.add(pivot);
    const kit = makeWheel(
      equipment,
      Math.sign(center.x),
      classic ? Math.min(0.37, Math.max(0.32, center.y)) : 0.35,
    );
    pivot.add(kit);
    wheels.push(kit);
    if (center.z > 0) pivots.push(pivot);
    const caliper = kit.getObjectByName("brake-caliper");
    pivot.attach(caliper);
  }
  car.userData.wheels = wheels;
  car.userData.wheelSteering = pivots;
}

export function addExteriorKit(car, equipment, id) {
  const classic = id === "classic",
    shape = car.userData.bodySurface;
  const z = classic
    ? -1.82
    : -(id === "gt" ? 4.5 : id === "rally" ? 4.8 : 5) / 2 + 0.4;
  const baseY = classic ? 0.82 : shape.top(0.53, z);
  car.add(
    makeSpoiler(
      equipment.spoiler,
      classic ? 1.75 : 1.6,
      baseY,
      z,
      id === "rally",
    ),
  );
  car.userData.equipment = { ...equipment };
}
