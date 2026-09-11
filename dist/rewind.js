const clone = (value) => structuredClone(value);
const scalars = [
  "time",
  "score",
  "checkpoint",
  "bust",
  "escape",
  "takedowns",
  "driftScore",
  "lastCheckpointTime",
  "nextCopId",
  "nextWaveAt",
  "heatLevel",
  "closestPolice",
  "roadblockAhead",
  "stuntScore",
  "runCash",
  "trafficWrecks",
];
export class RewindTimeline {
  constructor() {
    this.frames = [];
    this.recordAt = 0;
    this.active = false;
    this.cursor = 0;
    this.lastApplied = -1;
  }
  get available() {
    return this.frames.length > 1
      ? Math.min(5, this.frames.at(-1).time - this.frames[0].time)
      : 0;
  }
  capture(sim) {
    if (sim.time + 1e-6 < this.recordAt) return;
    this.recordAt = sim.time + 1 / 30;
    const frame = {
      player: clone(sim.player),
      police: clone(sim.police),
      traffic: clone(sim.traffic),
      radioContact: clone(sim.radioContact),
      helicopter: clone(sim.helicopter),
      explosions: clone(sim.explosions),
      broken: sim.trees.flatMap((t, i) =>
        t.broken ? [[i, t.fallenAt, t.fallAngle]] : [],
      ),
      poles: (sim.poles || []).map((p) => ({
        broken: p.broken,
        fallenAt: p.fallenAt,
        fallAngle: p.fallAngle,
      })),
    };
    for (const k of scalars) frame[k] = sim[k];
    this.frames.push(frame);
    while (this.frames.length > 1 && frame.time - this.frames[0].time > 5.001)
      this.frames.shift();
  }
  restore(sim, index) {
    const f = this.frames[index];
    if (!f) return;
    for (const k of scalars) sim[k] = f[k];
    for (const k of [
      "player",
      "police",
      "traffic",
      "radioContact",
      "helicopter",
      "explosions",
    ])
      sim[k] = clone(f[k]);
    for (const t of sim.trees) {
      t.broken = false;
      t.fallenAt = 0;
      t.fallAngle = 0;
    }
    for (const [i, at, a] of f.broken) {
      Object.assign(sim.trees[i], { broken: true, fallenAt: at, fallAngle: a });
    }
    for (const [i, p] of (sim.poles || []).entries())
      Object.assign(
        p,
        f.poles?.[i] || { broken: false, fallenAt: 0, fallAngle: 0 },
      );
    sim.events.length = 0;
    sim.soundEvents.length = 0;
    sim.soundCooldowns.clear();
    this.lastApplied = index;
  }
  back(sim, dt) {
    if (!this.active) {
      if (this.available < 0.1) return false;
      this.active = true;
      this.cursor = this.frames.at(-1).time;
      this.end = this.cursor;
      this.lastApplied = -1;
    }
    this.cursor = Math.max(this.frames[0].time, this.cursor - dt * 0.8);
    let i = this.frames.length - 1;
    while (i > 0 && this.frames[i].time > this.cursor) i--;
    if (i !== this.lastApplied) this.restore(sim, i);
    const a = this.frames[i],
      b = this.frames[i + 1];
    if (b) {
      const alpha = (this.cursor - a.time) / (b.time - a.time);
      for (const key of ["x", "z", "y", "angle", "roll", "pitch"])
        sim.player[key] =
          (a.player[key] || 0) +
          ((b.player[key] || 0) - (a.player[key] || 0)) * alpha;
      for (const group of ["police", "traffic"])
        sim[group].forEach((car, j) => {
          const from = a[group][j],
            to =
              group === "police"
                ? b[group].find((q) => q.id === car.id)
                : b[group][j];
          if (!from || !to) return;
          for (const k of ["x", "z", "angle"])
            car[k] = from[k] + (to[k] - from[k]) * alpha;
        });
    }
    sim.time = this.cursor;
    sim.phase = "rewinding";
    return true;
  }
  release(sim) {
    if (!this.active) return;
    const index = this.lastApplied;
    this.restore(sim, index);
    this.frames.length = index + 1;
    this.recordAt = sim.time + 1 / 30;
    this.active = false;
    sim.phase = "running";
    sim.events.push("TIMELINE RESUMED");
  }
}
