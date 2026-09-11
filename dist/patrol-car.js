import * as THREE from "./vendor/three.module.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { makePatrolHealthBar } from "./effects.js";
const material = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.6,
    ...extra,
  });
function roundedBox(w, h, d, r = 0.035) {
  const shape = new THREE.Shape(),
    x = -w / 2,
    y = -h / 2;
  r = Math.min(r, w / 3, h / 3, d / 3);
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: d - 2 * r,
    bevelEnabled: true,
    bevelSize: r,
    bevelThickness: r,
    bevelSegments: 3,
    steps: 1,
    curveSegments: 4,
  });
  geometry.translate(0, 0, -d / 2 + r);
  return geometry;
}
// Rounded longitudinal cross-sections give the original sedan curved fenders and shoulder lines.
function shell(profiles, power = 0.55) {
  const curves = [1, 2, 3].map(
    (index) =>
      new THREE.SplineCurve(
        profiles.map((p) => new THREE.Vector2(p[0], p[index])),
      ),
  );
  const positions = [],
    indices = [],
    rings = 40,
    sides = 32;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings,
      samples = curves.map((c) => c.getPoint(t)),
      z = samples[0].x;
    const [width, base, top] = samples.map((s) => s.y);
    for (let j = 0; j < sides; j++) {
      const a = (j * Math.PI * 2) / sides,
        c = Math.cos(a),
        s = Math.sin(a);
      positions.push(
        width * Math.sign(c) * Math.abs(c) ** power,
        (base + top) / 2 +
          ((top - base) / 2) * Math.sign(s) * Math.abs(s) ** power,
        z,
      );
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j,
        b = i * sides + ((j + 1) % sides),
        c = b + sides,
        d = a + sides;
      indices.push(a, b, d, b, c, d);
    }
  // Close the front and rear ends.
  for (const end of [0, rings])
    for (let j = 1; j < sides - 1; j++) {
      const a = end * sides;
      if (end === 0) indices.push(a, a + j + 1, a + j);
      else indices.push(a, a + j, a + j + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export function makeSedan(
  v,
  police = true,
  color = "#dce1dd",
  style = "modern",
) {
  const classic = !police && style !== "modern",
    eighties = style.includes("80"),
    wagon = style === "wagon80",
    hatch = style === "hatch90",
    roofHeight = classic ? 1.73 : 1.6;
  const group = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({
    color: police ? "#e5e8e3" : color,
    metalness: 0.72,
    roughness: classic ? 0.43 : 0.24,
    clearcoat: classic ? 0.5 : 1,
    clearcoatRoughness: 0.16,
  });
  const blue = material("#143b70"),
    black = material("#111619", { metalness: 0.1, roughness: 0.8 }),
    chrome = material("#b5bec4", { roughness: 0.18, metalness: 0.95 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#223e4a",
    metalness: 0.48,
    roughness: 0.11,
    clearcoat: 1,
  });
  const add = (geometry, m, x = 0, y = 0, z = 0, parent = group) => {
    const mesh = new THREE.Mesh(geometry, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const box = (w, h, d, m, x, y, z, r) =>
    add(roundedBox(w, h, d, r), m, x, y, z);
  add(
    shell(
      classic
        ? [
            [-2.48, 0.85, 0.43, 0.97],
            [-2.22, 0.96, 0.34, 1.07],
            [-1.55, 0.98, 0.33, 1.09],
            [0, 0.96, 0.32, 1.09],
            [1.4, 0.98, 0.34, 1.06],
            [2.2, 0.92, 0.4, 1.0],
            [2.48, 0.87, 0.46, 0.94],
          ]
        : [
            [-2.48, 0.74, 0.44, 0.84],
            [-2.24, 0.94, 0.34, 1.02],
            [-1.55, 0.99, 0.33, 1.06],
            [0, 0.96, 0.32, 1.06],
            [1.4, 0.98, 0.34, 1.02],
            [2.19, 0.91, 0.4, 0.93],
            [2.48, 0.74, 0.47, 0.83],
          ],
      classic ? 0.27 : 0.55,
    ),
    paint,
  );
  const rear = wagon ? -2.12 : hatch ? -1.98 : -1.5,
    roofRear = wagon ? -1.75 : hatch ? -1.48 : -0.9;
  add(
    shell(
      [
        [rear, 0.78, 1.0, 1.09],
        [roofRear, 0.79, 1.0, roofHeight - 0.04],
        [0.48, 0.76, 1.0, roofHeight],
        [1.2, 0.78, 1.0, 1.12],
      ],
      classic ? 0.28 : 0.55,
    ),
    glass,
  );
  const roofLength = 0.48 - roofRear;
  box(
    1.42,
    0.065,
    roofLength,
    paint,
    0,
    roofHeight,
    (0.48 + roofRear) / 2,
    0.025,
  );
  if (wagon)
    for (const x of [-0.55, 0.55])
      box(
        0.045,
        0.08,
        roofLength,
        chrome,
        x,
        roofHeight + 0.09,
        (0.48 + roofRear) / 2,
        0.012,
      );
  box(1.82, 0.12, 4.15, black, 0, 0.32, 0, 0.03);
  box(1.77, 0.12, 0.2, black, 0, 0.48, 2.39, 0.03);
  box(1.77, 0.13, 0.16, black, 0, 0.48, -2.41, 0.03);
  // Door frames, pillars, chrome window strips and four separate handles.
  function beam(a, b, r, m) {
    const direction = new THREE.Vector3().subVectors(b, a);
    const mesh = add(
      new THREE.CylinderGeometry(r, r, direction.length(), 8),
      m,
    );
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
    return mesh;
  }
  for (const side of [-1, 1]) {
    const x = side * 0.802;
    for (const [za, zb] of [
      [rear + 0.08, roofRear],
      [1.12, 0.48],
    ])
      beam(
        new THREE.Vector3(x, 1.04, za),
        new THREE.Vector3(side * 0.72, roofHeight, zb),
        0.045,
        paint,
      );
    beam(
      new THREE.Vector3(side * 0.82, 1.05, -0.25),
      new THREE.Vector3(side * 0.75, roofHeight - 0.01, -0.25),
      0.044,
      black,
    );
    beam(
      new THREE.Vector3(side * 0.89, 1.06, -1.35),
      new THREE.Vector3(side * 0.89, 1.06, 1.15),
      0.018,
      chrome,
    );
    for (const z of [-0.85, 0.5])
      box(0.05, 0.055, 0.24, chrome, side * 0.978, 0.99, z, 0.014);
    for (const z of [-1.2, -0.2, 1.13])
      beam(
        new THREE.Vector3(side * 0.97, 0.46, z),
        new THREE.Vector3(side * 0.972, 1.0, z),
        0.006,
        black,
      );
    box(0.3, 0.12, 0.32, paint, side * 1.01, 1.17, 0.92, 0.045);
    box(0.015, 0.085, 0.23, glass, side * 1.17, 1.18, 0.92, 0.02);
  }
  group.userData.wheels = [];
  group.userData.wheelSteering = [];
  group.userData.wheelAxis = "x";
  for (const x of [-0.97, 0.97])
    for (const z of [-1.58, 1.52]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.45, z);
      group.add(pivot);
      const wheel = new THREE.Group();
      pivot.add(wheel);
      const tire = add(
        new THREE.CylinderGeometry(0.39, 0.39, 0.26, 40, 1),
        black,
        0,
        0,
        0,
        wheel,
      );
      tire.rotation.z = Math.PI / 2;
      const outer = Math.sign(x) * 0.145;
      const rim = add(
        new THREE.CylinderGeometry(0.28, 0.28, 0.022, 40),
        chrome,
        outer,
        0,
        0,
        wheel,
      );
      rim.rotation.z = Math.PI / 2;
      const hub = add(
        new THREE.CylinderGeometry(0.095, 0.095, 0.03, 24),
        black,
        outer * 1.12,
        0,
        0,
        wheel,
      );
      hub.rotation.z = Math.PI / 2;
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5;
        const spoke = add(
          new THREE.BoxGeometry(0.025, 0.13, 0.035),
          black,
          outer * 1.12,
          Math.cos(a) * 0.19,
          Math.sin(a) * 0.19,
          wheel,
        );
        spoke.rotation.x = a;
      }
      for (const offset of [-0.085, 0.085]) {
        const ridge = add(
          new THREE.TorusGeometry(0.365, 0.016, 5, 40),
          black,
          offset,
          0,
          0,
          wheel,
        );
        ridge.rotation.y = Math.PI / 2;
      }
      group.userData.wheels.push(wheel);
      if (z > 0) group.userData.wheelSteering.push(pivot);
      const archPoints = Array.from(
        { length: 21 },
        (_, i) =>
          new THREE.Vector3(
            x * 1.028,
            0.45 + Math.sin((i * Math.PI) / 20) * 0.43,
            z + Math.cos((i * Math.PI) / 20) * 0.43,
          ),
      );
      add(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(archPoints),
          24,
          0.018,
          6,
          false,
        ),
        black,
      );
    }
  const head = material("#e7f3ff", {
    emissive: "#d4e8ff",
    emissiveIntensity: 1.7,
    roughness: 0.18,
  });
  const tail = material("#a71924", {
    emissive: "#e32428",
    emissiveIntensity: 0.65,
  });
  const amber = material("#d69a29", {
    emissive: "#dc8b1b",
    emissiveIntensity: 0.25,
  });
  for (const side of [-1, 1]) {
    box(
      0.56,
      0.19,
      0.14,
      classic ? chrome : black,
      side * 0.59,
      0.81,
      2.39,
      0.025,
    );
    if (classic && !eighties)
      for (const x of [0.43, 0.7]) {
        const light = add(
          new THREE.CylinderGeometry(0.083, 0.083, 0.035, 24),
          head,
          side * x,
          0.83,
          2.475,
        );
        light.rotation.x = Math.PI / 2;
      }
    else
      box(
        0.44,
        classic ? 0.13 : 0.08,
        0.15,
        head,
        side * 0.58,
        0.83,
        2.43,
        0.02,
      );
    if (eighties) box(0.1, 0.12, 0.15, amber, side * 0.83, 0.8, 2.43, 0.012);
    box(0.5, 0.13, 0.12, tail, side * 0.59, 0.83, -2.43, 0.025);
    if (!classic) box(0.28, 0.045, 0.14, head, side * 0.64, 0.58, 2.4, 0.014);
  }
  if (classic) {
    box(1.93, 0.105, 0.19, chrome, 0, 0.49, 2.43, 0.02);
    box(1.93, 0.105, 0.19, chrome, 0, 0.49, -2.43, 0.02);
  }
  box(0.64, 0.26, 0.09, black, 0, 0.73, 2.43, 0.045);
  for (let i = -4; i <= 4; i++)
    box(0.48, 0.011, 0.1, chrome, 0, 0.65 + i * 0.02, 2.445, 0.004);
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = police ? "#164174" : "#d9ddd9";
  ctx.fillRect(0, 0, 1024, 256);
  if (police) {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 92px Arial";
    ctx.textAlign = "center";
    ctx.fillText("პოლიცია", 500, 105);
    ctx.font = "bold 60px Arial";
    ctx.fillText("POLICE · 112", 500, 193);
    ctx.fillStyle = "#fff";
    ctx.fillRect(850, 56, 132, 100);
    ctx.fillStyle = "#d92837";
    ctx.fillRect(905, 56, 23, 100);
    ctx.fillRect(850, 94, 132, 23);
    for (const px of [879, 953])
      for (const py of [80, 133]) {
        ctx.fillRect(px - 3, py - 10, 6, 20);
        ctx.fillRect(px - 10, py - 3, 20, 6);
      }
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.disposable = true;
  const decal = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.36,
    metalness: 0.25,
  });
  if (police)
    for (const side of [-1, 1]) {
      const panel = add(
        new THREE.PlaneGeometry(2.76, 0.42),
        decal,
        side * 0.995,
        0.775,
        -0.12,
      );
      panel.rotation.y = (side * Math.PI) / 2;
    }
  // License plate, roof equipment, front push bumper and antenna.
  const plateCanvas = document.createElement("canvas");
  plateCanvas.width = 256;
  plateCanvas.height = 64;
  const pc = plateCanvas.getContext("2d");
  pc.fillStyle = "#eeeee5";
  pc.fillRect(0, 0, 256, 64);
  pc.fillStyle = "#203344";
  pc.font = "bold 37px Arial";
  pc.textAlign = "center";
  pc.fillText(police ? "GE  ·  112" : "TB  ·  458", 128, 45);
  const plateTexture = new THREE.CanvasTexture(plateCanvas);
  plateTexture.colorSpace = THREE.SRGBColorSpace;
  plateTexture.userData.disposable = true;
  const plateMaterial = new THREE.MeshStandardMaterial({ map: plateTexture });
  for (const sign of [-1, 1]) {
    const m = add(
      new THREE.PlaneGeometry(0.53, 0.135),
      plateMaterial,
      0,
      0.56,
      sign * 2.5,
    );
    if (sign < 0) m.rotation.y = Math.PI;
  }
  group.userData.brakeLights = tail;
  if (police) {
    box(1.15, 0.06, 0.28, black, 0, 1.7, -0.15, 0.025);
    const lights = ["#ee2440", "#187fff"].map((color) =>
      material(color, { emissive: color, emissiveIntensity: 5 }),
    );
    lights.forEach((m, i) => {
      box(0.49, 0.115, 0.26, m, i ? 0.29 : -0.29, 1.78, -0.15, 0.04);
      box(0.13, 0.06, 0.05, m, i ? 0.2 : -0.2, 0.86, 2.475, 0.012);
    });
    group.userData.lights = lights;
    for (const x of [-0.51, 0.51])
      box(0.055, 0.43, 0.065, black, x, 0.68, 2.54, 0.018);
    box(1.22, 0.07, 0.07, black, 0, 0.82, 2.55, 0.018);
    beam(
      new THREE.Vector3(0.54, 1.61, -0.63),
      new THREE.Vector3(0.57, 2.12, -0.65),
      0.009,
      black,
    );
    const hp = makePatrolHealthBar();
    hp.sprite.position.y = 2.7;
    group.add(hp.sprite);
    group.userData.healthBar = hp;
    box(0.6, 0.018, 0.74, blue, 0, 1.021, 1.55, 0.01);
  }
  if (hatch) group.scale.z = 0.9;
  group.userData.paint = paint;
  group.userData.style = style;
  mergeCarParts(group);
  return group;
}

// Keep moving wheels separate, but batch their spokes and each body's fixed panels by material.
function mergeCarParts(group) {
  for (const child of group.children) if (child.isGroup) mergeCarParts(child);
  const batches = new Map();
  for (const child of group.children)
    if (child.isMesh) {
      const key = child.material.uuid;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(child);
    }
  for (const meshes of batches.values())
    if (meshes.length > 1) {
      const geometries = meshes.map((m) => {
        m.updateMatrix();
        const g = m.geometry.index
          ? m.geometry.toNonIndexed()
          : m.geometry.clone();
        g.applyMatrix4(m.matrix);
        if (!g.getAttribute("uv"))
          g.setAttribute(
            "uv",
            new THREE.Float32BufferAttribute(
              new Float32Array(g.getAttribute("position").count * 2),
              2,
            ),
          );
        return g;
      });
      const geometry = mergeGeometries(geometries);
      const mesh = new THREE.Mesh(geometry, meshes[0].material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      for (const m of meshes) {
        group.remove(m);
        m.geometry.dispose();
      }
      for (const g of geometries) g.dispose();
      group.add(mesh);
    }
}
