import * as THREE from "./vendor/three.module.js";
import { DAMAGE_ZONES, freshDamage } from "./damage-state.js";
const smooth = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// One shared deformation field moves adjoining body panels and their fittings
// together. It always starts from rest geometry, never the previous dent.
export function deformBodyPoint(point, d, halfWidth = 1.1, halfLength = 2.4) {
  const { x, y, z } = point;
  const front = smooth(halfLength * 0.23, halfLength * 0.96, z) * d.front;
  const rear = smooth(halfLength * 0.25, halfLength * 0.96, -z) * d.rear;
  const sideBand =
    1 - smooth(halfLength * 0.45, halfLength * 0.95, Math.abs(z));
  const left =
    smooth(halfWidth * 0.32, halfWidth * 0.95, x) * d.left * sideBand;
  const right =
    smooth(halfWidth * 0.32, halfWidth * 0.95, -x) * d.right * sideBand;
  const roof = smooth(0.65, 1.35, y) * d.roof;
  point.x = x - 0.32 * left + 0.32 * right;
  point.z = z - 0.66 * front + 0.6 * rear;
  point.y =
    y +
    0.19 *
      (front + rear) *
      Math.sin(
        Math.PI * THREE.MathUtils.clamp(Math.abs(z) / halfLength, 0, 1),
      ) -
    0.34 * roof;
  const panel = smooth(0.28, 0.65, y) * (1 - smooth(1.05, 1.4, y));
  point.y +=
    (0.06 * Math.sin(z * 17 + x * 5) + 0.022 * Math.sin(z * 31 - x * 8)) *
    (front + rear) *
    panel;
  point.x -=
    Math.sign(x) * 0.035 * Math.sin(z * 15 + y * 7) * (left + right) * panel;
  return point;
}
export function prepareVehicleDamage(root) {
  if (root.userData.damageView) return root.userData.damageView;
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(),
    skip = new Set([
      ...(root.userData.wheels || []),
      ...(root.userData.wheelSteering || []),
      root.userData.steering?.rotor,
      root.userData.turboExhaust,
    ]);
  const entries = [],
    materials = new Map(),
    bounds = new THREE.Box3(),
    v = new THREE.Vector3(),
    glass = [];
  root.traverse((m) => {
    if (!m.isMesh || !m.geometry?.attributes.position) return;
    for (let a = m; a && a !== root; a = a.parent) if (skip.has(a)) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    if (mats.every((mat) => mat.isMeshBasicMaterial)) return; // contact shadow, glow and displays
    const matrix = new THREE.Matrix4().multiplyMatrices(inverse, m.matrixWorld);
    const source = m.geometry.attributes.position,
      rest = new Float32Array(source.count * 3);
    for (let i = 0; i < source.count; i++) {
      rest[i * 3] = source.getX(i);
      rest[i * 3 + 1] = source.getY(i);
      rest[i * 3 + 2] = source.getZ(i);
    }
    if (m.userData.sharedGeometry) {
      m.geometry = m.geometry.clone();
      m.userData.sharedGeometry = false;
    }
    // GLB attributes may interleave positions, normals and UVs in one buffer.
    // Never treat that shared storage as a packed XYZ array.
    m.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(rest.slice(), 3),
    );
    const normal = m.geometry.attributes.normal,
      normals = normal ? new Float32Array(normal.count * 3) : null;
    if (normal) {
      for (let i = 0; i < normal.count; i++) {
        normals[i * 3] = normal.getX(i);
        normals[i * 3 + 1] = normal.getY(i);
        normals[i * 3 + 2] = normal.getZ(i);
      }
      m.geometry.setAttribute(
        "normal",
        new THREE.BufferAttribute(normals.slice(), 3),
      );
    }
    entries.push({
      mesh: m,
      rest,
      normals,
      matrix,
      inverse: matrix.clone().invert(),
    });
    for (let i = 0; i < rest.length; i += 3)
      bounds.expandByPoint(v.fromArray(rest, i).applyMatrix4(matrix));
    for (const mat of mats)
      if (!materials.has(mat))
        materials.set(mat, {
          color: mat.color?.clone(),
          roughness: mat.roughness,
          metalness: mat.metalness,
          emissive: mat.emissiveIntensity,
        });
    if (
      mats.some(
        (mat) =>
          mat === root.userData.glass ||
          (mat.isMeshPhysicalMaterial &&
            (mat.transparent || mat.transmission > 0)),
      )
    )
      glass.push(m);
  });
  const halfWidth = Math.min(
      1.5,
      Math.max(0.9, Math.abs(bounds.min.x), Math.abs(bounds.max.x)),
    ),
    halfLength = Math.min(
      3.5,
      Math.max(2, Math.abs(bounds.min.z), Math.abs(bounds.max.z)),
    );
  const state = {
    entries,
    materials,
    halfWidth,
    halfLength,
    signature: "",
    lines: [],
    anchors: (root.userData.headlights || []).map((light) => ({
      light,
      position: light.position.clone(),
      intensity: light.intensity,
    })),
    exhaust: structuredClone(root.userData.exhaustPositions || []),
  };
  // Project cracks/scuffs onto actual rest surfaces so there are no floating decals.
  const ray = new THREE.Raycaster(),
    world = new THREE.Vector3(),
    direction = new THREE.Vector3();
  function project(x, y, z, dx, dz, targets) {
    world.set(x, y, z).applyMatrix4(root.matrixWorld);
    direction.set(dx, 0, dz).transformDirection(root.matrixWorld);
    ray.set(world, direction);
    const hit = ray.intersectObjects(targets, false)[0];
    if (!hit) return null;
    return hit.point
      .clone()
      .applyMatrix4(inverse)
      .add(new THREE.Vector3(-dx * 0.004, 0, -dz * 0.004));
  }
  function lineLayer(points, zone, threshold, color) {
    if (!points.length) return;
    const geometry = new THREE.BufferGeometry().setFromPoints(points),
      line = new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        }),
      );
    line.visible = false;
    root.add(line);
    state.lines.push({
      line,
      rest: geometry.attributes.position.array.slice(),
      zone,
      threshold,
    });
  }
  if (glass.length) {
    const points = [],
      height = Math.min(1.6, bounds.max.y * 0.72);
    for (let i = 0; i < 11; i++) {
      const a = i * 2.399,
        r = 0.15 + (i % 4) * 0.065;
      const p = project(0.22, height, halfLength + 2, 0, -1, glass),
        q = project(
          0.22 + Math.cos(a) * r,
          height + Math.sin(a) * r * 0.7,
          halfLength + 2,
          0,
          -1,
          glass,
        );
      if (p && q) points.push(p, q);
    }
    lineLayer(points, "glass", 0.25, "#d7e3e5");
  }
  for (const zone of ["front", "rear", "left", "right"]) {
    const points = [],
      targets = entries.map((e) => e.mesh);
    for (let i = 0; i < 7; i++) {
      const y = 0.45 + i * 0.035;
      const coords =
        zone === "front"
          ? [-0.45, y, halfLength + 2, 0, -1]
          : zone === "rear"
            ? [-0.45, y, -halfLength - 2, 0, 1]
            : zone === "left"
              ? [halfWidth + 2, y, -0.4, -1, 0]
              : [-halfWidth - 2, y, -0.4, 1, 0];
      const p = project(...coords, targets);
      if (coords[3]) coords[2] += 0.65 + (i % 3) * 0.1;
      else coords[0] += 0.65 + (i % 3) * 0.1;
      coords[1] += 0.04;
      const q = project(...coords, targets);
      if (p && q) points.push(p, q);
    }
    lineLayer(points, zone, 0.12, "#a3a5a3");
  }
  root.userData.damageView = state;
  return state;
}
export function updateVehicleDamage(root, car) {
  const d = { ...freshDamage(), ...car.damage },
    wreck = Boolean(car.destroyed || car.health <= 0);
  if (wreck)
    for (const key of DAMAGE_ZONES)
      d[key] = Math.max(d[key], key === "roof" ? 0.45 : 0.7);
  const signature =
    DAMAGE_ZONES.map((k) => d[k].toFixed(3)).join("/") + "/" + wreck;
  let state = root.userData.damageView;
  if (!state && !DAMAGE_ZONES.some((k) => d[k] > 0.001)) return;
  state ||= prepareVehicleDamage(root);
  if (signature === state.signature) return;
  state.signature = signature;
  const v = new THREE.Vector3(),
    active = DAMAGE_ZONES.some((k) => d[k] > 0.001),
    amount = Math.max(...DAMAGE_ZONES.map((k) => d[k]));
  for (const e of state.entries) {
    const attr = e.mesh.geometry.attributes.position;
    if (!active) {
      attr.array.set(e.rest);
      if (e.normals) e.mesh.geometry.attributes.normal.array.set(e.normals);
    } else
      for (let i = 0; i < e.rest.length; i += 3) {
        v.fromArray(e.rest, i).applyMatrix4(e.matrix);
        deformBodyPoint(v, d, state.halfWidth, state.halfLength).applyMatrix4(
          e.inverse,
        );
        attr.setXYZ(i / 3, v.x, v.y, v.z);
      }
    attr.needsUpdate = true;
    if (active) e.mesh.geometry.computeVertexNormals();
    else if (e.mesh.geometry.attributes.normal)
      e.mesh.geometry.attributes.normal.needsUpdate = true;
    e.mesh.geometry.computeBoundingSphere();
    e.mesh.geometry.computeBoundingBox();
  }
  for (const [mat, base] of state.materials) {
    if (base.color)
      mat.color
        .copy(base.color)
        .lerp(new THREE.Color("#202225"), wreck ? 0.94 : amount * 0.12);
    if (base.roughness !== undefined)
      mat.roughness = Math.min(
        1,
        base.roughness + (wreck ? 0.7 : amount * 0.3),
      );
    if (base.emissive !== undefined)
      mat.emissiveIntensity = wreck ? 0 : base.emissive;
  }
  for (const { line, rest, zone, threshold } of state.lines) {
    const strength =
      zone === "glass" ? Math.max(d.front, d.roof, d.left, d.right) : d[zone];
    line.visible = strength > threshold && !wreck;
    const attr = line.geometry.attributes.position;
    for (let i = 0; i < rest.length; i += 3) {
      v.fromArray(rest, i);
      deformBodyPoint(v, d, state.halfWidth, state.halfLength);
      attr.setXYZ(i / 3, v.x, v.y, v.z);
    }
    attr.needsUpdate = true;
    line.material.opacity = Math.min(0.7, strength * 0.85);
  }
  for (const { light, position, intensity } of state.anchors) {
    light.position.copy(
      deformBodyPoint(v.copy(position), d, state.halfWidth, state.halfLength),
    );
    light.intensity = wreck ? 0 : intensity * (1 - d.front * 0.65);
  }
  if (root.userData.turboExhaust)
    root.userData.turboExhaust.children.forEach((flame, i) => {
      const p = state.exhaust[Math.floor(i / 2)];
      if (!p) return;
      v.set(p.x, p.y, p.z);
      deformBodyPoint(v, d, state.halfWidth, state.halfLength);
      flame.position.x = v.x;
      flame.position.y = v.y;
      flame.userData.nozzleZ = v.z;
    });
}
