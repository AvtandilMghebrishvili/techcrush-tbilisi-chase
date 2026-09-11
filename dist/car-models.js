import * as THREE from "./vendor/three.module.js";

// Original, unbadged designs: rounded rear-engine coupe, angular V12 wedge,
// and a broad grand-touring hypercar. No manufacturer's model is represented.
export const MODEL_SHAPES = {
  gt: {
    name: "Apex R",
    length: 4.5,
    width: 1.96,
    roof: 1.38,
    wheelbase: 2.64,
    stations: [
      [-2.25, 0.55, 0.74],
      [-1.9, 0.88, 0.88],
      [-1.35, 0.98, 0.9],
      [-0.5, 0.87, 0.83],
      [0.5, 0.85, 0.75],
      [1.3, 0.95, 0.76],
      [1.9, 0.81, 0.64],
      [2.25, 0.53, 0.5],
    ],
  },
  rally: {
    name: "Vector V12",
    length: 4.8,
    width: 2.08,
    roof: 1.2,
    wheelbase: 2.8,
    stations: [
      [-2.4, 0.92, 0.72],
      [-1.85, 1.04, 0.88],
      [-1.1, 0.99, 0.85],
      [-0.3, 0.93, 0.76],
      [0.55, 0.94, 0.69],
      [1.4, 1.02, 0.6],
      [2.1, 0.91, 0.44],
      [2.4, 0.65, 0.39],
    ],
  },
  suv: {
    name: "Veyra W16",
    length: 5,
    width: 2.15,
    roof: 1.36,
    wheelbase: 2.9,
    stations: [
      [-2.5, 0.71, 0.78],
      [-2.0, 1.01, 0.87],
      [-1.4, 1.07, 0.95],
      [-0.55, 1, 0.92],
      [0.4, 0.96, 0.8],
      [1.4, 1.04, 0.72],
      [2.15, 0.9, 0.57],
      [2.5, 0.61, 0.49],
    ],
  },
};
function loft(
  stations,
  material,
  group,
  cabin = false,
  rounded = true,
  baseHeight = cabin ? 0.79 : 0.31,
) {
  const curves = [0, 1, 2].map(
    (k) =>
      new THREE.CatmullRomCurve3(
        stations.map((p) => new THREE.Vector3(p[0], p[k], 0)),
      ),
  );
  const positions = [],
    indices = [],
    uv = [];
  const rows = rounded ? 64 : stations.length - 1,
    cols = 16;
  for (let i = 0; i <= rows; i++) {
    let z, w, h;
    if (rounded) {
      const point = curves[1].getPoint(i / rows);
      z = point.x;
      w = point.y;
      h = curves[2].getPoint(i / rows).y;
    } else [z, w, h] = stations[i];
    for (let j = 0; j <= cols; j++) {
      const a = (j / cols) * Math.PI;
      const x = Math.cos(a) * w;
      const y =
        baseHeight +
        (h - baseHeight) * Math.pow(Math.sin(a), cabin ? 0.44 : 0.27);
      positions.push(x, y, z);
      uv.push(j / cols, i / rows);
    }
  }
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      indices.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1);
    }
  for (const row of [0, rows]) {
    const center = positions.length / 3,
      offset = row * (cols + 1);
    positions.push(0, baseHeight, positions[offset * 3 + 2]);
    uv.push(0.5, row / rows);
    for (let j = 0; j < cols; j++)
      indices.push(
        center,
        offset + j + (row === 0 ? 1 : 0),
        offset + j + (row === 0 ? 0 : 1),
      );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
export function makeOriginalSportsCar(id, color, equipment = {}) {
  const shape = MODEL_SHAPES[id] || MODEL_SHAPES.gt,
    group = new THREE.Group();
  group.name = shape.name;
  const paint = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.73,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    side: THREE.DoubleSide,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#11171c",
    metalness: 0.45,
    roughness: 0.38,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: "#121519",
    roughness: 0.98,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: "#c6d0d4",
    metalness: 1,
    roughness: 0.22,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#233c48",
    metalness: 0.3,
    roughness: 0.09,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const light = new THREE.MeshStandardMaterial({
    color: "#dcf8ff",
    emissive: "#b7eaff",
    emissiveIntensity: 2.4,
  });
  const tail = new THREE.MeshStandardMaterial({
    color: "#fb2348",
    emissive: "#ff1240",
    emissiveIntensity: 2.4,
  });
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = group) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const box = (w, h, d, m, x, y, z, parent = group) =>
    add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const tube = (points, r, mat, parent = group) =>
    add(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        40,
        r,
        6,
        false,
      ),
      mat,
      0,
      0,
      0,
      parent,
    );
  loft(shape.stations, paint, group, false, id !== "rally");
  box(shape.width * 0.83, 0.16, shape.length * 0.92, dark, 0, 0.27, 0);
  // Transparent cabin, contrasting roof and complete interior visible in cockpit mode.
  const cabin = [
    [-1.38, 0.48, 0.91],
    [-0.85, 0.71, shape.roof - 0.02],
    [-0.1, 0.7, shape.roof],
    [0.53, 0.64, shape.roof - 0.23],
    [0.96, 0.62, 0.82],
  ];
  loft(cabin, glass, group, true, id !== "rally");
  const roof = [
    [-0.89, 0.63, shape.roof - 0.01],
    [-0.6, 0.67, shape.roof + 0.02],
    [-0.1, 0.66, shape.roof + 0.02],
    [0.2, 0.62, shape.roof - 0.03],
  ];
  loft(
    roof,
    id === "suv" ? dark : paint,
    group,
    true,
    id !== "rally",
    shape.roof - 0.07,
  );
  box(1.48, 0.17, 1.85, dark, 0, 0.62, -0.15);
  for (const side of [-1, 1]) {
    const x = side * 0.41;
    box(0.52, 0.43, 0.19, dark, x, 0.88, -0.61).rotation.x = -0.13;
    box(0.47, 0.12, 0.45, dark, x, 0.65, -0.34);
    box(0.3, 0.18, 0.17, dark, x, 1.12, -0.62);
    tube(
      [
        [side * 0.65, 0.85, 0.8],
        [side * 0.64, shape.roof - 0.11, 0.25],
        [side * 0.66, shape.roof, -0.3],
        [side * 0.55, 0.88, -1.29],
      ],
      0.028,
      paint,
    );
    box(0.22, 0.09, 0.28, paint, side * (shape.width / 2 + 0.055), 0.96, 0.36);
    box(0.025, 0.07, 0.19, chrome, side * (shape.width / 2 + 0.17), 0.96, 0.34);
    box(0.24, 0.05, 1.6, dark, side * (shape.width / 2 - 0.04), 0.3, -0.25);
    box(0.16, 0.035, 0.035, chrome, side * 0.91, 0.91, -0.17);
  }
  box(1.4, 0.21, 0.38, dark, 0, 0.85, 0.57);
  const steering = add(
    new THREE.TorusGeometry(0.145, 0.022, 7, 32),
    dark,
    -0.36,
    0.98,
    0.51,
  );
  steering.rotation.x = -0.35;
  steering.name = "steering_wheel";
  box(0.17, 0.075, 0.01, light, -0.37, 1.0, 0.71);
  box(0.22, 0.1, 0.015, dark, 0.12, 1, 0.69);
  const wheels = [],
    pivots = [];
  const rimColors = ["#c6cbd0", "#bf8b5c", "#e0e8ec", "#e6c359", "#8fe7f4"];
  const rimTier = equipment.rims || 0,
    tireTier = equipment.tires || 0;
  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColors[rimTier],
    metalness: 1,
    roughness: 0.22,
  });
  for (const z of [-shape.wheelbase / 2, shape.wheelbase / 2])
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * (shape.width / 2 - 0.06), 0.36, z);
      group.add(pivot);
      const wheel = new THREE.Group();
      pivot.add(wheel);
      wheels.push(wheel);
      if (z > 0) pivots.push(pivot);
      const tire = add(
        new THREE.CylinderGeometry(
          0.355,
          0.355,
          0.245 + tireTier * 0.006,
          48,
          1,
        ),
        rubber,
        0,
        0,
        0,
        wheel,
      );
      tire.rotation.z = Math.PI / 2;
      const rim = add(
        new THREE.CylinderGeometry(0.27, 0.27, 0.255, 40),
        dark,
        0,
        0,
        0,
        wheel,
      );
      rim.rotation.z = Math.PI / 2;
      const disc = add(
        new THREE.CylinderGeometry(0.215, 0.215, 0.012, 40),
        chrome,
        side * 0.12,
        0,
        0,
        wheel,
      );
      disc.rotation.z = Math.PI / 2;
      const ring = add(
        new THREE.TorusGeometry(0.266, 0.018, 8, 48),
        rimMat,
        side * 0.139,
        0,
        0,
        wheel,
      );
      ring.rotation.y = Math.PI / 2;
      const spokes = 5 + rimTier * 2 + (id === "suv" ? 3 : 0);
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        const spoke = box(
          0.029,
          0.23,
          0.032,
          rimMat,
          side * 0.15,
          Math.cos(a) * 0.125,
          Math.sin(a) * 0.125,
          wheel,
        );
        spoke.rotation.x = a;
      }
      const hub = add(
        new THREE.CylinderGeometry(0.065, 0.065, 0.035, 20),
        rimMat,
        side * 0.16,
        0,
        0,
        wheel,
      );
      hub.rotation.z = Math.PI / 2;
      box(0.035, 0.14, 0.085, tail, side * 0.145, 0.09, -0.14, pivot);
      for (const x of [-0.1, 0.1]) {
        const seam = add(
          new THREE.TorusGeometry(0.352, 0.008, 4, 48),
          dark,
          x,
          0,
          0,
          wheel,
        );
        seam.rotation.y = Math.PI / 2;
      }
      const arch = add(
        new THREE.TorusGeometry(0.405, 0.048, 8, 32, Math.PI),
        paint,
        side * (shape.width / 2 - 0.02),
        0.36,
        z,
      );
      arch.rotation.y = (side * Math.PI) / 2;
    }
  const front = shape.length / 2;
  if (id === "gt") {
    for (const side of [-1, 1]) {
      const housing = add(
        new THREE.SphereGeometry(0.195, 28, 20),
        dark,
        side * 0.67,
        0.67,
        front - 0.32,
      );
      housing.scale.set(1, 0.55, 0.67);
      const lens = add(
        new THREE.TorusGeometry(0.137, 0.012, 8, 32),
        light,
        side * 0.67,
        0.69,
        front - 0.205,
      );
      lens.rotation.x = -0.54;
      lens.scale.y = 0.88;
      const projector = add(
        new THREE.SphereGeometry(0.052, 16, 12),
        chrome,
        side * 0.67,
        0.69,
        front - 0.2,
      );
      projector.scale.z = 0.24;
      box(0.52, 0.1, 0.11, dark, side * 0.58, 0.41, front - 0.04);
      box(0.55, 0.055, 0.035, tail, side * 0.56, 0.83, -front + 0.06);
    }
    for (let i = 0; i < 7; i++)
      box(0.82, 0.019, 0.035, dark, 0, 0.87, -1.27 - i * 0.068);
  } else if (id === "rally") {
    for (const side of [-1, 1]) {
      box(0.55, 0.12, 0.22, dark, side * 0.64, 0.53, front - 0.28);
      tube(
        [
          [side * 0.46, 0.59, front - 0.2],
          [side * 0.67, 0.53, front - 0.08],
          [side * 0.87, 0.61, front - 0.28],
        ],
        0.022,
        light,
      );
      box(0.56, 0.18, 0.08, dark, side * 0.65, 0.35, front - 0.06).rotation.z =
        side * 0.17;
      const intake = box(0.06, 0.34, 0.64, dark, side * 0.995, 0.69, -0.7);
      intake.rotation.y = side * 0.23;
      tube(
        [
          [side * 0.36, 0.76, -front + 0.04],
          [side * 0.61, 0.69, -front + 0.02],
          [side * 0.91, 0.78, -front + 0.11],
        ],
        0.026,
        tail,
      );
    }
    for (let i = 0; i < 5; i++)
      box(1.25 - i * 0.12, 0.035, 0.07, dark, 0, 0.88, -1.1 - i * 0.15);
  } else {
    const grille = add(
      new THREE.TorusGeometry(0.27, 0.037, 10, 36, Math.PI * 1.6),
      chrome,
      0,
      0.44,
      front + 0.012,
    );
    grille.scale.set(0.77, 1.05, 1);
    grille.rotation.z = -0.3 * Math.PI;
    box(0.36, 0.34, 0.022, dark, 0, 0.43, front - 0.018);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++)
        box(
          0.087,
          0.056,
          0.04,
          light,
          side * (0.41 + i * 0.117),
          0.61 - i * 0.01,
          front - 0.12 - i * 0.036,
        );
      const points = Array.from({ length: 32 }, (_, i) => {
        const a = 0.25 + (i / 31) * Math.PI * 1.75;
        return [
          side * 1.025,
          0.88 + Math.sin(a) * 0.41,
          -0.28 + Math.cos(a) * 1.02,
        ];
      });
      tube(points, 0.032, chrome);
      box(0.56, 0.075, 0.07, tail, side * 0.59, 0.79, -front + 0.08);
    }
    box(0.5, 0.04, 0.03, tail, 0, 0.79, -front + 0.03);
  }
  for (const side of [-1, 1]) {
    box(0.48, 0.045, 0.38, dark, side * 0.65, 0.24, front - 0.17);
    box(0.65, 0.05, 0.48, dark, side * 0.58, 0.3, -front + 0.2);
    const pipe = add(
      new THREE.CylinderGeometry(0.065, 0.065, 0.19, 20),
      chrome,
      side * 0.58,
      0.38,
      -front - 0.025,
    );
    pipe.rotation.x = Math.PI / 2;
    const inner = add(
      new THREE.CircleGeometry(0.046, 20),
      dark,
      side * 0.58,
      0.38,
      -front - 0.122,
    );
    inner.rotation.y = Math.PI;
  }
  const spoilerTier = equipment.spoiler || 0;
  if (spoilerTier || id === "rally") {
    const height = 0.98 + spoilerTier * 0.1,
      width = 1.52 + spoilerTier * 0.08;
    for (const side of [-1, 1])
      box(
        0.055,
        height - 0.8,
        0.13,
        dark,
        side * 0.55,
        (height + 0.8) / 2,
        -front + 0.4,
      );
    const wing = box(width, 0.07, 0.35, dark, 0, height, -front + 0.43);
    wing.rotation.x = 0.1;
    if (spoilerTier >= 2)
      for (const side of [-1, 1])
        box(
          0.035,
          0.18,
          0.44,
          paint,
          (side * width) / 2,
          height,
          -front + 0.43,
        );
  }
  const shadow = add(
    new THREE.PlaneGeometry(2.45, shape.length + 0.3),
    new THREE.MeshBasicMaterial({
      color: "#080b0f",
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
    0,
    0.055,
    0,
  );
  shadow.rotation.x = -Math.PI / 2;
  group.userData = {
    wheels,
    wheelSteering: pivots,
    body: group,
    paint,
    glass,
    shape: id,
    equipment: { ...equipment },
  };
  return group;
}
