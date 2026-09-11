const dot = (a, b) => a.x * b.x + a.z * b.z;
function axes(car) {
  return [
    { x: Math.cos(car.angle), z: -Math.sin(car.angle) },
    { x: Math.sin(car.angle), z: Math.cos(car.angle) },
  ];
}
// SAT contact for oriented car bodies: bumpers and doors collide where they are drawn.
export function vehicleContact(a, b, resolve = true) {
  const aa = axes(a),
    ba = axes(b),
    delta = { x: a.x - b.x, z: a.z - b.z };
  const ah = [(a.width || 1.98) / 2, (a.length || 4.65) / 2],
    bh = [(b.width || 1.98) / 2, (b.length || 4.65) / 2];
  let depth = Infinity,
    normal;
  for (const axis of [...aa, ...ba]) {
    const extent =
      ah[0] * Math.abs(dot(axis, aa[0])) +
      ah[1] * Math.abs(dot(axis, aa[1])) +
      bh[0] * Math.abs(dot(axis, ba[0])) +
      bh[1] * Math.abs(dot(axis, ba[1]));
    const projection = dot(delta, axis),
      overlap = extent - Math.abs(projection);
    if (overlap <= 0) return { touching: false, impact: 0 };
    if (overlap < depth) {
      depth = overlap;
      const sign = projection >= 0 ? 1 : -1;
      normal = { x: axis.x * sign, z: axis.z * sign };
    }
  }
  if (!resolve) return { touching: true, depth, normal, impact: 0 };
  const ia = a.destroyed ? 0 : 1 / (a.mass || 1),
    ib = b.destroyed ? 0 : 1 / (b.mass || 1),
    total = ia + ib;
  if (!total) return { touching: true, impact: 0 };
  a.x += (normal.x * (depth + 0.001) * ia) / total;
  a.z += (normal.z * (depth + 0.001) * ia) / total;
  b.x -= (normal.x * (depth + 0.001) * ib) / total;
  b.z -= (normal.z * (depth + 0.001) * ib) / total;
  const vn = (a.vx - b.vx) * normal.x + (a.vz - b.vz) * normal.z;
  if (vn >= 0) return { touching: true, impact: 0 };
  a.impactNormal = { ...normal };
  b.impactNormal = { x: -normal.x, z: -normal.z };
  const impulse = (-vn * 1.18) / total;
  a.vx += normal.x * impulse * ia;
  a.vz += normal.z * impulse * ia;
  b.vx -= normal.x * impulse * ib;
  b.vz -= normal.z * impulse * ib;
  return { touching: true, impact: -vn };
}
export function treeContact(car, tree, time = 0) {
  if (tree.broken) return 0;
  const [right, forward] = axes(car),
    delta = { x: tree.x - car.x, z: tree.z - car.z };
  const lx = dot(delta, right),
    lz = dot(delta, forward),
    hw = (car.width || 1.98) / 2,
    hl = (car.length || 4.65) / 2;
  const cx = Math.max(-hw, Math.min(hw, lx)),
    cz = Math.max(-hl, Math.min(hl, lz));
  let dx = lx - cx,
    dz = lz - cz,
    d = Math.hypot(dx, dz),
    depth = tree.radius - d;
  if (depth <= 0) return 0;
  if (d < 1e-5) {
    if (hw - Math.abs(lx) < hl - Math.abs(lz)) {
      dx = Math.sign(lx) || 1;
      dz = 0;
      depth = tree.radius + hw - Math.abs(lx);
    } else {
      dx = 0;
      dz = Math.sign(lz) || 1;
      depth = tree.radius + hl - Math.abs(lz);
    }
  } else {
    dx /= d;
    dz /= d;
  }
  const nx = -(right.x * dx + forward.x * dz),
    nz = -(right.z * dx + forward.z * dz);
  car.x += nx * (depth + 0.001);
  car.z += nz * (depth + 0.001);
  const vn = car.vx * nx + car.vz * nz;
  if (vn >= 0) return 0;
  const impact = -vn;
  car.impactNormal = { x: nx, z: nz };
  if (impact >= (tree.breakSpeed || 12)) {
    tree.broken = true;
    tree.fallenAt = time;
    tree.fallAngle = Math.atan2(car.vx, car.vz);
    car.vx *= tree.breakSpeed ? 0.84 : 0.64;
    car.vz *= tree.breakSpeed ? 0.84 : 0.64;
  } else {
    car.vx -= vn * 1.12 * nx;
    car.vz -= vn * 1.12 * nz;
  }
  car.impact = Math.max(car.impact || 0, impact);
  return impact;
}
