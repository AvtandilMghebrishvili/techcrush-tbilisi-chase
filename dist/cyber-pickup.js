import * as THREE from "./vendor/three.module.js";
import {
  box,
  mesh,
  metal,
  installWheelKits,
  addExteriorKit,
} from "./customization.js";
import {
  makeSteering,
  bindSteering,
  addHeadlights,
} from "./vehicle-details.js";
import { addCabinDetails } from "./interior-detail.js";
import { MODEL_SHAPES } from "./vehicle-designs.js";

// A separate faceted pickup body: no shared sports-coupe shell or exhaust pipes.
export function makeCyberPickup(color, equipment = {}) {
  const car = new THREE.Group(),
    shape = MODEL_SHAPES.creator;
  car.name = shape.name;
  const paint = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.82,
    roughness: 0.31,
    clearcoat: 0.6,
    side: THREE.DoubleSide,
  });
  const dark = metal("#151c23", 0.68),
    trim = metal("#b4c0c8", 0.35),
    accent = metal("#ee2349", 0.35);
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#253944",
    metalness: 0.28,
    roughness: 0.14,
    transparent: true,
    opacity: 0.64,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const lamp = new THREE.MeshStandardMaterial({
    color: "#d6f2ff",
    emissive: "#badfff",
    emissiveIntensity: 1.4,
  });
  const tail = new THREE.MeshStandardMaterial({
    color: "#ff274e",
    emissive: "#ff1535",
    emissiveIntensity: 1.3,
  });
  const quad = (points, mat, name) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points.flat(), 3),
    );
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    const m = mesh(car, g, mat);
    m.name = name;
    return m;
  };
  const section = (z) => {
    let i = 1;
    while (i < shape.stations.length - 1 && shape.stations[i][0] < z) i++;
    const a = shape.stations[i - 1],
      b = shape.stations[i],
      t = THREE.MathUtils.clamp((z - a[0]) / (b[0] - a[0]), 0, 1);
    return {
      w: THREE.MathUtils.lerp(a[1], b[1], t),
      h: THREE.MathUtils.lerp(a[2], b[2], t),
    };
  };
  const verts = [],
    ix = [];
  for (let n = 0; n <= 80; n++) {
    const z = -2.65 + (n * 5.3) / 80,
      { w, h } = section(z),
      dz = z - Math.sign(z) * 1.61;
    const bottom =
      Math.abs(dz) < 0.48 ? 0.43 + Math.sqrt(0.48 * 0.48 - dz * dz) : 0.34;
    verts.push(
      [-w, bottom, z],
      [-w, h - 0.09, z],
      [-w * 0.92, h, z],
      [w * 0.92, h, z],
      [w, h - 0.09, z],
      [w, bottom, z],
    );
    if (n)
      for (const j of [0, 1, 2, 3, 4]) {
        // Actual open cockpit, with floor below the seats.
        if (j === 2 && z > -1.18 && z < 1.17) continue;
        const a = (n - 1) * 6 + j,
          b = n * 6 + j;
        ix.push(a, b, a + 1, b, b + 1, a + 1);
      }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(verts.flat(), 3),
  );
  geo.setIndex(ix);
  geo.computeVertexNormals();
  mesh(car, geo, paint).name = "body-shell";
  for (const z of [-2.65, 2.65]) {
    const { w, h } = section(z);
    quad(
      [
        [-w, 0.34, z],
        [w, 0.34, z],
        [w, h - 0.09, z],
        [-w, h - 0.09, z],
      ],
      paint,
      "bumper-face",
    );
  }
  box(car, 1.82, 0.13, 4.92, dark, 0, 0.31, 0);
  const rr = (s) => [s * 0.82, 1.5, -1.14],
    peak = (s) => [s * 0.82, 1.86, -0.04],
    front = (s) => [s * 0.95, 1.13, 1.18];
  quad([peak(-1), peak(1), front(1), front(-1)], glass, "windscreen");
  quad([rr(-1), rr(1), peak(1), peak(-1)], paint, "roof");
  quad(
    [[-0.83, 1.2, -1.18], [0.83, 1.2, -1.18], rr(1), rr(-1)],
    glass,
    "rear-window",
  );
  const bar = (a, b, r, mat) => {
    const av = new THREE.Vector3(...a),
      bv = new THREE.Vector3(...b),
      m = mesh(
        car,
        new THREE.CylinderGeometry(r, r, av.distanceTo(bv), 6),
        mat,
      );
    m.position.copy(av).add(bv).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      bv.sub(av).normalize(),
    );
    return m;
  };
  for (const s of [-1, 1]) {
    quad(
      [[s * 0.97, 1.19, -1.15], front(s), peak(s), rr(s)],
      glass,
      "side-window",
    );
    bar(rr(s), peak(s), 0.035, paint);
    bar(peak(s), front(s), 0.035, paint);
    bar([s * 0.97, 1.19, -1.15], rr(s), 0.032, paint);
    bar([s * 1.055, 0.97, -0.13], [s * 0.82, 1.76, -0.13], 0.025, dark);
    box(car, 0.027, 0.025, 0.28, dark, s * 1.063, 1.1, 0.14);
    box(car, 0.027, 0.025, 0.22, dark, s * 1.063, 1.1, -0.7);
    bar([s * 1.06, 1.02, 0.75], [s * 1.18, 1.17, 0.74], 0.025, dark);
    box(car, 0.21, 0.11, 0.25, paint, s * 1.19, 1.17, 0.72);
    box(car, 0.16, 0.07, 0.012, trim, s * 1.19, 1.17, 0.586);
    for (const z of [-1.61, 1.61]) {
      for (let j = 0; j < 7; j++) {
        const a = (j * Math.PI) / 7,
          b = ((j + 1) * Math.PI) / 7;
        bar(
          [s * 1.095, 0.43 + Math.sin(a) * 0.49, z + Math.cos(a) * 0.49],
          [s * 1.095, 0.43 + Math.sin(b) * 0.49, z + Math.cos(b) * 0.49],
          0.029,
          dark,
        );
      }
    }
    box(car, 0.065, 0.08, 2.17, dark, s * 1.075, 0.42, 0);
    box(car, 0.52, 0.16, 0.58, dark, s * 0.44, 0.65, -0.42);
    const seat = box(car, 0.53, 0.57, 0.16, dark, s * 0.44, 1.02, -0.73);
    seat.rotation.x = -0.1;
    box(car, 0.29, 0.15, 0.14, dark, s * 0.44, 1.39, -0.75);
  }
  // Covered cargo bed and a single shared tailgate aero mounting zone.
  quad(
    [
      [-0.93, 1.21, -2.59],
      [0.93, 1.21, -2.59],
      [0.96, 1.25, -1.2],
      [-0.96, 1.25, -1.2],
    ],
    dark,
    "cargo-bed-cover",
  );
  for (let i = 0; i < 11; i++)
    box(car, 1.84, 0.018, 0.021, trim, 0, 1.225 + i * 0.0026, -2.5 + i * 0.112);
  box(car, 1.88, 0.045, 0.026, lamp, 0, 0.845, 2.666);
  box(car, 1.82, 0.045, 0.026, tail, 0, 1.102, -2.666);
  box(car, 1.64, 0.17, 0.034, dark, 0, 0.51, 2.676);
  box(car, 1.8, 0.1, 0.035, dark, 0, 0.49, -2.678);
  box(car, 1.8, 0.018, 0.03, accent, 0, 0.65, 2.679);
  box(car, 1.72, 0.15, 0.44, dark, 0, 1.19, 0.75);
  box(car, 1.64, 0.025, 0.13, trim, 0, 1.28, 0.55);
  const rotor = makeSteering(car, dark, trim, 0.36, 1.29, 0.45);
  bindSteering(car, rotor);
  // A wide central EV display, mounted on the dash rather than floating above it.
  box(car, 0.47, 0.26, 0.035, dark, -0.17, 1.32, 0.52);
  const display = box(car, 0.43, 0.22, 0.008, dark, -0.17, 1.32, 0.498);
  const anchors = [];
  for (const z of [-1.61, 1.61])
    for (const s of [-1, 1]) {
      const w = new THREE.Group();
      w.position.set(s * 0.98, 0.43, z);
      car.add(w);
      anchors.push(w);
    }
  Object.assign(car.userData, {
    paint,
    glass,
    shape: "creator",
    design: shape,
    electric: true,
    wheels: anchors,
    wheelRadius: 0.42,
    cockpitSeat: { x: 0.36, y: 1.62, z: -0.12 },
    exhaustPositions: [],
    bodySurface: { top: () => 1.235, section },
    aeroMount: { z: -2.22, width: 1.87, baseY: 1.232 },
    cabinLayout: {
      lift: 0.32,
      shift: 0.22,
      roof: 1.86,
      roofRear: -1.14,
      roofFront: -0.04,
      openTop: false,
    },
  });
  if (typeof document !== "undefined") {
    const screen = document.createElement("canvas");
    screen.width = 768;
    screen.height = 384;
    const sc = screen.getContext("2d");
    sc.fillStyle = "#08121c";
    sc.fillRect(0, 0, 768, 384);
    sc.fillStyle = "#ff3158";
    sc.font = "bold 42px Arial";
    sc.fillText("TECHCRUSH EV", 38, 66);
    sc.fillStyle = "#d8edf4";
    sc.font = "28px Arial";
    sc.fillText("ELECTRIC AWD", 38, 117);
    sc.strokeStyle = "#65cedf";
    sc.lineWidth = 7;
    sc.strokeRect(42, 163, 236, 118);
    sc.fillStyle = "#65cedf";
    sc.fillRect(279, 204, 14, 36);
    for (let i = 0; i < 5; i++) sc.fillRect(55 + i * 42, 180, 28, 83);
    sc.fillStyle = "#f5f7f9";
    sc.font = "bold 34px Arial";
    sc.fillText("2× COINS", 342, 203);
    sc.fillText("2× SCORE", 342, 263);
    sc.fillStyle = "#8d9faa";
    sc.font = "22px Arial";
    sc.fillText("YOUTUBER SIGNATURE EDITION", 38, 340);
    const screenTex = new THREE.CanvasTexture(screen);
    screenTex.colorSpace = THREE.SRGBColorSpace;
    screenTex.userData.disposable = true;
    // Place readable content on the driver-facing plane; no bright emissive slab.
    const panel = mesh(
      car,
      new THREE.PlaneGeometry(0.418, 0.208),
      new THREE.MeshBasicMaterial({ map: screenTex }),
      -0.17,
      1.32,
      0.491,
    );
    panel.rotation.y = Math.PI;
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#151b24";
    ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = "#f4f5f6";
    ctx.font = "bold 56px Arial";
    ctx.textAlign = "center";
    ctx.fillText("TECHCRUSH", 256, 66);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.userData.disposable = true;
    const sign = mesh(
      car,
      new THREE.PlaneGeometry(0.94, 0.18),
      new THREE.MeshStandardMaterial({ map: t }),
      0,
      0.87,
      -2.682,
    );
    sign.rotation.y = Math.PI;
  }
  installWheelKits(car, equipment);
  addExteriorKit(car, equipment, "creator");
  addHeadlights(car, [
    { x: -0.72, y: 0.83, z: 2.68 },
    { x: 0.72, y: 0.83, z: 2.68 },
  ]);
  addCabinDetails(car, "creator");
  return car;
}
