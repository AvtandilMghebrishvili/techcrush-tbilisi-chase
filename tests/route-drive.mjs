import { carSpec } from "../dist/config.js";
import { NODES, nearestRoad } from "../dist/city-map.js";
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
  CHECKPOINTS[3],
  CHECKPOINTS[1],
  CHECKPOINTS[4],
  CHECKPOINTS[0],
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
  while (route.length > 1 && distance(p, route[0]) < 9) route.shift();
  const target = route[0] || cp,
    delta = angleDelta(Math.atan2(target.x - p.x, target.z - p.z), p.angle),
    d = distance(p, target);
  if (process.env.TRACE && frame % 480 === 0)
    console.log({
      time: sim.time,
      cp: sim.checkpoint,
      x: p.x,
      z: p.z,
      angle: p.angle,
      speed: p.speed,
      target,
      delta,
      path: route.slice(0, 3),
    });
  const next =
    route[1] ||
    routeBetween(cp, CHECKPOINTS[sim.checkpoint + 1] || escapeRoute[0]).find(
      (q) => distance(q, cp) > 18,
    );
  const futureTurn = next
    ? Math.abs(
        angleDelta(
          Math.atan2(next.x - target.x, next.z - target.z),
          Math.atan2(target.x - p.x, target.z - p.z),
        ),
      )
    : 0;
  const cornerSpeed = Math.max(10, 44 - futureTurn * 20);
  const brakingSpeed = Math.sqrt(
    cornerSpeed * cornerSpeed + 2 * 20 * Math.max(0, d - 9),
  );
  const sprint =
    Math.abs(delta) < 0.1 && futureTurn < 0.14 && d > 50 && p.nitro > 8;
  const desired =
    Math.abs(delta) > 0.7 ? 11 : Math.min(sprint ? 56 : 44, brakingSpeed);
  const throttle = p.speed > desired + 2 ? -1 : p.speed < desired ? 1 : 0;
  sim.update(1 / 120, {
    throttle,
    steer: clamp(
      (-delta * 1.9) / Math.max(1, carSpec(p.carId).handling),
      -1,
      1,
    ),
    brake: Math.abs(delta) > 1.3,
    boost: sprint,
  });
}
console.log(JSON.stringify(sim.snapshot(), null, 2));
if (sim.phase !== "won") process.exitCode = 1;
