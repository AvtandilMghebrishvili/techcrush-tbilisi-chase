export function cablePoint(start, end, t, side = 1) {
  const dx = end.x - start.x,
    dz = end.z - start.z,
    length = Math.hypot(dx, dz) || 1;
  return {
    x: start.x + dx * t + (dz / length) * side * 2.1,
    y:
      start.y +
      (end.y - start.y) * t -
      Math.sin(Math.PI * t) * Math.min(3.5, length * 0.006),
    z: start.z + dz * t - (dx / length) * side * 2.1,
  };
}
export function cabinProgress(time, offset, length) {
  const phase =
    (time / Math.max(90, length / 4)) * Math.PI * 2 + offset * Math.PI * 2;
  // Smooth reversal at stations, without teleporting or disconnecting the hanger.
  return (1 - Math.cos(phase)) / 2;
}
