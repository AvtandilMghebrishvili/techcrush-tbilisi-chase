import { addCabinDetails } from "./interior-detail.js";
import { installWheelKits, addExteriorKit } from "./customization.js";
import * as THREE from "./vendor/three.module.js";
import {
  bindSteering,
  makeSteering,
  addHeadlights,
} from "./vehicle-details.js";

import { MODEL_SHAPES } from "./vehicle-designs.js";
import { makeCyberPickup } from "./cyber-pickup.js";
export { MODEL_SHAPES };
export function bodySurface(shape, rounded = true) {
  const curve = new THREE.CatmullRomCurve3(
    shape.stations.map((p) => new THREE.Vector3(...p)),
  );
  const sections = Array.from({ length: 97 }, (_, i) => {
    if (rounded) return curve.getPoint(i / 96).toArray();
    const at = (i / 96) * (shape.stations.length - 1),
      a = Math.min(shape.stations.length - 2, Math.floor(at)),
      t = at - a;
    return shape.stations[a].map((v, k) =>
      THREE.MathUtils.lerp(v, shape.stations[a + 1][k], t),
    );
  });
  const section = (z) => {
    z = THREE.MathUtils.clamp(z, sections[0][0], sections.at(-1)[0]);
    let i = 1;
    while (i < sections.length - 1 && sections[i][0] < z) i++;
    const a = sections[i - 1],
      b = sections[i],
      t = (z - a[0]) / (b[0] - a[0]);
    return {
      w: THREE.MathUtils.lerp(a[1], b[1], t),
      h: THREE.MathUtils.lerp(a[2], b[2], t),
    };
  };
  const top = (x, z) => {
    const { w, h } = section(z);
    return 0.29 + (h - 0.29) * Math.pow(Math.max(0, 1 - (x / w) ** 2), 0.135);
  };
  const side = (fraction, z, sign) => {
    const { w, h } = section(z);
    return new THREE.Vector3(
      sign * w * Math.sqrt(1 - fraction ** (2 / 0.27)),
      0.29 + (h - 0.29) * fraction,
      z,
    );
  };
  return { sections, section, top, side };
}
export function makeOriginalSportsCar(id, color, equipment = {}) {
  if (id === "creator") return makeCyberPickup(color, equipment);
  const shape = MODEL_SHAPES[id] || MODEL_SHAPES.gt,
    group = new THREE.Group(),
    skin = bodySurface(shape, id !== "rally" && !shape.angular);
  group.name = shape.name;
  const paint = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.7,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.13,
    side: THREE.DoubleSide,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#172027",
    roughness: 0.46,
    metalness: 0.3,
    side: THREE.DoubleSide,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: "#b9c7cb",
    metalness: 1,
    roughness: 0.26,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#2a414d",
    metalness: 0.3,
    roughness: 0.1,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const lens = new THREE.MeshStandardMaterial({
    color: "#c8e3ed",
    emissive: "#acd8e8",
    emissiveIntensity: 0.75,
    metalness: 0.3,
    roughness: 0.18,
    side: THREE.DoubleSide,
  });
  const tail = new THREE.MeshStandardMaterial({
    color: "#bd1232",
    emissive: "#f32039",
    emissiveIntensity: 1.2,
    side: THREE.DoubleSide,
  });
  const add = (geo, mat, pos = [0, 0, 0], parent = group) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const box = (w, h, d, mat, x, y, z, parent = group) =>
    add(new THREE.BoxGeometry(w, h, d), mat, [x, y, z], parent);
  const tube = (points, r, mat, parent = group) => {
    const path = new THREE.CurvePath(),
      p = points.map((v) => (Array.isArray(v) ? new THREE.Vector3(...v) : v));
    for (let i = 1; i < p.length; i++)
      path.add(new THREE.LineCurve3(p[i - 1], p[i]));
    return add(
      new THREE.TubeGeometry(path, Math.max(8, points.length * 3), r, 8, false),
      mat,
      [0, 0, 0],
      parent,
    );
  };
  const mesh = (points, indices, mat, name) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        points.flatMap((p) => (p.toArray ? p.toArray() : p)),
        3,
      ),
    );
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const m = add(geo, mat);
    m.name = name;
    return m;
  };
  const quad = (p, mat, name) => mesh(p, [0, 1, 2, 0, 2, 3], mat, name);
  const cabin = shape.cabin,
    cabinShift = cabin.shift || 0,
    cabinLift = cabin.lift || 0;
  const cabinRoot = new THREE.Group();
  cabinRoot.name = "cabin-shell";
  cabinRoot.position.set(0, cabinLift, cabinShift);
  group.add(cabinRoot);
  const cols = shape.angular ? 16 : 32,
    positions = [],
    indices = [];
  for (const [z, w, h] of skin.sections)
    for (let j = 0; j <= cols; j++) {
      const a = (j / cols) * Math.PI,
        x = Math.cos(a) * w,
        dz = z - (Math.sign(z) * shape.wheelbase) / 2;
      let y = 0.29 + (h - 0.29) * Math.sin(a) ** 0.27;
      // Lift the lower outer shell into an actual wheel opening. Its rolled edge
      // and arch trim share the same curve, rather than floating outside the fender.
      if (Math.abs(x) > w * 0.72 && Math.abs(dz) < 0.397)
        y = Math.max(y, 0.36 + Math.sqrt(0.397 ** 2 - dz ** 2));
      positions.push([x, y, z]);
    }
  for (let row = 0; row < skin.sections.length - 1; row++)
    for (let j = 0; j < cols; j++) {
      const a = row * (cols + 1) + j;
      for (const tri of [
        [a, a + 1, a + cols + 1],
        [a + 1, a + cols + 2, a + cols + 1],
      ]) {
        // Leave a real opening under the cabin rather than a painted body surface
        // passing through the footwell, seats and driver camera.
        const center = tri.reduce(
          (sum, k) => sum.map((v, i) => v + positions[k][i] / 3),
          [0, 0, 0],
        );
        if (
          !(
            Math.abs(center[0]) < 0.64 &&
            center[2] > -1.04 + cabinShift &&
            center[2] < 0.64 + cabinShift
          )
        )
          indices.push(...tri);
      }
    }
  for (const row of [0, skin.sections.length - 1]) {
    const n = positions.length,
      start = row * (cols + 1);
    positions.push([0, 0.29, skin.sections[row][0]]);
    for (let j = 0; j < cols; j++) indices.push(n, start + j, start + j + 1);
  }
  mesh(positions, indices, paint, "body-shell");
  box(shape.width * 0.78, 0.12, shape.length * 0.91, dark, 0, 0.26, 0);
  // Fitted glass panes and pillars meet the body at their lower corners.
  const roofRear = cabin.roofRear,
    roofFront = cabin.roofFront,
    roofHalf = cabin.half;
  const corner = (s, z, y, w) => [s * w, y, z];
  const rear = (s) =>
    corner(s, cabin.rear, skin.top(s * 0.72, cabin.rear) + 0.003, 0.72);
  const front = (s) =>
    corner(s, cabin.front, skin.top(s * 0.72, cabin.front) + 0.003, 0.72);
  const rr = (s) => corner(s, roofRear, shape.roof, roofHalf);
  const rf = (s) => corner(s, roofFront, shape.roof, roofHalf);
  quad([front(-1), front(1), rf(1), rf(-1)], glass, "windscreen");
  if (!shape.openTop) {
    quad([rear(1), rear(-1), rr(-1), rr(1)], glass, "rear-window");
    quad([rr(-1), rf(-1), rf(1), rr(1)], paint, "roof");
  } else {
    for (const s of [-1, 1])
      tube(
        [
          [s * 0.54, 0.91, -0.83],
          [s * 0.54, 1.23, -0.83],
          [s * 0.21, 1.23, -0.83],
          [s * 0.21, 0.91, -0.83],
        ],
        0.043,
        dark,
      );
  }
  for (const s of [-1, 1]) {
    if (!shape.openTop) {
      quad([rear(s), front(s), rf(s), rr(s)], glass, "side-window");
      tube([rear(s), rr(s), rf(s), front(s)], 0.023, paint);
    } else tube([rf(s), front(s)], 0.023, paint);
    tube([rear(s), front(s)], 0.012, dark);
    const anchor = skin.side(0.82, 0.35, s),
      tip = anchor.clone().add(new THREE.Vector3(s * 0.17, 0.13, 0));
    tube([anchor, tip], 0.027, dark);
    box(0.19, 0.095, 0.24, paint, tip.x, tip.y, tip.z);
    box(0.16, 0.062, 0.009, chrome, tip.x, tip.y, tip.z - 0.122);
    const handle = skin.side(0.82, -0.22, s);
    box(0.025, 0.035, 0.16, chrome, handle.x, handle.y, handle.z);
    const sill = skin.side(0.18, 0, s);
    box(0.08, 0.06, 1.65, dark, sill.x, sill.y, -0.05);
    box(0.47, 0.12, 0.48, dark, s * 0.37, 0.6, -0.39, cabinRoot);
    const seat = box(0.48, 0.47, 0.14, dark, s * 0.37, 0.84, -0.67, cabinRoot);
    seat.rotation.x = -0.1;
    box(
      0.25,
      0.14,
      0.12,
      dark,
      s * 0.37,
      Math.min(1.14, shape.roof - cabinLift - 0.13),
      -0.67,
      cabinRoot,
    );
  }
  box(1.31, 0.16, 0.38, dark, 0, 0.83, 0.46, cabinRoot);
  const dash = add(
    new THREE.CapsuleGeometry(0.075, 1.1, 6, 24),
    dark,
    [0, 0.91, 0.4],
    cabinRoot,
  );
  dash.rotation.z = Math.PI / 2;
  box(0.17, 0.1, 0.012, glass, -0.08, 0.94, 0.25, cabinRoot);
  box(0.14, 0.035, 0.58, dark, 0, 0.66, -0.1, cabinRoot);
  const rotor = makeSteering(cabinRoot, dark, chrome, 0.36, 0.98, 0.2);
  bindSteering(group, rotor);
  // Surface patches are sampled from the exact same shell as the body, eliminating floating lamps.
  function patch(cx, cz, w, d, mat, oval = false) {
    const points = [],
      ix = [],
      n = 40,
      offset = mat === lens ? 0.016 : 0.006;
    if (oval) {
      for (let ring = 0; ring <= 12; ring++)
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * Math.PI * 2,
            x = cx + (((Math.cos(a) * w) / 2) * ring) / 12,
            z = cz + (((Math.sin(a) * d) / 2) * ring) / 12;
          points.push([x, skin.top(x, z) + offset, z]);
          if (ring && i) {
            const k = ring * (n + 1) + i;
            ix.push(k, k - 1, k - n - 1, k - 1, k - n - 2, k - n - 1);
          }
        }
    } else {
      for (let z = 0; z <= 4; z++)
        for (let x = 0; x <= 6; x++) {
          const px = cx + (x / 6 - 0.5) * w,
            pz = cz + (z / 4 - 0.5) * d;
          points.push([px, skin.top(px, pz) + offset, pz]);
        }
      for (let z = 0; z < 4; z++)
        for (let x = 0; x < 6; x++) {
          const k = z * 7 + x;
          ix.push(k, k + 1, k + 7, k + 1, k + 8, k + 7);
        }
    }
    const m = mesh(points, ix, mat, "fitted-surface-detail");
    m.geometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(
        points.flatMap((p) => [(p[0] - cx) / w + 0.5, (p[2] - cz) / d + 0.5]),
        2,
      ),
    );
    m.userData.surfaceMounted = true;
    m.userData.mountOffset = offset;
    return m;
  }
  const frontZ = shape.length / 2,
    rearZ = -frontZ;
  const lamps = [];
  for (const s of [-1, 1]) {
    const x = s * (id === "gt" ? 0.64 : 0.67),
      z = frontZ - (id === "gt" ? 0.52 : 0.45);
    patch(
      x,
      z,
      id === "gt" ? 0.34 : 0.51,
      id === "gt" ? 0.4 : 0.22,
      dark,
      id === "gt",
    );
    if (id === "gt") patch(x, z, 0.25, 0.31, lens, true);
    else if (id === "falcon" || id === "rioni") {
      for (const dx of [-0.125, 0.125])
        patch(x + dx, z, 0.19, 0.22, lens, true);
    } else if (id === "coast") patch(x, z, 0.48, 0.055, lens);
    else if (id === "rally") {
      const pts = [
        [x - s * 0.2, z + 0.05],
        [x, z - 0.045],
        [x + s * 0.2, z + 0.05],
      ].map(([px, pz]) => [px, skin.top(px, pz) + 0.017, pz]);
      tube(pts, 0.011, lens);
    } else
      for (let i = 0; i < 4; i++)
        patch(x + (i - 1.5) * 0.113, z, 0.071, 0.15, lens);
    lamps.push({ x, y: skin.top(x, z), z });
    if (id === "falcon")
      box(0.15, 0.25, 0.014, tail, s * 0.69, 0.76, rearZ - 0.007);
    else if (id === "rioni") {
      for (const dx of [-0.14, 0.14]) {
        const light = add(new THREE.CircleGeometry(0.072, 24), tail, [
          s * 0.51 + dx,
          0.66,
          rearZ - 0.008,
        ]);
        light.rotation.y = Math.PI;
      }
    } else
      box(
        id === "coast" ? 0.83 : 0.57,
        0.065,
        0.012,
        tail,
        s * 0.49,
        0.65,
        rearZ - 0.006,
      );
    const pipe = add(
      new THREE.CylinderGeometry(0.071, 0.071, 0.22, 24),
      chrome,
      [s * 0.57, 0.4, rearZ + 0.01],
    );
    pipe.rotation.x = Math.PI / 2;
    const hole = add(new THREE.CircleGeometry(0.052, 24), dark, [
      s * 0.57,
      0.4,
      rearZ - 0.103,
    ]);
    hole.rotation.y = Math.PI;
  }
  // Grilles sit on the closed bumper faces, within their width and height.
  box(id === "suv" ? 0.45 : 1.12, 0.14, 0.015, dark, 0, 0.39, frontZ + 0.007);
  if (id === "suv") {
    for (const s of [-1, 1])
      box(0.024, 0.15, 0.022, chrome, s * 0.235, 0.39, frontZ + 0.015);
    box(0.48, 0.018, 0.022, chrome, 0, 0.47, frontZ + 0.015);
    for (const s of [-1, 1]) {
      const pts = [
        [-1.2, 0.43],
        [-1.2, 0.88],
        [-0.85, 0.98],
        [-0.43, 0.8],
        [-0.45, 0.48],
      ].map(([z, y]) => [s * (skin.section(z).w + 0.004), y, z]);
      tube(pts, 0.028, chrome);
    }
  }
  if (id === "falcon") {
    patch(0, 1.4, 0.7, 0.44, dark);
    for (const s of [-1, 1]) {
      tube(
        [
          [s * 0.73, 1.25, -1.25],
          [s * 0.7, 1.58, -0.83],
          [s * 0.7, 1.58, 0.24],
        ],
        0.025,
        dark,
      );
      for (const z of [-1.0, 0.55])
        box(0.03, 0.03, 0.18, dark, s * 0.975, 0.87, z);
    }
  }
  if (id === "rioni") {
    for (const s of [-1, 1]) patch(s * 0.48, 1.1, 0.17, 0.66, dark);
    box(1.4, 0.22, 0.022, dark, 0, 0.51, frontZ + 0.014);
    for (let i = 0; i < 9; i++)
      box(0.02, 0.19, 0.012, chrome, (i - 4) * 0.143, 0.51, frontZ + 0.029);
  }
  if (id === "coast" || id === "rally") {
    for (const s of [-1, 1]) {
      patch(s * 0.78, -1.57, 0.25, 0.4, dark);
      box(0.13, 0.065, 1.93, dark, s * (shape.width / 2 - 0.05), 0.31, 0);
    }
  }
  for (let i = 0; i < 5; i++)
    patch(0, -1.38 - i * 0.095, id === "rally" ? 1.0 : 0.68, 0.038, dark);
  const wheels = [],
    pivots = [];
  for (const z of [-shape.wheelbase / 2, shape.wheelbase / 2])
    for (const s of [-1, 1]) {
      const hub = new THREE.Group();
      hub.position.set(s * (skin.section(z).w - 0.1), 0.36, z);
      group.add(hub);
      wheels.push(hub);
      tube(
        Array.from({ length: 25 }, (_, i) => {
          const a = (i / 24) * Math.PI,
            zz = z + Math.cos(a) * 0.397;
          return [
            s * (skin.section(zz).w - 0.006),
            0.36 + Math.sin(a) * 0.397,
            zz,
          ];
        }),
        0.016,
        paint,
      );
    }
  Object.assign(group.userData, {
    wheels,
    wheelSteering: pivots,
    paint,
    glass,
    shape: id,
    design: shape,
    aeroMount: { z: -shape.length / 2 + 0.42, width: shape.width * 0.81 },
    cabinLayout: {
      lift: cabinLift,
      shift: cabinShift,
      roof: shape.roof,
      roofRear,
      roofFront,
      openTop: !!shape.openTop,
    },
    equipment: { ...equipment },
    cockpitSeat: { x: 0.36, y: shape.roof - 0.16, z: -0.15 + cabinShift },
    exhaustPositions: [-0.57, 0.57].map((x) => ({
      x,
      y: 0.4,
      z: rearZ - 0.105,
    })),
    bodySurface: skin,
  });
  installWheelKits(group, equipment);
  addExteriorKit(group, equipment, id);
  addHeadlights(group, lamps);
  addCabinDetails(group, id);
  return group;
}
