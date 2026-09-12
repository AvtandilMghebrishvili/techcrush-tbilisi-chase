import { SPECIAL_RAMPS, roofAt } from "./world-sites.js";
import { IS_KUTAISI } from "./map-selection.js";
import { nearbyObstacles } from "./spatial-index.js";
import { nearestRoad, geo } from "./city-map.js";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Roadside ramps leave the other lane clear. Locations are shared by rendering and physics.
export const RAMPS = (
  IS_KUTAISI
    ? [
        [42.2701, 42.6948, "RUSTAVELI LAUNCH"],
        [42.2734, 42.7092, "GELATI STREET HOP"],
        [42.2616, 42.7033, "RIONI EMBANKMENT HOP"],
        [42.2753, 42.699, "BAGRATI LAUNCH"],
      ]
    : [
        [41.69657, 44.80515, "BARATASHVILI LAUNCH"],
        [41.70086, 44.79738, "RUSTAVELI HOP"],
        [41.69599, 44.80847, "BRIDGE JUMP"],
        [41.69068, 44.80892, "OLD TOWN LAUNCH"],
      ]
).map(([lat, lon, name], id) => {
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
RAMPS.push(...SPECIAL_RAMPS);
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
  p.vy = r.lift
    ? Math.min(28, velocity * r.lift)
    : 5 + Math.min(8, velocity * 0.15);
  p.lastRamp = r.id;
  p.launchSpeed = velocity;
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
function fallFromSurface(p) {
  p.airborne = true;
  p.vy = 0;
  p.airTime = 0;
  p.airDistance = 0;
  p.rollRate = 0;
  p.pitchRate = 0;
  p.onRamp = null;
}
// Swept faces prevent entry through the high end/side, even at maximum turbo.
export function resolveRampSolid(p, r, before, allowSlope = true) {
  const a = rampLocal(before, r),
    b = rampLocal(p, r);
  const radius = (p.width || 2) / 2,
    hw = r.width / 2,
    hl = r.length / 2;
  if (
    Math.abs(b.side) > hw + radius + 4 ||
    Math.abs(b.along) > hl + radius + 4 ||
    (p.y || 0) >= r.height + 0.2
  )
    return false;
  let ns = 0,
    na = 0,
    side = b.side,
    along = b.along;
  if (
    !allowSlope &&
    a.along <= -hl &&
    b.along > -hl - radius &&
    Math.abs(b.side) < hw + radius
  ) {
    along = -hl - radius;
    na = -1;
  } else if (
    a.along >= hl &&
    b.along < hl + radius &&
    Math.abs(b.side) < hw + radius &&
    (p.y || 0) < r.height - 0.2
  ) {
    along = hl + radius;
    na = 1;
  } else if (
    Math.abs(b.along) < hl + radius &&
    Math.abs(b.side) < hw + radius &&
    Math.abs(a.side) >= hw
  ) {
    const height = clamp(b.along / r.length + 0.5, 0, 1) * r.height;
    if (height > (p.y || 0) + 0.3) {
      ns = Math.sign(a.side) || 1;
      side = ns * (hw + radius);
    }
  }
  if (!ns && !na) return false;
  const nx = ns * Math.cos(r.angle) + na * Math.sin(r.angle),
    nz = -ns * Math.sin(r.angle) + na * Math.cos(r.angle);
  p.x = r.x + side * Math.cos(r.angle) + along * Math.sin(r.angle);
  p.z = r.z - side * Math.sin(r.angle) + along * Math.cos(r.angle);
  const impact = Math.max(0, -p.vx * nx - p.vz * nz);
  p.vx += nx * impact * 1.18;
  p.vz += nz * impact * 1.18;
  p.impact = Math.max(p.impact || 0, impact);
  p.impactNormal = { x: nx, z: nz };
  return true;
}
export function driveRamp(p, input, dt, ramps = RAMPS, before = p) {
  p.rampCooldown = Math.max(0, (p.rampCooldown || 0) - dt);
  const roof = roofAt(p);
  if (p.y >= 13.9 && !p.airborne) {
    if (roof) {
      p.y = roof.h;
      p.pitch = 0;
      return;
    }
    fallFromSurface(p);
    return;
  }
  const previous = ramps.find((r) => r.id === p.onRamp);
  for (const r of ramps)
    if (r !== previous && resolveRampSolid(p, r, before)) return "impact";
  if (previous) {
    const q = rampLocal(p, previous);
    if (
      q.along >= previous.length / 2 &&
      Math.abs(q.side) < previous.width / 2 &&
      launchRamp(p, previous, input)
    )
      return "launch";
    if (
      Math.abs(q.side) >= previous.width / 2 ||
      q.along > previous.length / 2
    ) {
      fallFromSurface(p);
      return;
    }
  }
  p.onRamp = null;
  if (p.rampCooldown <= 0)
    for (const r of ramps) {
      const q = rampLocal(p, r),
        a = rampLocal(before, r);
      if (
        Math.abs(q.side) < r.width / 2 &&
        Math.abs(q.along) < r.length / 2 &&
        (previous === r || a.along <= -r.length / 2 + 0.5)
      ) {
        p.onRamp = r.id;
        p.y = (q.along / r.length + 0.5) * r.height;
        p.pitch = -Math.atan(r.height / r.length) * Math.cos(p.angle - r.angle);
        return;
      }
    }
  p.y = 0;
  p.pitch = 0;
}
export function stepAirborne(p, input, dt, obstacles, resolve) {
  p.airTime += dt;
  p.airDistance += Math.hypot(p.vx, p.vz) * dt;
  p.impact = 0;
  const previousY = p.y;
  p.vy -= 15 * dt;
  p.y += p.vy * dt;
  p.rollRate += -(input.steer || 0) * 2.2 * dt;
  p.pitchRate +=
    ((input.throttle || 0) < 0 ? 1.5 : (input.throttle || 0) > 0 ? -0.55 : 0) *
    dt;
  p.roll += p.rollRate * dt;
  p.pitch += p.pitchRate * dt;
  const steps = Math.max(1, Math.ceil((Math.hypot(p.vx, p.vz) * dt) / 0.8));
  for (let i = 0; i < steps; i++) {
    p.x += (p.vx * dt) / steps;
    p.z += (p.vz * dt) / steps;
    for (const o of nearbyObstacles(obstacles, p.x, p.z, 5))
      if (p.y < (o.h || 50) - 0.1) resolve(p, 2.1, o);
  }
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  p.boosting = false;
  p.boostStrength *= Math.exp(-dt * 10);
  const roof = roofAt(p, 1);
  const surface = roof && previousY >= roof.h - 0.01 && p.vy <= 0 ? roof.h : 0;
  if (p.y > surface) return null;
  const landingSpeed = -p.vy,
    upright = Math.cos(p.roll) * Math.cos(p.pitch) > 0.48;
  p.y = surface;
  p.vy = 0;
  p.airborne = false;
  p.lastLandingRamp = p.lastRamp;
  p.rampCooldown = 1.2;
  const damage = (!upright ? 18 : 0) + Math.max(0, landingSpeed - 13) * 1.2;
  p.health = Math.max(
    0,
    p.health - damage * (p.performance?.landingScale || 1),
  );
  if (!upright) {
    p.flipped = true;
    p.y = 1.38;
    p.roll = Math.PI;
    p.pitch = 0;
    p.vx *= 0.15;
    p.vz *= 0.15;
    p.flipTimer = 0.8;
  } else {
    p.roll = 0;
    p.pitch = 0;
  }
  return {
    flipped: !upright,
    damage,
    distance: p.airDistance,
    surface,
    ramp: p.lastRamp,
    time: p.airTime,
  };
}
