import { treeContact } from "./contacts.js";
// Oriented chassis against a static rendered prism. No enclosing collision
// circle: doors may pass close to a wall while bumpers still hit it head-on.
export function buildingContact(car, rect) {
  if (rect.flyoverRail && rect.slope) {
    const dx = car.x - rect.x,
      dz = car.z - rect.z;
    const along = dx * Math.sin(rect.angle) + dz * Math.cos(rect.angle);
    const t = Math.max(0, Math.min(1, along / rect.slope.length + 0.5));
    const base = rect.slope.a + (rect.slope.b - rect.slope.a) * t;
    if ((car.y || 0) + (car.height || 1.6) < base || (car.y || 0) > base + 1.05)
      return false;
  }
  if (
    rect.broken ||
    (rect.h != null &&
      (car.y || 0) >= rect.h + (rect.cornices ? 1.175 : 0) - 0.02) ||
    (rect.base || 0) > (car.y || 0) + (car.height || 1.6)
  )
    return false;
  const x = rect.x ?? (rect.minX + rect.maxX) / 2,
    z = rect.z ?? (rect.minZ + rect.maxZ) / 2;
  let w = rect.w ?? rect.maxX - rect.minX,
    d = rect.d ?? rect.maxZ - rect.minZ;
  const low = car.y || 0,
    high = low + (car.height || 1.6);
  if (rect.dome || rect.cylinder) {
    const base = rect.base || 0;
    const radius =
      rect.cylinder?.radius ??
      rect.dome.radius *
        Math.sqrt(
          Math.max(
            0,
            1 - ((Math.max(low, base) - base) / rect.dome.height) ** 2,
          ),
        );
    const beforeX = car.x,
      beforeZ = car.z;
    treeContact(car, { x, z, radius, breakSpeed: Infinity });
    return car.x !== beforeX || car.z !== beforeZ;
  }
  if (rect.cornices) {
    if (low <= rect.h + 1.175 && high >= rect.h + 0.625) {
      w += 0.8;
      d += 0.8;
    } else if (rect.cornices.some((y) => low <= y + 0.16 && high >= y - 0.16)) {
      w += 0.65;
      d += 0.65;
    } else if (low >= rect.h) return false;
  }
  if (rect.tubeSection) {
    const { radius, cy } = rect.tubeSection;
    const y = Math.max(low, Math.min(high, cy));
    const fraction = 1 - ((y - cy) / (radius * 0.81)) ** 2;
    if (fraction <= 0) return false;
    d = 2 * radius * Math.sqrt(fraction);
  }
  const dx = car.x - x,
    dz = car.z - z,
    hw = car.width / 2,
    hl = car.length / 2;
  if (
    Math.abs(dx) > (w + d) / 2 + hw + hl ||
    Math.abs(dz) > (w + d) / 2 + hw + hl
  )
    return false;
  const a = car.angle || 0,
    b = rect.angle || 0,
    ac = Math.cos(a),
    as = Math.sin(a),
    bc = Math.cos(b),
    bs = Math.sin(b),
    axes = [
      [ac, -as],
      [as, ac],
      [bc, -bs],
      [bs, bc],
    ];
  let depth = Infinity,
    nx = 0,
    nz = 0;
  for (const [ux, uz] of axes) {
    const extent =
      hw * Math.abs(ux * ac - uz * as) +
      hl * Math.abs(ux * as + uz * ac) +
      (w / 2) * Math.abs(ux * bc - uz * bs) +
      (d / 2) * Math.abs(ux * bs + uz * bc);
    const projection = dx * ux + dz * uz,
      overlap = extent - Math.abs(projection);
    if (overlap <= 0) return false;
    if (overlap < depth) {
      depth = overlap;
      const sign = projection >= 0 ? 1 : -1;
      nx = ux * sign;
      nz = uz * sign;
    }
  }
  const impact = Math.max(0, -car.vx * nx - car.vz * nz);
  car.impactNormal = { x: nx, z: nz };
  if (rect.barrier && impact >= rect.breakSpeed) {
    rect.broken = true;
    car.vx *= 0.78;
    car.vz *= 0.78;
    car.impact = Math.max(car.impact || 0, impact * 0.65);
    return true;
  }
  car.x += nx * (depth + 0.001);
  car.z += nz * (depth + 0.001);
  if (impact) {
    car.vx += nx * impact * 1.25;
    car.vz += nz * impact * 1.25;
  }
  car.impact = Math.max(car.impact || 0, impact);
  return true;
}
