// Immutable footprints, mutable break state. A cell query preserves source order
// so iterative contacts behave exactly like the full scan.
const cache = new WeakMap();
const CELL = 48;
export function nearbyObstacles(obstacles, x, z, radius = 0) {
  let index = cache.get(obstacles);
  if (!index || index.length !== obstacles.length) {
    const cells = new Map();
    obstacles.forEach((o, id) => {
      const c = Math.abs(Math.cos(o.angle || 0)),
        s = Math.abs(Math.sin(o.angle || 0));
      const hx = ((o.w || 0) * c + (o.d || 0) * s) / 2;
      const hz = ((o.w || 0) * s + (o.d || 0) * c) / 2;
      const minX = o.minX ?? o.x - Math.max(hx, o.radius || 0),
        maxX = o.maxX ?? o.x + Math.max(hx, o.radius || 0);
      const minZ = o.minZ ?? o.z - Math.max(hz, o.radius || 0),
        maxZ = o.maxZ ?? o.z + Math.max(hz, o.radius || 0);
      for (
        let ix = Math.floor(minX / CELL);
        ix <= Math.floor(maxX / CELL);
        ix++
      )
        for (
          let iz = Math.floor(minZ / CELL);
          iz <= Math.floor(maxZ / CELL);
          iz++
        ) {
          const key = ix + ":" + iz;
          if (!cells.has(key)) cells.set(key, []);
          cells.get(key).push(id);
        }
    });
    index = { cells, length: obstacles.length };
    cache.set(obstacles, index);
  }
  const ids = new Set();
  for (
    let ix = Math.floor((x - radius) / CELL);
    ix <= Math.floor((x + radius) / CELL);
    ix++
  )
    for (
      let iz = Math.floor((z - radius) / CELL);
      iz <= Math.floor((z + radius) / CELL);
      iz++
    )
      for (const id of index.cells.get(ix + ":" + iz) || []) ids.add(id);
  return [...ids].sort((a, b) => a - b).map((id) => obstacles[id]);
}
