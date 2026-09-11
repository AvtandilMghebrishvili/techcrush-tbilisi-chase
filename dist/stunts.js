import { nearestRoad, geo } from "./city-map.js";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Roadside ramps leave the other lane clear. Locations are shared by rendering and physics.
export const RAMPS = [
  [41.69657, 44.80515, "BARATASHVILI LAUNCH"],
  [41.70086, 44.79738, "RUSTAVELI HOP"],
  [41.69599, 44.80847, "BRIDGE JUMP"],
  [41.69068, 44.80892, "OLD TOWN LAUNCH"],
].map(([lat, lon, name], id) => {
  const p = nearestRoad(geo(lat, lon)),
    side = id % 2 ? 1 : -1;
  return {
    id,
    name,
    x: p.x + Math.cos(p.angle) * side * 3.5,
    z: p.z - Math.sin(p.angle) * side * 3.5,
    angle: p.angle,
    width: 4.2,
    length: 10,
    height: 1.85,
  };
});
export function rampLocal(p, r) {
  const dx = p.x - r.x,
    dz = p.z - r.z;
  return {
    side: dx * Math.cos(r.angle) - dz * Math.sin(r.angle),
    along: dx * Math.sin(r.angle) + dz * Math.cos(r.angle),
  };
}
export function launchRamp(p, r, input) {
  const velocity = p.vx * Math.sin(r.angle) + p.vz * Math.cos(r.angle);
  if (velocity < 9) return false;
  const local = rampLocal(p, r);
  p.airborne = true;
  p.y = r.height;
  p.vy = 5 + Math.min(8, velocity * 0.15);
  p.pitch = -Math.atan(r.height / r.length);
  p.roll = 0;
  p.pitchRate = 0.25;
  p.rollRate =
    -(input.steer || 0) * 2.5 + clamp(local.side / r.width, -0.5, 0.5) * 0.5;
  p.airTime = 0;
  p.airDistance = 0;
  p.onRamp = null;
  p.rampCooldown = 1;
  p.isDrifting = false;
  p.drift = 0;
  p.slip = 0;
  p.jumpCount = (p.jumpCount || 0) + 1;
  return true;
}
export function driveRamp(p, input, dt, ramps = RAMPS) {
  p.rampCooldown = Math.max(0, (p.rampCooldown || 0) - dt);
  const previous = ramps.find((r) => r.id === p.onRamp);
  if (previous) {
    const q = rampLocal(p, previous);
    if (
      q.along >= previous.length / 2 &&
      Math.abs(q.side) < previous.width / 2 + 1 &&
      launchRamp(p, previous, input)
    )
      return "launch";
  }
  p.onRamp = null;
  p.y = 0;
  p.pitch = 0;
  if (p.rampCooldown > 0) return;
  for (const r of ramps) {
    const q = rampLocal(p, r);
    if (Math.abs(q.side) < r.width / 2 && Math.abs(q.along) < r.length / 2) {
      p.onRamp = r.id;
      p.y = (q.along / r.length + 0.5) * r.height;
      const alignment = Math.cos(p.angle - r.angle);
      p.pitch = -Math.atan(r.height / r.length) * alignment;
      return;
    }
  }
}
export function stepAirborne(p, input, dt, obstacles, resolve) {
  p.airTime += dt;
  p.airDistance += Math.hypot(p.vx, p.vz) * dt;
  p.vy -= 15 * dt;
  p.y += p.vy * dt;
  p.rollRate += -(input.steer || 0) * 2.2 * dt;
  p.pitchRate +=
    ((input.throttle || 0) < 0 ? 1.5 : (input.throttle || 0) > 0 ? -0.55 : 0) *
    dt;
  p.roll += p.rollRate * dt;
  p.pitch += p.pitchRate * dt;
  p.x += p.vx * dt;
  p.z += p.vz * dt;
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  p.boosting = false;
  p.boostStrength *= Math.exp(-dt * 10);
  p.impact = 0;
  for (const o of obstacles) if (p.y < (o.h || 50) + 1) resolve(p, 2.1, o);
  if (p.y > 0) return null;
  const landingSpeed = -p.vy,
    upright = Math.cos(p.roll) * Math.cos(p.pitch) > 0.48;
  p.y = 0;
  p.vy = 0;
  p.airborne = false;
  p.rampCooldown = 1.2;
  const damage = (!upright ? 18 : 0) + Math.max(0, landingSpeed - 13) * 1.2;
  p.health = Math.max(0, p.health - damage);
  if (!upright) {
    p.flipped = true;
    p.y = 1.38;
    p.roll = Math.PI;
    p.pitch = 0;
    p.vx *= 0.15;
    p.vz *= 0.15;
    p.flipTimer = 1.8;
  } else {
    p.roll = 0;
    p.pitch = 0;
  }
  return {
    flipped: !upright,
    damage,
    distance: p.airDistance,
    time: p.airTime,
  };
}
