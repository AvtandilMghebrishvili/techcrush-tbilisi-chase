export function cablePoint(start, end, t, side = 1) {
  const dx = end.x - start.x,
    dz = end.z - start.z,
    length = Math.hypot(dx, dz) || 1;
  return {
    x: start.x + dx * t + (dz / length) * side * 3.2,
    y:
      start.y +
      (end.y - start.y) * t -
      Math.sin(Math.PI * t) * Math.min(3.5, length * 0.006),
    z: start.z + dz * t - (dx / length) * side * 3.2,
  };
}
// A continuous two-lane circuit: cabins never pass through each other or teleport.
export function cableLoopPoint(start, end, phase) {
  const dx = end.x - start.x,
    dz = end.z - start.z,
    L = Math.hypot(dx, dz) || 1,
    r = 3.2;
  const span = 2 * L + 2 * Math.PI * r;
  let d = (((phase % 1) + 1) % 1) * span;
  if (d < L)
    return { ...cablePoint(start, end, d / L, 1), heading: Math.atan2(dx, dz) };
  d -= L;
  if (d < Math.PI * r) {
    const a = d / r;
    return {
      x: end.x + (dz / L) * r * Math.cos(a) + (dx / L) * r * Math.sin(a),
      z: end.z - (dx / L) * r * Math.cos(a) + (dz / L) * r * Math.sin(a),
      y: end.y,
      heading: Math.atan2(
        dx * Math.cos(a) - dz * Math.sin(a),
        dz * Math.cos(a) + dx * Math.sin(a),
      ),
    };
  }
  d -= Math.PI * r;
  if (d < L)
    return {
      ...cablePoint(start, end, 1 - d / L, -1),
      heading: Math.atan2(-dx, -dz),
    };
  const a = (d - L) / r;
  return {
    x: start.x - (dz / L) * r * Math.cos(a) - (dx / L) * r * Math.sin(a),
    z: start.z + (dx / L) * r * Math.cos(a) - (dz / L) * r * Math.sin(a),
    y: start.y,
    heading: Math.atan2(
      -dx * Math.cos(a) + dz * Math.sin(a),
      -dz * Math.cos(a) - dx * Math.sin(a),
    ),
  };
}
export const cableLoopPhase = (time, offset, length) =>
  offset + (time * 3.2) / (2 * length + 2 * Math.PI * 3.2);
export function cabinProgress(time, offset, length) {
  const phase =
    (time / Math.max(90, length / 4)) * Math.PI * 2 + offset * Math.PI * 2;
  // Smooth reversal at stations, without teleporting or disconnecting the hanger.
  return (1 - Math.cos(phase)) / 2;
}
