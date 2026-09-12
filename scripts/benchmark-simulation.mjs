import { ChaseSimulation } from "../dist/simulation.js";
import { performance } from "node:perf_hooks";
const samples = [];
for (let run = 0; run < 4; run++) {
  const sim = new ChaseSimulation();
  sim.start("gt", { level: 3 });
  sim.nextWaveAt = Infinity;
  const start = performance.now();
  for (let i = 0; i < 1200; i++) {
    sim.update(1 / 120, { throttle: 0 });
    sim.player.health = 100;
    sim.bust = 0;
    sim.phase = "running";
  }
  samples.push(performance.now() - start);
}
console.log(
  JSON.stringify(
    {
      millisecondsPer1200Steps: samples,
      median: samples.slice(1).sort((a, b) => a - b)[1],
    },
    null,
    2,
  ),
);
