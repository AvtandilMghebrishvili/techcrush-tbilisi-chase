const SEND_EVERY = 1400;
const EXPIRE_AFTER = 7500;
const shortestAngle = (from, to) => {
  let change = (to - from) % (Math.PI * 2);
  if (change > Math.PI) change -= Math.PI * 2;
  if (change < -Math.PI) change += Math.PI * 2;
  return change;
};
const mix = (a, b, t) => a + (b - a) * t;

export class GhostPresence {
  constructor(profile, map) {
    this.profile = profile;
    this.map = map;
    this.session = crypto.randomUUID();
    this.remotes = new Map();
    this.nextSend = 0;
    this.inFlight = false;
    this.disposed = false;
  }
  tick(sim, visualY, now = performance.now()) {
    const active = ["running", "rewinding"].includes(sim.phase);
    if (!active || document.hidden || this.disposed) {
      this.remotes.clear();
      return;
    }
    if (now < this.nextSend || this.inFlight) return;
    this.nextSend = now + SEND_EVERY;
    this.inFlight = true;
    const p = sim.player;
    this.profile
      .request("/api/ghosts", "POST", {
        session: this.session,
        map: this.map,
        car: p.carId,
        x: p.x,
        y: Number.isFinite(visualY) ? visualY : p.y || 0,
        z: p.z,
        angle: p.angle,
        pitch: p.pitch || 0,
        roll: p.roll || 0,
      })
      .then((data) => this.accept(data.ghosts || [], performance.now()))
      .catch(() => {})
      .finally(() => (this.inFlight = false));
  }
  accept(ghosts, now) {
    const seen = new Set();
    for (const next of ghosts) {
      if (!next?.id || next.id === this.session) continue;
      seen.add(next.id);
      const old = this.remotes.get(next.id);
      const from = old ? this.pose(old, now) : next;
      this.remotes.set(next.id, {
        from,
        to: next,
        received: now,
        duration: old ? SEND_EVERY : 1,
      });
    }
    for (const [id, remote] of this.remotes)
      if (!seen.has(id) && now - remote.received > EXPIRE_AFTER)
        this.remotes.delete(id);
  }
  pose(remote, now) {
    const t = Math.min(
      1,
      Math.max(0, (now - remote.received) / remote.duration),
    );
    return {
      id: remote.to.id,
      car: remote.to.car,
      name: String(remote.to.name || "DRIVER").slice(0, 20),
      x: mix(Number(remote.from.x), Number(remote.to.x), t),
      y: mix(Number(remote.from.y), Number(remote.to.y), t),
      z: mix(Number(remote.from.z), Number(remote.to.z), t),
      angle:
        Number(remote.from.angle) +
        shortestAngle(Number(remote.from.angle), Number(remote.to.angle)) * t,
      pitch: mix(
        Number(remote.from.pitch || 0),
        Number(remote.to.pitch || 0),
        t,
      ),
      roll: mix(Number(remote.from.roll || 0), Number(remote.to.roll || 0), t),
    };
  }
  sample(now = performance.now()) {
    const result = [];
    for (const [id, remote] of this.remotes) {
      if (now - remote.received > EXPIRE_AFTER) {
        this.remotes.delete(id);
        continue;
      }
      result.push(this.pose(remote, now));
    }
    return result;
  }
  dispose() {
    this.disposed = true;
    this.remotes.clear();
  }
}
