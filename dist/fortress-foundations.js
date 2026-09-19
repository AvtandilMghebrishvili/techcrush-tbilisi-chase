// Foundations use the same terrain sampler as collision, including both ends
// and edges of a wall. The buried margin covers the rendered terrain triangles.
export function fortressFoundations(center, heightAt) {
  const points = Array.from({ length: 9 }, (_, i) => ({
    x: center.x - 95 + i * 24,
    z: center.z + Math.sin(i * 0.65) * 20,
  }));
  const bounds = (samples, crown) => {
    const heights = samples.map((p) => heightAt(p.x, p.z));
    return {
      base: Math.min(...heights) - 3,
      top: Math.max(...heights) + crown,
    };
  };
  const walls = points.slice(1).map((b, i) => {
    const a = points[i],
      angle = Math.atan2(b.x - a.x, b.z - a.z),
      length = Math.hypot(b.x - a.x, b.z - a.z);
    const samples = [];
    for (let j = 0; j <= 8; j++)
      for (const side of [-1, 0, 1])
        samples.push({
          x: a.x + ((b.x - a.x) * j) / 8 + Math.cos(angle) * side * 2.5,
          z: a.z + ((b.z - a.z) * j) / 8 - Math.sin(angle) * side * 2.5,
        });
    return {
      x: (a.x + b.x) / 2,
      z: (a.z + b.z) / 2,
      angle,
      w: 5,
      d: length + 0.6,
      ...bounds(samples, 11),
      samples,
    };
  });
  const towers = [0, 3, 6, 8].map((i) => {
    const p = points[i],
      samples = [
        p,
        ...Array.from({ length: 16 }, (_, j) => ({
          x: p.x + Math.cos((j * Math.PI) / 8) * 9,
          z: p.z + Math.sin((j * Math.PI) / 8) * 9,
        })),
      ];
    return { ...p, ...bounds(samples, 17), samples };
  });
  return { walls, towers };
}
