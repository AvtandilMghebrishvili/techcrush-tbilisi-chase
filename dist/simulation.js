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
import {
  START,
  CHECKPOINTS,
  BUILDINGS,
  NODES,
  ROADS,
  nearestRoad,
  containsPoint,
} from "./city-map.js";
import { routeBetween } from "./city-map.js";
export { CHECKPOINTS, routeBetween } from "./city-map.js";
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const angleDelta = (a, b) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function blocks() {
  return BUILDINGS;
}
export function vehicle(x = 0, z = 0, angle = 0) {
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
  if (rect.angle !== undefined) {
    const c = Math.cos(rect.angle),
      s = Math.sin(rect.angle),
      dx = car.x - rect.x,
      dz = car.z - rect.z;
    const local = {
      x: c * dx - s * dz,
      z: s * dx + c * dz,
      vx: c * car.vx - s * car.vz,
      vz: s * car.vx + c * car.vz,
      impact: car.impact,
    };
    const hit = resolveCircleRect(local, r, {
      minX: -rect.w / 2,
      maxX: rect.w / 2,
      minZ: -rect.d / 2,
      maxZ: rect.d / 2,
    });
    if (hit) {
      car.x = rect.x + c * local.x + s * local.z;
      car.z = rect.z - s * local.x + c * local.z;
      car.vx = c * local.vx + s * local.vz;
      car.vz = -s * local.vx + c * local.vz;
      car.impact = local.impact;
    }
    return hit;
  }
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
const roadProjection = nearestRoad;
export function lineOfSight(a, b, obstacles) {
  const d = distance(a, b),
    steps = Math.ceil(d / 8);
  for (let i = 1; i < steps; i++) {
    const x = a.x + ((b.x - a.x) * i) / steps,
      z = a.z + ((b.z - a.z) * i) / steps;
    if (obstacles.some((o) => containsPoint(o, x, z))) return false;
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
    this.player = vehicle(START.x, START.z, START.angle);
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
    this.police = [70, 110].map((d) => {
      const p = roadProjection({
        x: START.x - Math.sin(START.angle) * d,
        z: START.z - Math.cos(START.angle) * d,
      });
      return this.makePolice(p.x, p.z);
    });
    this.traffic = [];
    const rng = random(440);
    for (let i = 0; i < 26; i++) {
      const road = ROADS[(i * 17 + 5) % ROADS.length],
        t = rng(),
        reverse = i % 2 === 0;
      const car = vehicle(
        road.start.x + (road.end.x - road.start.x) * t,
        road.start.z + (road.end.z - road.start.z) * t,
        road.angle + (reverse ? Math.PI : 0),
      );
      if (distance(car, this.player) < 45) continue;
      Object.assign(car, {
        toNode: reverse ? road.a : road.b,
        fromNode: reverse ? road.b : road.a,
        cruise: 10 + rng() * 7,
        nearMiss: false,
        turnSeed: i,
      });
      this.traffic.push(car);
    }
    this.lastCheckpointTime = 0;
    this.radioContact = null;
  }
  makePolice(x, z) {
    return {
      ...vehicle(x, z),
      id: this.nextCopId++,
      health: 100,
      hitCooldown: 0,
      ramRecovery: 0,
      destroyed: false,
      respawnAt: 0,
      path: [],
      repath: 0,
      stuck: 0,
      lastSeen: { x: START.x, z: START.z },
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
    const toward = routeBetween(
      p,
      CHECKPOINTS[this.checkpoint] || CHECKPOINTS[0],
    ).find((q) => distance(q, p) > 10);
    this.player.angle = toward
      ? Math.atan2(toward.x - p.x, toward.z - p.z)
      : p.angle;
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
      let target = NODES[t.toNode];
      if (distance(t, target) < 7) {
        const candidates = target.links.filter((e) => e.node !== t.fromNode);
        const link = (candidates.length ? candidates : target.links)[
          t.turnSeed++ % (candidates.length || target.links.length)
        ];
        t.fromNode = t.toNode;
        t.toNode = link.node;
        target = NODES[t.toNode];
        t.nearMiss = false;
      }
      const source = NODES[t.fromNode],
        heading = Math.atan2(target.x - source.x, target.z - source.z);
      // Right-hand traffic follows a lane offset through each actual intersection.
      const lane = {
        x: target.x - Math.cos(heading) * 3,
        z: target.z + Math.sin(heading) * 3,
      };
      const desired = Math.atan2(lane.x - t.x, lane.z - t.z);
      t.angle += clamp(angleDelta(desired, t.angle), -2.4 * dt, 2.4 * dt);
      const direction = { x: Math.sin(t.angle), z: Math.cos(t.angle) };
      let cruise = t.cruise;
      for (const o of [p, ...this.traffic]) {
        if (o === t) continue;
        const dx = o.x - t.x,
          dz = o.z - t.z,
          ahead = dx * direction.x + dz * direction.z,
          side = Math.abs(dx * direction.z - dz * direction.x);
        if (ahead > 0 && ahead < 15 && side < 3.2)
          cruise = Math.min(cruise, Math.max(0, ahead - 5));
      }
      t.vx += (direction.x * cruise - t.vx) * Math.min(1, dt * 2);
      t.vz += (direction.z * cruise - t.vz) * Math.min(1, dt * 2);
      t.speed = Math.hypot(t.vx, t.vz);
      t.x += t.vx * dt;
      t.z += t.vz * dt;
      for (const block of this.obstacles) resolveCircleRect(t, 2.1, block);
    }
    // Patrols share observed positions. Once all sightlines are broken the radio goes quiet.
    const sighted = this.police.some(
      (cop) =>
        !cop.destroyed &&
        distance(cop, p) < 260 &&
        lineOfSight(cop, p, this.obstacles),
    );
    if (sighted)
      this.radioContact = {
        x: p.x,
        z: p.z,
        vx: p.vx,
        vz: p.vz,
        time: this.time,
      };
    for (const cop of this.police) {
      if (cop.destroyed) {
        if (this.time >= cop.respawnAt) this.respawnPolice(cop);
        else continue;
      }
      cop.hitCooldown = Math.max(0, cop.hitCooldown - dt);
      cop.ramRecovery = Math.max(0, cop.ramRecovery - dt);
      cop.repath -= dt;
      const visible =
        distance(cop, p) < 260 && lineOfSight(cop, p, this.obstacles);
      if (sighted) {
        // One unit stays on the rear bumper, another tries to intercept farther ahead.
        const lead = cop.id % 2 ? 0.35 : 1.1;
        const observation = this.radioContact;
        const predicted = {
          x: clamp(
            observation.x + observation.vx * lead,
            -ROAD_EDGE,
            ROAD_EDGE,
          ),
          z: clamp(
            observation.z + observation.vz * lead,
            -ROAD_EDGE,
            ROAD_EDGE,
          ),
        };
        cop.lastSeen = lineOfSight(observation, predicted, this.obstacles)
          ? predicted
          : { x: observation.x, z: observation.z };
      }
      if (cop.repath <= 0 || !cop.path.length) {
        cop.path = routeBetween(cop, cop.lastSeen);
        cop.repath = 0.55;
      }
      while (cop.path.length > 1 && distance(cop, cop.path[0]) < 10)
        cop.path.shift();
      const target =
        visible && distance(cop, p) < 140 ? p : cop.path[0] || cop.lastSeen;
      const desired = Math.atan2(target.x - cop.x, target.z - cop.z),
        turn = angleDelta(desired, cop.angle);
      const max =
        (38 + Math.min(this.checkpoint, 5) * 0.65) *
        (cop.ramRecovery > 0 ? 0.55 : 1);
      const want =
        distance(cop, target) < 5
          ? 0
          : max * (Math.abs(turn) > 1 ? 0.34 : Math.abs(turn) > 0.5 ? 0.66 : 1);
      const cs = Math.hypot(cop.vx, cop.vz);
      cop.angle += clamp(turn, -2.7 * dt, 2.7 * dt);
      const speed = cs + clamp(want - cs, -28 * dt, 14.5 * dt);
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
      if (cop.stuck > 1.4) {
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
        const damage = this.police.includes(t)
          ? Math.min(8, impact * 0.35)
          : impact * 0.55;
        p.health = Math.max(
          0,
          p.health - damage * carSpec(p.carId).damageScale,
        );
        p.invulnerable = 0.8;
        this.events.push("COLLISION");
      }
      if (this.police.includes(t)) {
        if (impact > 4 && t.ramRecovery <= 0) t.ramRecovery = 3.2;
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
      p.health = Math.min(100, p.health + 30);
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
