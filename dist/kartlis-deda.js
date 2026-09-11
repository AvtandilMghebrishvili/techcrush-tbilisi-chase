import * as THREE from "./vendor/three.module.js";

// An original 3D interpretation of the user's reference photograph, facing local +Z.
export function makeKartlisDeda() {
  const root = new THREE.Group();
  root.name = "Kartlis Deda — raised bowl and horizontal sword";
  const silver = new THREE.MeshStandardMaterial({
    color: "#c8d0d0",
    metalness: 0.48,
    roughness: 0.39,
    emissive: "#738284",
    emissiveIntensity: 0.14,
    fog: false,
  });
  const shadow = silver.clone();
  shadow.color.set("#778387");
  shadow.roughness = 0.62;
  const hair = silver.clone();
  hair.color.set("#aab3b4");
  hair.roughness = 0.56;
  const seam = new THREE.LineBasicMaterial({
    color: "#7d898d",
    transparent: true,
    opacity: 0.46,
    fog: false,
  });

  function mesh(
    geometry,
    material,
    position = [0, 0, 0],
    scale = [1, 1, 1],
    parent = root,
  ) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(...position);
    m.scale.set(...scale);
    parent.add(m);
    return m;
  }
  function ellipsoid(position, scale, material = silver, parent = root) {
    return mesh(
      new THREE.SphereGeometry(1, 20, 14),
      material,
      position,
      scale,
      parent,
    );
  }
  function limb(a, b, r1, r2) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b);
    const m = mesh(
      new THREE.CylinderGeometry(r2, r1, start.distanceTo(end), 16),
      silver,
    );
    m.position.copy(start).add(end).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      end.sub(start).normalize(),
    );
  }
  const profile = [
    [3.0, 3.3, 1.95],
    [4, 3.3, 1.95],
    [8, 3.25, 1.95],
    [12, 3.2, 1.94],
    [15.2, 3.13, 1.91],
    [17.0, 3.2, 2.0],
    [18.3, 3.34, 2.08],
    [19.4, 2.94, 1.95],
    [20.7, 2.5, 1.63],
    [22, 2.66, 1.74],
    [23.2, 2.92, 1.86],
    [24.2, 3.07, 1.7],
    [25.1, 2.95, 1.4],
    [25.7, 1.45, 1.08],
    [26.2, 0.95, 0.88],
  ];
  const positions = [],
    indices = [],
    segments = 40;
  for (let row = 0; row < profile.length; row++) {
    const [y, width, depth] = profile[row];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const fold = y < 18 ? 1 + Math.cos(a * 8) * 0.008 : 1;
      const bust =
        Math.exp(-Math.pow((y - 23.25) / 1.0, 2)) *
        (Math.exp(-Math.pow((Math.sin(a) - 0.45) / 0.25, 2)) +
          Math.exp(-Math.pow((Math.sin(a) + 0.45) / 0.25, 2))) *
        0.5;
      positions.push(
        Math.sin(a) * width * fold,
        y,
        Math.cos(a) * depth * fold + (Math.cos(a) > 0 ? bust : 0),
      );
      if (row < profile.length - 1 && i < segments) {
        const n = row * (segments + 1) + i;
        indices.push(
          n,
          n + 1,
          n + segments + 1,
          n + 1,
          n + segments + 2,
          n + segments + 1,
        );
      }
    }
  }
  const body = new THREE.BufferGeometry();
  body.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  body.setIndex(indices);
  body.computeVertexNormals();
  mesh(body, silver);
  // Subtle horizontal aluminum panel joints and vertical dress seams.
  for (const [y, rx, rz] of [
    [6.8, 3.29, 1.97],
    [10.8, 3.25, 1.97],
    [14.8, 3.18, 1.95],
    [17.5, 3.3, 2.07],
  ]) {
    const points = Array.from({ length: 65 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2;
      return new THREE.Vector3(Math.sin(a) * rx, y, Math.cos(a) * rz);
    });
    root.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), seam),
    );
  }
  for (const a of [-1.1, -0.55, 0, 0.55, 1.1, Math.PI]) {
    const points = profile
      .filter((p) => p[0] < 18)
      .map(
        ([y, rx, rz]) =>
          new THREE.Vector3(
            Math.sin(a) * (rx + 0.02),
            y,
            Math.cos(a) * (rz + 0.02),
          ),
      );
    root.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), seam),
    );
  }
  limb([0, 25.7, 0], [0, 27.5, 0.08], 0.85, 0.76);
  const head = new THREE.Group();
  head.position.set(0, 28.65, 0.12);
  head.rotation.set(0.05, -0.13, 0.04);
  root.add(head);
  ellipsoid([0, 0, 0], [1.18, 1.73, 1.14], silver, head);
  ellipsoid([0, -0.03, 1.1], [0.22, 0.42, 0.31], silver, head);
  for (const side of [-1, 1]) {
    ellipsoid([side * 0.43, 0.3, 1.02], [0.24, 0.065, 0.04], shadow, head);
    ellipsoid([side * 0.43, 0.43, 1.03], [0.31, 0.09, 0.075], hair, head);
    ellipsoid([side * 1.13, -0.05, 0], [0.18, 0.37, 0.22], silver, head);
  }
  ellipsoid([0, -0.57, 1.04], [0.28, 0.055, 0.035], shadow, head);
  mesh(
    new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    hair,
    [0, 0.95, -0.08],
    [1.34, 0.85, 1.22],
    head,
  );
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const braid = ellipsoid(
      [Math.sin(a) * 1.3, 0.92 + Math.sin(a * 7) * 0.055, Math.cos(a) * 1.2],
      [0.23, 0.2, 0.25],
      hair,
      head,
    );
    braid.rotation.z = Math.sin(a) * 0.6;
  }
  // Veil broadens behind the neck toward the shoulders.
  const veil = new THREE.BufferGeometry();
  veil.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -1.0, 29.3, -0.8, 1.0, 29.3, -0.8, -2.0, 25.25, -1.12, 1.0, 29.3, -0.8,
        2.0, 25.25, -1.12, -2.0, 25.25, -1.12, -1.0, 29.3, -0.8, -2.0, 25.25,
        -1.12, -1.1, 25.55, 0.1, 1.0, 29.3, -0.8, 1.1, 25.55, 0.1, 2.0, 25.25,
        -1.12,
      ],
      3,
    ),
  );
  veil.computeVertexNormals();
  const veilMat = hair.clone();
  veilMat.side = THREE.DoubleSide;
  mesh(veil, veilMat);

  // Right arm slopes down to the sword grip at waist level.
  ellipsoid([-2.93, 24.35, 0], [0.9, 1.1, 1.03]);
  limb([-3.04, 24.35, 0], [-4.38, 21.12, 0.66], 0.92, 0.65);
  ellipsoid([-4.38, 21.12, 0.66], [0.65, 0.7, 0.67]);
  limb([-4.38, 21.12, 0.66], [-5.95, 17.9, 2.2], 0.68, 0.42);
  ellipsoid([-6.05, 17.66, 2.3], [0.52, 0.62, 0.38]);
  for (let i = 0; i < 4; i++)
    limb(
      [-6.43 + i * 0.25, 17.75, 2.48],
      [-6.5 + i * 0.25, 17.1, 2.58],
      0.13,
      0.11,
    );
  // Left elbow bends down; forearm and palm lift the wine bowl beside the shoulder.
  ellipsoid([2.94, 24.35, 0], [0.9, 1.03, 1.0]);
  limb([3.1, 24.3, 0], [4.22, 21.3, 0.65], 0.88, 0.65);
  ellipsoid([4.22, 21.3, 0.65], [0.68, 0.76, 0.72]);
  limb([4.22, 21.3, 0.65], [4.48, 26.48, 1.5], 0.67, 0.4);
  ellipsoid([4.45, 26.6, 1.52], [0.7, 0.37, 0.55]);
  const bowlProfile = [
    [0.3, 0],
    [0.7, 0.12],
    [1.12, 0.48],
    [1.5, 1.1],
    [1.53, 1.24],
    [1.37, 1.24],
    [1.28, 1.0],
    [0.95, 0.47],
    [0.45, 0.22],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const bowl = mesh(
    new THREE.LatheGeometry(bowlProfile, 32),
    silver,
    [4.46, 26.65, 1.5],
  );
  bowl.material = silver.clone();
  bowl.material.side = THREE.DoubleSide;
  for (let i = 0; i < 4; i++)
    limb(
      [3.95 + i * 0.29, 26.47, 1.95],
      [4.03 + i * 0.29, 27.06, 2.08],
      0.12,
      0.1,
    );

  // Blade crosses the front of the waist, matching the reference rather than pointing down.
  const sword = new THREE.Shape();
  sword.moveTo(-5.18, 17.7);
  sword.lineTo(-4.8, 18.0);
  sword.lineTo(3.45, 18.0);
  sword.lineTo(4.3, 17.71);
  sword.lineTo(3.45, 17.39);
  sword.lineTo(-4.8, 17.39);
  sword.closePath();
  mesh(
    new THREE.ExtrudeGeometry(sword, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSize: 0.04,
      bevelThickness: 0.04,
      bevelSegments: 1,
      steps: 1,
    }),
    shadow,
    [0, 0, 2.45],
  );
  mesh(new THREE.BoxGeometry(1.8, 0.32, 0.32), shadow, [-6.05, 17.7, 2.52]);
  mesh(new THREE.BoxGeometry(0.18, 1.35, 0.45), silver, [-5.14, 17.7, 2.52]);
  ellipsoid([-7.03, 17.7, 2.52], [0.25, 0.25, 0.25], shadow);
  const base = new THREE.MeshStandardMaterial({
    color: "#7d8580",
    roughness: 0.95,
    fog: false,
  });
  mesh(
    new THREE.CylinderGeometry(5.3, 5.7, 3, 8),
    base,
    [0, 1.5, 0],
    [1, 1, 0.8],
  );
  return root;
}
