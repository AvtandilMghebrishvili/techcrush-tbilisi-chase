// Deterministic, renderer-independent simulation. Distances are metres, time is seconds.
import {
  GRID,
  GRID_RADIUS,
  LIMIT,
  ROAD_EDGE,
  TOWER,
  carSpec,
} from "./config.js";
export { GRID, LIMIT } from "./config.js";
export const CHECKPOINTS = [
  { x: 4, z: 100, name: "Rustaveli Avenue", axis: "z" },
  { x: 112, z: 140, name: "Freedom Square", axis: "x" },
  { x: 280, z: -70, name: "Abanotubani", axis: "z" },
  { x: -252, z: -280, name: "Old Tbilisi", axis: "x" },
  { x: -140, z: 252, name: "Mtatsminda Tower", axis: "z" },
  { x: 0, z: 420, name: "Georgian Highway", axis: "z" },
];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const angleDelta = (a, b) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function blocks() {
  const out = [];
  for (let x = -GRID_RADIUS; x < GRID_RADIUS; x++)
    for (let z = -GRID_RADIUS; z < GRID_RADIUS; z++) {
      if (x === -1 && z === 1) {
        out.push({
          minX: TOWER.x - 13,
          maxX: TOWER.x + 13,
          minZ: TOWER.z - 13,
          maxZ: TOWER.z + 13,
        });
        continue;
      }
      out.push({
        minX: x * GRID + 22,
        maxX: (x + 1) * GRID - 22,
        minZ: z * GRID + 22,
        maxZ: (z + 1) * GRID - 22,
      });
    }
  return out;
}
export function vehicle(x = 4, z = -30, angle = 0) {
  return {
    x,
    z,
    angle,
    vx: 0,
    vz: 0,
    speed: 0,
    health: 100,
    nitro: 100,
    impact: 0,
    invulnerable: 0,
  };
}
export function resolveCircleRect(car, r, rect) {
  const nx = clamp(car.x, rect.minX, rect.maxX),
    nz = clamp(car.z, rect.minZ, rect.maxZ);
  let dx = car.x - nx,
    dz = car.z - nz,
    d = Math.hypot(dx, dz);
  if (d >= r) return false;
  if (d === 0) {
    const sides = [
      { d: car.x - rect.minX, x: -1, z: 0 },
      { d: rect.maxX - car.x, x: 1, z: 0 },
      { d: car.z - rect.minZ, x: 0, z: -1 },
      { d: rect.maxZ - car.z, x: 0, z: 1 },
    ].sort((a, b) => a.d - b.d);
    dx = sides[0].x;
    dz = sides[0].z;
    car.x += dx * (sides[0].d + r);
    car.z += dz * (sides[0].d + r);
  } else {
    dx /= d;
    dz /= d;
    car.x += dx * (r - d);
    car.z += dz * (r - d);
  }
  const vn = car.vx * dx + car.vz * dz;
  if (vn < 0) {
    car.impact = Math.max(car.impact, -vn);
    car.vx -= vn * 1.25 * dx;
    car.vz -= vn * 1.25 * dz;
  }
  return true;
}
export function stepVehicle(car, input, dt, obstacles = [], isPlayer = true) {
  const f = { x: Math.sin(car.angle), z: Math.cos(car.angle) },
    r = { x: f.z, z: -f.x };
  let forward = car.vx * f.x + car.vz * f.z,
    lateral = car.vx * r.x + car.vz * r.z;
  const throttle = clamp(input.throttle || 0, -1, 1),
    steer = clamp(input.steer || 0, -1, 1);
  const boosting =
    !!input.boost && throttle > 0 && forward > 5 && car.nitro > 1;
  const spec = carSpec(car.carId);
  let accel = throttle * (throttle * forward < -0.5 ? 30 : spec.acceleration);
  if (boosting) {
    accel += 19;
    car.nitro = Math.max(0, car.nitro - dt * 25);
  } else car.nitro = Math.min(100, car.nitro + dt * 8);
  forward += accel * dt;
  forward *= Math.exp(-dt * (0.13 + 0.0038 * Math.abs(forward)));
  if (!throttle && Math.abs(forward) < 0.15) forward = 0;
  if (input.brake) forward *= Math.exp(-dt * 0.8);
  forward = clamp(forward, -10, boosting ? spec.topSpeed + 15 : spec.topSpeed);
  const turn =
    -steer *
    spec.handling *
    Math.min(Math.abs(forward) / 10, 1) *
    (1.25 - 0.006 * Math.abs(forward)) *
    (input.brake ? 1.5 : 1) *
    Math.sign(forward);
  car.angle += turn * dt;
  lateral *= Math.exp(-dt * (input.brake ? 1.45 : 8.5));
  car.vx = Math.sin(car.angle) * forward + Math.cos(car.angle) * lateral;
  car.vz = Math.cos(car.angle) * forward - Math.sin(car.angle) * lateral;
  car.x += car.vx * dt;
  car.z += car.vz * dt;
  car.impact = 0;
  car.invulnerable = Math.max(0, car.invulnerable - dt);
  for (const rect of obstacles) resolveCircleRect(car, 2.1, rect);
  if (Math.abs(car.x) > LIMIT) {
    car.x = clamp(car.x, -LIMIT, LIMIT);
    car.impact = Math.abs(car.vx);
    car.vx *= -0.3;
  }
  if (Math.abs(car.z) > LIMIT) {
    car.z = clamp(car.z, -LIMIT, LIMIT);
    car.impact = Math.max(car.impact, Math.abs(car.vz));
    car.vz *= -0.3;
  }
  car.speed = car.vx * Math.sin(car.angle) + car.vz * Math.cos(car.angle);
  if (isPlayer && car.impact > 5 && car.invulnerable <= 0) {
    car.health = Math.max(
      0,
      car.health - (car.impact - 3) * 0.65 * spec.damageScale,
    );
    car.invulnerable = 0.7;
  }
  car.boosting = boosting;
  return car;
}
export function collideVehicles(a, b) {
  const dx = a.x - b.x,
    dz = a.z - b.z,
    d = Math.hypot(dx, dz),
    radius = 3.65;
  if (d >= radius) return 0;
  const nx = d > 0.001 ? dx / d : 1,
    nz = d > 0.001 ? dz / d : 0;
  const correction = (radius - d) * 0.5;
  a.x += nx * correction;
  a.z += nz * correction;
  b.x -= nx * correction;
  b.z -= nz * correction;
  const relative = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
  if (relative < 0) {
    const impulse = -relative * 0.7;
    a.vx += nx * impulse;
    a.vz += nz * impulse;
    b.vx -= nx * impulse;
    b.vz -= nz * impulse;
    return -relative;
  }
  return 0;
}
function roadProjection(p) {
  const x = clamp(Math.round(p.x / GRID) * GRID, -ROAD_EDGE, ROAD_EDGE),
    z = clamp(Math.round(p.z / GRID) * GRID, -ROAD_EDGE, ROAD_EDGE);
  return Math.abs(p.x - x) < Math.abs(p.z - z)
    ? { x, z: p.z, vertical: true }
    : { x: p.x, z, vertical: false };
}
// Choose among the adjacent intersections; the shortest legal Manhattan route wins.
export function routeBetween(from, to) {
  const a = roadProjection(from),
    b = roadProjection(to);
  if (
    (a.vertical && b.vertical && a.x === b.x) ||
    (!a.vertical && !b.vertical && a.z === b.z)
  )
    return [
      { x: b.x, z: b.z },
      { x: to.x, z: to.z },
    ];
  const endpoints = (p) =>
    p.vertical
      ? [Math.floor(p.z / GRID), Math.ceil(p.z / GRID)].map((k) => ({
          x: p.x,
          z: clamp(k * GRID, -ROAD_EDGE, ROAD_EDGE),
        }))
      : [Math.floor(p.x / GRID), Math.ceil(p.x / GRID)].map((k) => ({
          x: clamp(k * GRID, -ROAD_EDGE, ROAD_EDGE),
          z: p.z,
        }));
  let best = null,
    bestCost = Infinity;
  for (const start of endpoints(a))
    for (const end of endpoints(b)) {
      const cost =
        distance(a, start) +
        Math.abs(start.x - end.x) +
        Math.abs(start.z - end.z) +
        distance(end, b);
      if (cost < bestCost) {
        bestCost = cost;
        best = [
          start,
          { x: end.x, z: start.z },
          end,
          { x: b.x, z: b.z },
          { x: to.x, z: to.z },
        ];
      }
    }
  return best
    .filter((p, i) => i === 0 || distance(p, best[i - 1]) > 1)
    .filter((p, i) => i > 0 || distance(p, from) > 7);
}
export function lineOfSight(a, b, obstacles) {
  const d = distance(a, b),
    steps = Math.ceil(d / 8);
  for (let i = 1; i < steps; i++) {
    const x = a.x + ((b.x - a.x) * i) / steps,
      z = a.z + ((b.z - a.z) * i) / steps;
    if (
      obstacles.some(
        (o) => x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ,
      )
    )
      return false;
  }
  return true;
}
function random(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export class ChaseSimulation {
  constructor() {
    this.obstacles = blocks();
    this.reset();
  }
  reset() {
    this.player = vehicle();
    this.player.carId = this.selectedCar || "gt";
    this.time = 0;
    this.score = 0;
    this.checkpoint = 0;
    this.phase = "ready";
    this.bust = 0;
    this.escape = 0;
    this.events = [];
    this.explosions = [];
    this.takedowns = 0;
    this.nextCopId = 1;
    this.police = [this.makePolice(-5, -90), this.makePolice(7, -125)];
    this.traffic = [];
    const rng = random(440);
    for (let i = 0; i < 40; i++) {
      const vertical = i % 2 === 0,
        lane =
          ((Math.floor(i / 2) % (GRID_RADIUS * 2 + 1)) - GRID_RADIUS) * GRID,
        dir = i % 4 < 2 ? 1 : -1;
      let pos = -ROAD_EDGE + rng() * ROAD_EDGE * 2;
      if (lane === 0 && Math.abs(pos + 30) < 70) pos = 220;
      const car = vehicle(
        vertical ? lane + dir * 7 : pos,
        vertical ? pos : lane - dir * 7,
        vertical
          ? dir > 0
            ? 0
            : Math.PI
          : dir > 0
            ? Math.PI / 2
            : -Math.PI / 2,
      );
      Object.assign(car, {
        vertical,
        lane,
        dir,
        cruise: 12 + rng() * 8,
        nearMiss: false,
      });
      this.traffic.push(car);
    }
    this.lastCheckpointTime = 0;
  }
  makePolice(x, z) {
    return {
      ...vehicle(x, z),
      id: this.nextCopId++,
      health: 100,
      hitCooldown: 0,
      destroyed: false,
      respawnAt: 0,
      path: [],
      repath: 0,
      stuck: 0,
      lastSeen: { x: 4, z: -30 },
    };
  }
  start(carId = this.selectedCar || "gt") {
    this.selectedCar = carSpec(carId).id;
    this.reset();
    this.phase = "running";
    this.events.push("CHASE ON — HIT THE CYAN GATES");
  }
  damagePolice(cop, impact) {
    if (cop.destroyed || cop.hitCooldown > 0 || impact < 5) return false;
    cop.health = Math.max(0, cop.health - clamp(impact * 1.5, 22, 44));
    cop.hitCooldown = 0.9;
    this.events.push("PATROL HIT");
    if (cop.health > 0) return false;
    cop.destroyed = true;
    cop.vx = cop.vz = 0;
    cop.respawnAt = this.time + 5;
    this.takedowns++;
    this.score += 750;
    this.explosions.push({ id: cop.id, x: cop.x, z: cop.z, born: this.time });
    this.events.push("PATROL DESTROYED  +750");
    return true;
  }
  respawnPolice(cop) {
    const p = this.player;
    // Replacements enter on a road well behind the player, never on top of them.
    let spawn = roadProjection({
      x: clamp(p.x - Math.sin(p.angle) * 170, -ROAD_EDGE, ROAD_EDGE),
      z: clamp(p.z - Math.cos(p.angle) * 170, -ROAD_EDGE, ROAD_EDGE),
    });
    if (distance(spawn, p) < 110) {
      const candidates = [
        { x: -ROAD_EDGE, z: p.z },
        { x: ROAD_EDGE, z: p.z },
        { x: p.x, z: -ROAD_EDGE },
        { x: p.x, z: ROAD_EDGE },
      ].map(roadProjection);
      spawn = candidates.sort((a, b) => distance(b, p) - distance(a, p))[0];
    }
    Object.assign(cop, this.makePolice(spawn.x, spawn.z));
    cop.lastSeen = { x: p.x, z: p.z };
    cop.angle = Math.atan2(p.x - cop.x, p.z - cop.z);
    this.events.push("NEW PATROL INBOUND");
  }
  recover() {
    if (this.phase !== "running") return;
    const p = roadProjection(this.player);
    this.player.x = p.x;
    this.player.z = p.z;
    this.player.vx = this.player.vz = this.player.speed = 0;
    this.player.angle = p.vertical ? 0 : Math.PI / 2;
    this.player.invulnerable = 2;
    this.score = Math.max(0, this.score - 200);
    this.events.push("CAR RESET  −200");
  }
  update(dt, input = {}) {
    if (this.phase !== "running") return;
    dt = clamp(dt, 0, 0.05);
    this.time += dt;
    this.explosions = this.explosions.filter((e) => this.time - e.born < 2.2);
    const p = this.player;
    const before = { x: p.x, z: p.z };
    stepVehicle(p, input, dt, this.obstacles);
    const travel = distance(p, before);
    this.score += travel * 1.8;
    for (const t of this.traffic) {
      const direction = t.vertical ? { x: 0, z: t.dir } : { x: t.dir, z: 0 };
      let cruise = t.cruise;
      for (const o of [p, ...this.traffic]) {
        if (o === t) continue;
        const dx = o.x - t.x,
          dz = o.z - t.z,
          ahead = dx * direction.x + dz * direction.z,
          side = Math.abs(dx * direction.z - dz * direction.x);
        if (ahead > 0 && ahead < 15 && side < 3.5)
          cruise = Math.min(cruise, Math.max(0, ahead - 5));
      }
      t.vx = direction.x * cruise;
      t.vz = direction.z * cruise;
      t.x += t.vx * dt;
      t.z += t.vz * dt;
      if (t.vertical && Math.abs(t.z) > LIMIT + 12) {
        t.z = -Math.sign(t.z) * (LIMIT + 12);
        t.nearMiss = false;
      }
      if (!t.vertical && Math.abs(t.x) > LIMIT + 12) {
        t.x = -Math.sign(t.x) * (LIMIT + 12);
        t.nearMiss = false;
      }
    }
    for (const cop of this.police) {
      if (cop.destroyed) {
        if (this.time >= cop.respawnAt) this.respawnPolice(cop);
        else continue;
      }
      cop.hitCooldown = Math.max(0, cop.hitCooldown - dt);
      cop.repath -= dt;
      const visible =
        distance(cop, p) < 190 && lineOfSight(cop, p, this.obstacles);
      if (visible) cop.lastSeen = { x: p.x + p.vx * 0.4, z: p.z + p.vz * 0.4 };
      if (cop.repath <= 0 || !cop.path.length) {
        cop.path = routeBetween(cop, cop.lastSeen);
        cop.repath = 1.4;
      }
      while (cop.path.length > 1 && distance(cop, cop.path[0]) < 10)
        cop.path.shift();
      const target = cop.path[0] || cop.lastSeen;
      const desired = Math.atan2(target.x - cop.x, target.z - cop.z),
        turn = angleDelta(desired, cop.angle);
      const max = 34 + Math.min(this.checkpoint, 4) * 1.4;
      const want =
        distance(cop, target) < 5
          ? 0
          : max * (Math.abs(turn) > 1 ? 0.3 : Math.abs(turn) > 0.5 ? 0.6 : 1);
      const cs = Math.hypot(cop.vx, cop.vz);
      cop.angle += clamp(turn, -2.1 * dt, 2.1 * dt);
      const speed = cs + clamp(want - cs, -24 * dt, 12 * dt);
      cop.vx = Math.sin(cop.angle) * speed;
      cop.vz = Math.cos(cop.angle) * speed;
      cop.x += cop.vx * dt;
      cop.z += cop.vz * dt;
      cop.impact = 0;
      for (const block of this.obstacles) resolveCircleRect(cop, 2.1, block);
      cop.stuck =
        cop.impact > 1 || speed < 2
          ? cop.stuck + dt
          : Math.max(0, cop.stuck - dt);
      if (cop.stuck > 2) {
        const road = roadProjection(cop);
        cop.x = road.x;
        cop.z = road.z;
        cop.vx = cop.vz = 0;
        cop.angle = desired;
        cop.stuck = 0;
        cop.repath = 0;
      }
    }
    let closest = Infinity;
    for (const t of [...this.traffic, ...this.police]) {
      if (t.destroyed) continue;
      const d = distance(t, p);
      const impact = collideVehicles(p, t);
      if (impact > 4 && p.invulnerable <= 0) {
        p.health = Math.max(
          0,
          p.health - impact * 0.55 * carSpec(p.carId).damageScale,
        );
        p.invulnerable = 0.8;
        this.events.push("COLLISION");
      }
      if (this.police.includes(t)) {
        this.damagePolice(t, impact);
        if (!t.destroyed) closest = Math.min(closest, d);
      } else if (d > 4 && d < 7 && Math.abs(p.speed) > 20 && !t.nearMiss) {
        this.score += 150;
        t.nearMiss = true;
        this.events.push("NEAR MISS  +150");
      }
    }
    // Resolve dynamic collision displacement against static geometry as well.
    for (const block of this.obstacles) resolveCircleRect(p, 2.1, block);
    this.bust = clamp(
      this.bust + (closest < 8 && Math.abs(p.speed) < 5 ? dt : -dt * 0.8),
      0,
      4,
    );
    this.closestPolice = closest;
    const cp = CHECKPOINTS[this.checkpoint];
    if (cp && distance(p, cp) < 13) {
      this.checkpoint++;
      const bonus =
        1000 +
        Math.max(
          0,
          Math.round(800 - (this.time - this.lastCheckpointTime) * 12),
        );
      this.score += bonus;
      this.lastCheckpointTime = this.time;
      p.health = Math.min(100, p.health + 10);
      p.nitro = Math.min(100, p.nitro + 25);
      this.events.push(`CHECKPOINT ${this.checkpoint}/6  +${bonus}`);
      if (this.checkpoint === 3) {
        const route = roadProjection({
          x: p.x - 70 * Math.sin(p.angle),
          z: p.z - 70 * Math.cos(p.angle),
        });
        this.police.push(this.makePolice(route.x, route.z));
      }
      if (this.checkpoint === 6)
        this.events.push("ALL CHECKPOINTS — LOSE THE POLICE");
    }
    if (this.checkpoint === 6) {
      const unseen = this.police.every(
        (c) =>
          c.destroyed ||
          distance(c, p) > 100 ||
          (!lineOfSight(c, p, this.obstacles) && distance(c, p) > 60),
      );
      this.escape = clamp(this.escape + (unseen ? dt : -dt * 1.5), 0, 8);
      if (this.escape >= 8) {
        this.phase = "won";
        this.score += 3000 + Math.round(p.health * 20);
      }
    }
    if (p.health <= 0) {
      this.phase = "wrecked";
    } else if (this.bust >= 4) {
      this.phase = "busted";
    }
  }
  snapshot() {
    return {
      phase: this.phase,
      score: Math.floor(this.score),
      checkpoint: this.checkpoint,
      total: 6,
      time: Number(this.time.toFixed(1)),
      player: {
        x: +this.player.x.toFixed(2),
        z: +this.player.z.toFixed(2),
        speed: Math.round(Math.abs(this.player.speed) * 3.6),
        health: Math.ceil(this.player.health),
      },
      police: this.police.length,
      activePolice: this.police.filter((c) => !c.destroyed).length,
      policeHealth: this.police.map((c) => ({
        id: c.id,
        hp: Math.ceil(c.health),
        destroyed: c.destroyed,
      })),
      car: this.player.carId,
      takedowns: this.takedowns,
      escape: Number(this.escape.toFixed(1)),
      bust: Number(this.bust.toFixed(1)),
    };
  }
}
