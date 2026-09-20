import * as T from "./vendor/three.module.js";
import { installWheelKits, addExteriorKit } from "./customization.js";
import {
  makeSteering,
  bindSteering,
  addHeadlights,
} from "./vehicle-details.js";
import { cockpitSeat } from "./cockpit-view.js";
import { addCabinDetails } from "./interior-detail.js";
import { MODEL_SHAPES } from "./vehicle-designs.js";
const metal = (color, roughness = 0.34, metalness = 0.64) =>
  new T.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    flatShading: true,
  });
const mesh = (parent, geo, mat, x = 0, y = 0, z = 0) => {
  const m = new T.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
};
const box = (p, w, h, d, mat, x = 0, y = 0, z = 0) =>
  mesh(p, new T.BoxGeometry(w, h, d), mat, x, y, z);
function panel(p, pts, mat) {
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pts.flat(), 3));
  const inds = [];
  for (let i = 1; i < pts.length - 1; i++) inds.push(0, i, i + 1);
  g.setIndex(inds);
  g.computeVertexNormals();
  const m = mesh(p, g, mat);
  m.material = mat.clone();
  m.material.side = T.DoubleSide;
  return m;
}
function loft(p, stations, mat) {
  const points = [],
    inds = [];
  for (const [z, w, b, h] of stations)
    points.push(
      [-w, b, z],
      [-w, h - 0.11, z],
      [-w * 0.83, h, z],
      [w * 0.83, h, z],
      [w, h - 0.11, z],
      [w, b, z],
    );
  for (let i = 1; i < stations.length; i++)
    for (let j = 0; j < 6; j++) {
      const a = (i - 1) * 6 + j,
        b = i * 6 + j,
        an = (i - 1) * 6 + ((j + 1) % 6),
        bn = i * 6 + ((j + 1) % 6);
      inds.push(a, b, an, b, bn, an);
    }
  for (let j = 1; j < 5; j++) {
    inds.push(0, j + 1, j);
    const k = (stations.length - 1) * 6;
    inds.push(k, k + j, k + j + 1);
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(points.flat(), 3));
  g.setIndex(inds);
  g.computeVertexNormals();
  return mesh(p, g.toNonIndexed(), mat);
}
function rod(p, a, b, r, mat) {
  const v = new T.Vector3(...a),
    w = new T.Vector3(...b),
    delta = w.clone().sub(v),
    m = mesh(p, new T.CylinderGeometry(r, r, delta.length(), 10), mat);
  m.position.copy(v.add(w).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
  return m;
}
function bat(p, color) {
  const shape = new T.Shape();
  const a = [
    [-0.92, 0.23],
    [-0.59, 0.08],
    [-0.42, 0.12],
    [-0.28, 0.23],
    [-0.17, 0.3],
    [-0.14, 0.47],
    [-0.06, 0.35],
    [0.06, 0.35],
    [0.14, 0.47],
    [0.17, 0.3],
    [0.28, 0.23],
    [0.42, 0.12],
    [0.59, 0.08],
    [0.92, 0.23],
    [0.79, -0.13],
    [0.52, -0.04],
    [0.39, -0.24],
    [0.22, -0.14],
    [0, -0.49],
    [-0.22, -0.14],
    [-0.39, -0.24],
    [-0.52, -0.04],
    [-0.79, -0.13],
  ];
  shape.moveTo(...a[0]);
  for (const v of a.slice(1)) shape.lineTo(...v);
  shape.closePath();
  return mesh(
    p,
    new T.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false }),
    color,
  );
}

