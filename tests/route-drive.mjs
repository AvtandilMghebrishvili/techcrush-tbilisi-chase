// A full driving smoke test: controller uses the same throttle/steer/brake inputs as a player.
import {
  ChaseSimulation,
  CHECKPOINTS,
  routeBetween,
  distance,
  angleDelta,
  clamp,
} from "../dist/simulation.js";
const sim = new ChaseSimulation();
sim.start(process.argv[2] || "gt");
let route = [],
  lastCP = -1,
  escapeLeg = 0,
  stalled = 0;
const escapeRoute = [
  { x: 0, z: 560 },
  { x: 560, z: 560 },
  { x: 560, z: -560 },
  { x: -560, z: -560 },
];
for (let frame = 0; frame < 120 * 300 && sim.phase === "running"; frame++) {
  const p = sim.player;
  stalled = sim.time > 3 && Math.abs(p.speed) < 3 ? stalled + 1 / 120 : 0;
  if (stalled > 1.1) {
    // Use the ordinary R recovery action, including its score penalty, after being pinned.
    sim.recover();
    lastCP = -1;
    stalled = 0;
  }
  if (
    sim.checkpoint === 6 &&
    distance(p, escapeRoute[escapeLeg % escapeRoute.length]) < 17
  ) {
    escapeLeg++;
    lastCP = -1;
  }
  const cp =
    CHECKPOINTS[sim.checkpoint] || escapeRoute[escapeLeg % escapeRoute.length];
  if (sim.checkpoint !== lastCP) {
    route = routeBetween(p, cp);
    lastCP = sim.checkpoint;
  }
  while (route.length > 1 && distance(p, route[0]) < 13) route.shift();
  const target = route[0] || cp,
    delta = angleDelta(Math.atan2(target.x - p.x, target.z - p.z), p.angle),
    d = distance(p, target);
  const sprint =
    (sim.checkpoint === 6 || sim.closestPolice < 60) &&
    Math.abs(delta) < 0.15 &&
    d > 110 &&
    p.nitro > 8;
  const desired = Math.abs(delta) > 0.5 ? 12 : d < 48 ? 17 : sprint ? 54 : 43;
  const throttle = p.speed > desired + 2 ? -1 : p.speed < desired ? 1 : 0;
  sim.update(1 / 120, {
    throttle,
    steer: clamp(-delta * 1.9, -1, 1),
    brake: Math.abs(delta) > 1.3,
    boost: sprint,
  });
}
console.log(JSON.stringify(sim.snapshot(), null, 2));
if (sim.phase !== "won") process.exitCode = 1;