export function makeBatmobile(color = "#1e2831", equipment = {}) {
  const mats = {
    body: metal("#1e2831", 0.31, 0.72),
    edge: metal("#485866", 0.35, 0.7),
    black: metal("#080d12", 0.55, 0.25),
    rubber: metal("#13191d", 0.8, 0.04),
    rim: metal("#525e65", 0.23, 0.83),
    gold: metal("#bc9650", 0.33, 0.75),
    glass: new T.MeshPhysicalMaterial({
      color: "#142937",
      metalness: 0.62,
      roughness: 0.12,
      clearcoat: 1,
    }),
    light: new T.MeshStandardMaterial({
      color: "#f4e7cd",
      emissive: "#ffe4b4",
      emissiveIntensity: 2,
    }),
    amber: new T.MeshStandardMaterial({
      color: "#ffce67",
      emissive: "#ff971e",
      emissiveIntensity: 2.3,
    }),
    red: new T.MeshStandardMaterial({
      color: "#e97440",
      emissive: "#ed4a16",
      emissiveIntensity: 1.4,
    }),
  };

  mats.body.color.set(color);
  mats.glass.transparent = true;
  mats.glass.opacity = 0.52;
  mats.glass.depthWrite = false;
  const p = new T.Group();
  p.name = "Batmobile";
  const wheels = [],
    steering = [];
  loft(
    p,
    [
      [-3.24, 0.91, 0.38, 0.97],
      [-2.1, 1.08, 0.34, 1.1],
      [-0.4, 0.98, 0.28, 1.11],
      [1.35, 0.93, 0.25, 1.18],
      [2.9, 0.91, 0.27, 0.9],
      [3.66, 0.69, 0.31, 0.57],
    ],
    mats.body,
  );
  loft(
    p,
    [
      [-3.3, 1.0, 0.23, 0.4],
      [-2.1, 1.18, 0.2, 0.42],
      [1.8, 1.2, 0.18, 0.38],
      [3.72, 0.97, 0.24, 0.34],
    ],
    mats.black,
  );
  loft(
    p,
    [
      [-1.7, 0.8, 0.98, 1.12],
      [-1.02, 0.65, 1.03, 1.82],
      [0.2, 0.59, 1.05, 1.85],
      [1.11, 0.76, 1.04, 1.24],
    ],
    mats.glass,
  );
  panel(
    p,
    [
      [-0.55, 1.86, 0.23],
      [0.55, 1.86, 0.23],
      [0.6, 1.84, -1.04],
      [-0.6, 1.84, -1.04],
    ],
    mats.body,
  );
  rod(p, [0, 1.87, 0.23], [0, 1.245, 1.12], 0.025, mats.black);
  for (const s of [-1, 1]) {
    rod(p, [s * 0.58, 1.84, 0.22], [s * 0.74, 1.24, 1.1], 0.035, mats.edge);
    rod(p, [s * 0.65, 1.81, -1.02], [s * 0.78, 1.14, -1.65], 0.035, mats.edge);
    // Sculpted separate fenders leave visible suspension and tire clearance.
    for (const [z, r, x] of [
      [2.1, 0.65, 1.33],
      [-2.1, 0.77, 1.38],
    ]) {
      const pivot = new T.Group();
      pivot.position.set(s * x, r, z);
      p.add(pivot);
      wheels.push(pivot);
      const arch = mesh(
        p,
        new T.TorusGeometry(r + 0.08, 0.095, 6, 28, Math.PI),
        mats.body,
        s * x,
        r,
        z,
      );
      arch.rotation.y = Math.PI / 2;
      box(p, 0.43, 0.16, 1.1, mats.body, s * x, r * 2 - 0.02, z);
      rod(p, [s * 0.67, 0.5, z - 0.24], [s * 1.32, r, z], 0.07, mats.edge);
      rod(p, [s * 0.67, 0.5, z + 0.28], [s * 1.32, r, z], 0.07, mats.edge);
    }
    panel(
      p,
      [
        [s * 0.98, 0.54, 1.2],
        [s * 1.29, 0.75, 0.7],
        [s * 1.3, 0.85, -1.27],
        [s * 1.08, 0.44, -1.42],
      ],
      mats.edge,
    );
    panel(
      p,
      [
        [s * 1.005, 1.06, 0.8],
        [s * 1.23, 0.78, 0.38],
        [s * 1.23, 0.81, -0.64],
        [s * 1.07, 1.11, -1.32],
      ],
      mats.body,
    );
    box(p, 0.07, 0.07, 2.3, mats.gold, s * 1.2, 0.43, -0.08);
    for (let n = 0; n < 5; n++) {
      const vent = box(
        p,
        0.044,
        0.31,
        0.045,
        mats.black,
        s * 1.241,
        0.81,
        -0.72 + n * 0.155,
      );
      vent.rotation.x = -0.27;
    }
    // Front flared cheek and separate slim lamp.
    loft(
      p,
      [
        [1.42, 0.32, 0.75, 1.16],
        [2.9, 0.39, 0.42, 0.84],
        [3.47, 0.25, 0.35, 0.65],
      ],
      mats.body,
    ).position.x = s * 1.02;
    box(p, 0.61, 0.09, 0.035, mats.light, s * 1.1, 0.59, 3.49).rotation.y =
      s * 0.19;
    box(p, 0.62, 0.17, 0.1, mats.black, s * 0.68, 0.44, 3.61);
    for (let n = 0; n < 4; n++)
      box(p, 0.025, 0.11, 0.017, mats.edge, s * (0.43 + n * 0.12), 0.44, 3.67);
    box(p, 0.53, 0.04, 0.085, mats.gold, s * 1.0, 0.315, 3.48);
    // Rear fins use closed solids rather than decorative transparent planes.
    const fin = new T.Shape();
    fin.moveTo(-1.22, 1.1);
    fin.lineTo(-2.95, 2.15);
    fin.lineTo(-3.28, 1.18);
    fin.lineTo(-2.4, 0.96);
    fin.lineTo(-1.22, 1.1);
    const fg = new T.ExtrudeGeometry(fin, { depth: 0.09, bevelEnabled: false });
    const f = mesh(p, fg, mats.body);
    f.rotation.y = -Math.PI / 2;
    f.position.x = s * 1.16;
    rod(p, [s * 1.16, 1.13, -1.26], [s * 1.16, 2.12, -2.95], 0.018, mats.gold);
    box(p, 0.65, 0.095, 0.04, mats.red, s * 0.85, 0.9, -3.27);
    for (let n = 0; n < 5; n++)
      box(p, 0.045, 0.16, 0.62, mats.black, s * (0.36 + n * 0.13), 1.135, -2.0);
  }
  const stockWing = new T.Group();
  stockWing.name = "rear-wing";
  p.add(stockWing);
  p.userData.exteriorKit = stockWing;
  box(stockWing, 2.48, 0.09, 0.33, mats.body, 0, 1.3, -3.13).name =
    "aero-blade";
  box(stockWing, 2.3, 0.018, 0.035, mats.gold, 0, 1.35, -3.29);
  const nozzle = mesh(
    p,
    new T.CylinderGeometry(0.39, 0.47, 0.48, 20, 1, true),
    mats.rim,
    0,
    0.76,
    -3.31,
  );
  nozzle.rotation.x = Math.PI / 2;
  const throat = mesh(
    p,
    new T.CircleGeometry(0.375, 32),
    mats.black,
    0,
    0.76,
    -3.565,
  );
  throat.rotation.y = Math.PI;
  for (const radius of [0.32, 0.22])
    mesh(
      p,
      new T.TorusGeometry(radius, 0.027, 8, 32),
      mats.amber,
      0,
      0.76,
      -3.582,
    );
  for (let n = 0; n < 10; n++) {
    const a = (n * Math.PI) / 5,
      blade = box(
        p,
        0.036,
        0.3,
        0.02,
        mats.gold,
        Math.cos(a) * 0.16,
        0.76 + Math.sin(a) * 0.16,
        -3.58,
      );
    blade.rotation.z = a;
  }
  const nose = bat(p, mats.gold);
  nose.rotation.x = -Math.PI / 2 + 0.18;
  nose.position.set(0, 1.001, 2.45);
  nose.scale.setScalar(0.52);
  for (let n = 0; n < 4; n++)
    box(p, 0.63, 0.019, 0.05, mats.black, 0, 1.21 - n * 0.018, 1.22 + n * 0.1);

  box(p, 1.3, 0.1, 0.28, mats.black, 0, 1.1, 0.7);
  for (const side of [-1, 1]) {
    box(p, 0.45, 0.14, 0.58, mats.black, side * 0.33, 0.7, -0.4);
    box(p, 0.45, 0.58, 0.16, mats.black, side * 0.33, 1.02, -0.75);
  }
  const rotor = makeSteering(p, mats.black, mats.gold, 0.32, 1.17, 0.45);
  bindSteering(p, rotor);
  Object.assign(p.userData, {
    shape: "batmobile",
    design: MODEL_SHAPES.batmobile,
    paint: mats.body,
    glass: mats.glass,
    wheels,
    wheelSteering: steering,
    wheelRadius: 0.7,
    equipment: { ...equipment },
    cockpitSeat: cockpitSeat(1.85, 0, 0.32),
    exhaustPositions: [{ x: 0, y: 0.76, z: -3.59 }],
    bodySurface: { top: () => 1.12, section: () => ({ w: 1.0, h: 1.12 }) },
    aeroMount: { z: -3.05, width: 2.4, baseY: 1.12 },
    cabinLayout: {
      lift: 0.17,
      shift: 0.28,
      roof: 1.85,
      roofRear: -1.04,
      roofFront: 0.23,
      openTop: false,
    },
  });
  installWheelKits(p, equipment);
  if (equipment.spoiler) addExteriorKit(p, equipment, "batmobile");
  addHeadlights(p, [
    { x: -1.1, y: 0.59, z: 3.5 },
    { x: 1.1, y: 0.59, z: 3.5 },
  ]);
  addCabinDetails(p, "batmobile");
  // Keep the approved proportions while fitting normal streets and collision bounds.
  p.scale.setScalar(0.76);
  return p;
}
