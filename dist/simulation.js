import { TREES } from "./world-props.js";
import { vehicleContact, treeContact } from "./contacts.js";
import { RewindTimeline } from "./rewind.js";
import { RAMPS, driveRamp, stepAirborne } from "./stunts.js";
import { riverDistance } from "./district-data.js";
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
    y: 0,
    vy: 0,
    roll: 0,
    pitch: 0,
    airborne: false,
    flipped: false,
    onRamp: null,
    rampCooldown: 0,
    airTime: 0,
    airDistance: 0,
    jumpCount: 0,
    vx: 0,
    vz: 0,
    speed: 0,
    health: 100,
    nitro: 100,
    boostStrength: 0,
    boostCooldown: 0,
    nitroLocked: false,
    steering: 0,
    drift: 0,
    driftSign: 0,
    slip: 0,
    width: 1.98,
    length: 4.65,
    mass: 1,
    impact: 0,
    invulnerable: 0,
  };
}
export function resolveCircleRect(car, r, rect) {
  if (rect.angle !== undefined) {
    // Conservative broad phase: distant lots need no local transform or contact allocation.
    const bound = (rect.w + rect.d) / 2 + r;
    if (Math.abs(car.x - rect.x) > bound || Math.abs(car.z - rect.z) > bound)
      return false;
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
  const throttle = clamp(input.throttle || 0, -1, 1);
  car.steering =
    (car.steering || 0) +
    (clamp(input.steer || 0, -1, 1) - (car.steering || 0)) *
      (1 - Math.exp(-dt * 14));
  const steer = car.steering;
  car.boostCooldown = Math.max(0, (car.boostCooldown || 0) - dt);
  if (car.nitroLocked && car.nitro >= 22) car.nitroLocked = false;
  const boosting =
    !!input.boost &&
    throttle > 0 &&
    forward > 5 &&
    !input.brake &&
    !car.nitroLocked &&
    car.nitro > 0;
  car.boostStrength =
    (car.boostStrength || 0) +
    ((boosting ? 1 : 0) - (car.boostStrength || 0)) *
      (1 - Math.exp(-dt * (boosting ? 8 : 14)));
  const spec = carSpec(car.carId);
  let accel = throttle * (throttle * forward < -0.5 ? 30 : spec.acceleration);
  if (boosting) {
    accel += 19 * car.boostStrength;
    car.nitro = Math.max(0, car.nitro - dt * 25);
    car.boostCooldown = 0.85;
    if (car.nitro <= 0) car.nitroLocked = true;
  } else if (car.boostCooldown <= 0)
    car.nitro = Math.min(100, car.nitro + dt * 10);
  forward += accel * dt;
  forward *= Math.exp(-dt * (0.13 + 0.0038 * Math.abs(forward)));
  if (!throttle && Math.abs(forward) < 0.15) forward = 0;
  if (input.brake) forward *= Math.exp(-dt * 0.8);
  const limit = boosting ? spec.topSpeed + 15 : spec.topSpeed;
  // Preserve momentum on release: shed excess speed through drag instead of clipping it.
  if (forward > limit)
    forward = Math.max(limit, forward - (9 + (forward - limit) * 0.8) * dt);
  forward = Math.max(-10, Math.min(spec.topSpeed + 15, forward));
  const turn =
    -steer *
    spec.handling *
    Math.min(Math.abs(forward) / 10, 1) *
    (1.25 - 0.006 * Math.abs(forward)) *
    (input.brake ? 1.5 : 1) *
    Math.sign(forward);
  car.angle += turn * dt;
  if (input.brake && Math.abs(steer) > 0.15 && Math.abs(forward) > 11)
    car.driftSign = Math.sign(steer);
  const sliding =
    Math.abs(forward) > 10 &&
    Math.abs(steer) > 0.15 &&
    (input.brake ||
      (car.drift > 0.3 && throttle > 0 && Math.sign(steer) === car.driftSign));
  car.drift +=
    (Number(sliding) - car.drift) * (1 - Math.exp(-dt * (sliding ? 6 : 8)));
  lateral -= forward * turn * dt * car.drift;
  lateral *= Math.exp(-dt * (8.5 - car.drift * 6.7));
  lateral = clamp(lateral, -Math.abs(forward) * 0.65, Math.abs(forward) * 0.65);
  car.slip = Math.atan2(lateral, Math.max(1, Math.abs(forward)));
  car.isDrifting = Math.abs(car.slip) > 0.1 && Math.abs(forward) > 10;
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
  return vehicleContact(a, b).impact;
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
    this.driftScore = 0;
    this.stuntScore = 0;
    this.nextWaveAt = 35;
    this.heatLevel = 1;
    this.ramps = RAMPS;
    this.timeline = new RewindTimeline();
    this.trees = TREES.map((t) => ({
      ...t,
      broken: false,
      fallenAt: 0,
      fallAngle: 0,
    }));
    this.nextCopId = 1;
    this.police = [75, 115, 155].map((d, i) => {
      const p = roadProjection({
        x: START.x - Math.sin(START.angle) * d,
        z: START.z - Math.cos(START.angle) * d,
      });
      return this.makePolice(p.x, p.z, i === 2 ? "intercept" : "pursuit");
    });
    this.traffic = [];
    const rng = random(440);
    for (let i = 0; i < 32; i++) {
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
        kind: [
          "classic80",
          "classic90",
          "wagon80",
          "modern",
          "hatch90",
          "classic90",
          "sport",
        ][i % 7],
        mass: 1.05 + (i % 4) * 0.07,
        length: i % 7 === 6 ? 4.65 : i % 7 === 4 ? 4.55 : 5.05,
      });
      this.traffic.push(car);
    }
    this.lastCheckpointTime = 0;
    this.radioContact = null;
  }
  makePolice(x, z, role = "pursuit") {
    return {
      ...vehicle(x, z),
      id: this.nextCopId++,
      health: 100,
      role,
      mass: 1.2,
      length: 4.98,
      blockPoint: null,
      blockUntil: 0,
      blockExpires: 0,
      blockCooldown: 0,
      reverseUntil: 0,
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
    this.timeline.capture(this);
    this.events.push("CHASE ON — HIT THE CYAN GATES");
  }
  damagePolice(cop, impact, credit = true) {
    if (cop.destroyed || cop.hitCooldown > 0 || impact < 5) return false;
    cop.health = Math.max(0, cop.health - clamp(impact * 1.5, 22, 44));
    cop.hitCooldown = 0.9;
    this.events.push("PATROL HIT");
    if (cop.health > 0) return false;
    cop.destroyed = true;
    cop.vx = cop.vz = 0;
    cop.respawnAt = this.time + 5;
    if (credit) {
      this.takedowns++;
      this.score += 750;
    }
    this.explosions.push({ id: cop.id, x: cop.x, z: cop.z, born: this.time });
    this.events.push(credit ? "PATROL DESTROYED  +750" : "PATROL WRECKED");
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
    Object.assign(cop, this.makePolice(spawn.x, spawn.z, cop.role));
    cop.lastSeen = { x: p.x, z: p.z };
    cop.angle = Math.atan2(p.x - cop.x, p.z - cop.z);
    this.events.push("NEW PATROL INBOUND");
  }
  recover(automatic = false) {
    if (this.phase !== "running") return;
    const projected = roadProjection(this.player);
    const candidates = [projected];
    for (const d of [22, 40, 58])
      for (const sign of [1, -1])
        candidates.push(
          roadProjection({
            x: projected.x + Math.sin(projected.angle) * d * sign,
            z: projected.z + Math.cos(projected.angle) * d * sign,
          }),
        );
    const activeCars = [...this.police, ...this.traffic].filter(
      (c) => !c.destroyed,
    );
    const p =
      candidates.find(
        (q) =>
          !this.obstacles.some((b) => containsPoint(b, q.x, q.z, 2.2)) &&
          activeCars.every((c) => distance(c, q) > 12),
      ) || projected;
    this.player.x = p.x;
    this.player.z = p.z;
    this.player.vx = this.player.vz = this.player.speed = 0;
    Object.assign(this.player, {
      y: 0,
      vy: 0,
      roll: 0,
      pitch: 0,
      airborne: false,
      flipped: false,
      flipTimer: 0,
      onRamp: null,
      rampCooldown: 1.5,
    });
    this.player.steering = 0;
    this.player.boostStrength = 0;
    this.player.boosting = false;
    this.player.drift = 0;
    this.player.slip = 0;
    this.player.isDrifting = false;
    const toward = routeBetween(
      p,
      CHECKPOINTS[this.checkpoint] || CHECKPOINTS[0],
    ).find((q) => distance(q, p) > 10);
    this.player.angle = toward
      ? Math.atan2(toward.x - p.x, toward.z - p.z)
      : p.angle;
    this.player.invulnerable = 2;
    if (!automatic) this.score = Math.max(0, this.score - 200);
    this.events.push(automatic ? "BACK ON YOUR WHEELS" : "CAR RESET  −200");
  }
  addReinforcement(role, offset) {
    if (this.police.length >= 12) return;
    const p = this.player,
      target = roadProjection({
        x: p.x + Math.sin(p.angle) * offset,
        z: p.z + Math.cos(p.angle) * offset,
      });
    let spawn = target;
    if (
      distance(spawn, p) < 70 ||
      this.police.some((c) => !c.destroyed && distance(c, spawn) < 9)
    ) {
      spawn = NODES.filter(
        (n) =>
          distance(n, p) > 85 &&
          distance(n, p) < 240 &&
          this.police.every((c) => c.destroyed || distance(c, n) > 12),
      ).sort((a, b) => distance(a, target) - distance(b, target))[0];
    }
    if (!spawn) return;
    const cop = this.makePolice(spawn.x, spawn.z, role);
    cop.angle = Math.atan2(p.x - spawn.x, p.z - spawn.z);
    this.police.push(cop);
    this.events.push(
      role === "blockade" ? "ROADBLOCK UNIT INBOUND" : "REINFORCEMENTS INBOUND",
    );
  }
  update(dt, input = {}) {
    if (
      input.rewind &&
      ["running", "wrecked", "busted", "rewinding"].includes(this.phase)
    ) {
      if (this.timeline.back(this, dt)) return;
    }
    if (this.timeline.active) this.timeline.release(this);
    if (this.phase !== "running") return;
    dt = clamp(dt, 0, 0.05);
    this.time += dt;
    this.explosions = this.explosions.filter((e) => this.time - e.born < 2.2);
    const p = this.player;
    const before = { x: p.x, z: p.z };
    if (p.flipped) {
      p.flipTimer -= dt;
      p.vx *= Math.exp(-dt * 5);
      p.vz *= Math.exp(-dt * 5);
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      if (p.flipTimer <= 0 && p.health > 0) this.recover(true);
    } else if (p.airborne) {
      const landed = stepAirborne(
        p,
        input,
        dt,
        this.obstacles,
        resolveCircleRect,
      );
      if (landed) {
        const bonus = landed.flipped
          ? 50
          : Math.round(150 + landed.distance * 4);
        this.score += bonus;
        this.stuntScore += bonus;
        this.events.push(
          landed.flipped
            ? "ROLLOVER — HOLD Q TO REWIND"
            : `JUMP ${Math.round(landed.distance)} M  +${bonus}`,
        );
      }
    } else {
      stepVehicle(p, input, dt, this.obstacles);
      if (driveRamp(p, input, dt, this.ramps) === "launch")
        this.events.push("AIRBORNE — A / D TO ROLL");
    }
    if (this.time >= this.nextWaveAt) {
      const role = ["pursuit", "intercept", "blockade"][this.heatLevel % 3];
      this.addReinforcement(role, role === "blockade" ? 180 : -160);
      this.heatLevel++;
      this.nextWaveAt += 35;
    }
    const travel = distance(p, before);
    if (!p.airborne && p.y < 1 && riverDistance(p) < 39) {
      const road = roadProjection(p);
      if (road.distance > road.road.width / 2 + 2) {
        p.health = Math.max(0, p.health - 20);
        if (p.health > 0) this.recover(true);
        this.events.push("RIVER RECOVERY — HOLD Q TO REWIND");
      }
    }
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
      for (const o of [p, ...this.traffic, ...this.police]) {
        if (o === t || o.destroyed) continue;
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
        const lead = cop.role === "intercept" ? 1.8 : 0.35;
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
      if (cop.blockPoint && this.time > cop.blockExpires) {
        cop.blockPoint = null;
        cop.blockCooldown = this.time + 6;
        cop.repath = 0;
      }
      if (
        cop.role === "blockade" &&
        sighted &&
        !cop.blockPoint &&
        this.time >= cop.blockCooldown
      ) {
        const o = this.radioContact,
          speed = Math.hypot(o.vx, o.vz);
        if (speed > 8) {
          const road = roadProjection({
            x: o.x + (o.vx / speed) * (100 + (cop.id % 2) * 25),
            z: o.z + (o.vz / speed) * (100 + (cop.id % 2) * 25),
          });
          if (distance(o, road) > 55) {
            const lane =
              (cop.id % 2 ? 1 : -1) * Math.min(3, road.road.width * 0.17);
            cop.blockPoint = {
              x: road.x + Math.cos(road.angle) * lane,
              z: road.z - Math.sin(road.angle) * lane,
              angle: road.angle + Math.PI / 2,
            };
            cop.blockExpires = this.time + 12;
            cop.repath = 0;
          }
        }
      }
      if (cop.repath <= 0 || !cop.path.length) {
        cop.path = routeBetween(cop, cop.blockPoint || cop.lastSeen);
        cop.repath = 0.55;
      }
      while (cop.path.length > 1 && distance(cop, cop.path[0]) < 10)
        cop.path.shift();
      const holding = cop.blockPoint && distance(cop, cop.blockPoint) < 5;
      let target =
        cop.blockPoint &&
        distance(cop, cop.blockPoint) < 45 &&
        lineOfSight(cop, cop.blockPoint, this.obstacles)
          ? cop.blockPoint
          : !cop.blockPoint && visible && distance(cop, p) < 120
            ? cop.role === "intercept"
              ? cop.lastSeen
              : p
            : cop.path[0] || cop.lastSeen;
      const desired = holding
          ? cop.blockPoint.angle
          : Math.atan2(target.x - cop.x, target.z - cop.z),
        turn = angleDelta(desired, cop.angle);
      const max =
        (40 + Math.min(this.checkpoint, 5) * 0.7) *
        (cop.ramRecovery > 0 ? 0.55 : 1);
      let want =
        holding || distance(cop, target) < 3
          ? 0
          : max * (Math.abs(turn) > 1 ? 0.34 : Math.abs(turn) > 0.5 ? 0.66 : 1);
      // Brake for the next road bend and for another patrol's bumper, then back out if pinned.
      if (cop.path.length > 1 && target !== p && !holding) {
        const next = cop.path[1],
          bend = Math.abs(
            angleDelta(
              Math.atan2(next.x - target.x, next.z - target.z),
              desired,
            ),
          );
        const corner = Math.max(11, max - bend * 19);
        want = Math.min(
          want,
          Math.sqrt(
            corner * corner + 2 * 22 * Math.max(0, distance(cop, target) - 5),
          ),
        );
      }
      for (const other of [...this.police, ...this.traffic]) {
        if (other === cop || other.destroyed) continue;
        const dx = other.x - cop.x,
          dz = other.z - cop.z,
          ahead = dx * Math.sin(cop.angle) + dz * Math.cos(cop.angle),
          side = Math.abs(dx * Math.cos(cop.angle) - dz * Math.sin(cop.angle));
        if (ahead > 0 && ahead < 12 && side < 2)
          want = Math.min(want, Math.max(2, (ahead - 4.8) * 3));
      }
      const cs = Math.hypot(cop.vx, cop.vz);
      const yawLimit = 2.7 / (1 + cs * 0.008);
      const reversing = cop.reverseUntil > this.time;
      if (!reversing) cop.angle += clamp(turn, -yawLimit * dt, yawLimit * dt);
      const signed =
        cop.vx * Math.sin(cop.angle) + cop.vz * Math.cos(cop.angle);
      const speed =
        signed + clamp((reversing ? -7 : want) - signed, -28 * dt, 15.5 * dt);
      const grip = 1 - Math.exp(-dt * 9);
      cop.vx += (Math.sin(cop.angle) * speed - cop.vx) * grip;
      cop.vz += (Math.cos(cop.angle) * speed - cop.vz) * grip;
      const velocityLength = Math.hypot(cop.vx, cop.vz);
      if (velocityLength > 0) {
        cop.vx *= Math.abs(speed) / velocityLength;
        cop.vz *= Math.abs(speed) / velocityLength;
      }
      cop.x += cop.vx * dt;
      cop.z += cop.vz * dt;
      cop.impact = 0;
      for (const block of this.obstacles) resolveCircleRect(cop, 2.1, block);
      cop.stuck =
        !holding && (cop.impact > 1 || Math.abs(speed) < 2)
          ? cop.stuck + dt
          : Math.max(0, cop.stuck - dt);
      if (cop.stuck > 1.4) {
        cop.reverseUntil = this.time + 0.85;
        cop.stuck = 0;
        cop.repath = 0;
      }
    }
    const allCars = [
      p,
      ...this.traffic,
      ...this.police.filter((c) => !c.destroyed),
    ];
    const officers = new Set(this.police);
    // Iterative body contacts resolve traffic, officers and the player as one physical system.
    for (let pass = 0; pass < 3; pass++)
      for (let i = 0; i < allCars.length; i++)
        for (let j = i + 1; j < allCars.length; j++) {
          const a = allCars[i],
            b = allCars[j];
          if (
            a.destroyed ||
            b.destroyed ||
            Math.abs((a.y || 0) - (b.y || 0)) > 1.6 ||
            Math.abs(a.x - b.x) > 6 ||
            Math.abs(a.z - b.z) > 6
          )
            continue;
          const impact = collideVehicles(a, b);
          if (impact <= 4) continue;
          const playerHit = a === p || b === p;
          if (playerHit && p.invulnerable <= 0) {
            const other = a === p ? b : a,
              damage = officers.has(other)
                ? Math.min(8, impact * 0.35)
                : impact * 0.55;
            p.health = Math.max(
              0,
              p.health - damage * carSpec(p.carId).damageScale,
            );
            p.invulnerable = 0.8;
            this.events.push("COLLISION");
          }
          for (const cop of [a, b])
            if (officers.has(cop)) {
              if (cop.ramRecovery <= 0) cop.ramRecovery = playerHit ? 2.6 : 0.8;
              this.damagePolice(cop, impact, playerHit);
            }
        }
    for (const car of allCars) {
      if (car.destroyed) continue;
      for (const tree of this.trees) {
        if (
          (car.y || 0) > 2.5 ||
          tree.broken ||
          Math.abs(tree.x - car.x) > 4 ||
          Math.abs(tree.z - car.z) > 4
        )
          continue;
        const impact = treeContact(car, tree, this.time);
        if (impact > 4 && car === p) {
          if (p.invulnerable <= 0) {
            p.health = Math.max(
              0,
              p.health -
                Math.min(18, impact * 0.4) * carSpec(p.carId).damageScale,
            );
            p.invulnerable = 0.8;
          }
          this.events.push(tree.broken ? "TREE DOWN" : "COLLISION");
        } else if (impact > 5 && officers.has(car))
          this.damagePolice(car, impact, false);
      }
      // Pairwise pushes cannot leave an officer or civilian inside a building.
      for (const block of this.obstacles)
        if ((car.y || 0) < (block.h || 50) + 1)
          resolveCircleRect(car, 2.1, block);
    }
    let closest = Infinity;
    for (const cop of this.police)
      if (!cop.destroyed) closest = Math.min(closest, distance(cop, p));
    for (const t of this.traffic) {
      const d = distance(t, p);
      if (d > 4 && d < 7 && Math.abs(p.speed) > 20 && !t.nearMiss) {
        this.score += 150;
        t.nearMiss = true;
        this.events.push("NEAR MISS  +150");
      }
    }
    if (p.isDrifting && p.impact < 3) {
      const points = Math.abs(p.speed) * dt * 0.65;
      this.score += points;
      this.driftScore += points;
    } else if (this.driftScore > 0) {
      if (this.driftScore > 10)
        this.events.push("DRIFT  +" + Math.round(this.driftScore));
      this.driftScore = 0;
    }
    this.roadblockAhead = this.police.some(
      (c) => !c.destroyed && c.blockPoint && distance(c.blockPoint, p) < 110,
    );
    // Resolve dynamic collision displacement against static geometry as well.
    for (const block of this.obstacles)
      if ((p.y || 0) < (block.h || 50) + 1) resolveCircleRect(p, 2.1, block);
    p.speed = p.vx * Math.sin(p.angle) + p.vz * Math.cos(p.angle);
    this.bust = clamp(
      this.bust +
        (closest < 8 && Math.abs(p.speed) < 5 && !p.airborne && !p.flipped
          ? dt
          : -dt * 0.8),
      0,
      4,
    );
    this.closestPolice = closest;
    const cp = CHECKPOINTS[this.checkpoint];
    if (cp && distance(p, cp) < 13 && p.y < 3 && !p.flipped) {
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
      if (this.checkpoint === 2) this.addReinforcement("blockade", 125);
      if (this.checkpoint === 4) {
        this.addReinforcement("blockade", 170);
        this.addReinforcement("intercept", -110);
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
    if (this.phase === "running") this.timeline.capture(this);
  }
  snapshot() {
    return {
      phase: this.phase,
      score: Math.floor(this.score),
      checkpoint: this.checkpoint,
      total: 6,
      time: Number(this.time.toFixed(1)),
      rewindAvailable: +this.timeline.available.toFixed(2),
      rewound: this.timeline.active
        ? +(this.timeline.end - this.timeline.cursor).toFixed(2)
        : 0,
      heatLevel: this.heatLevel,
      nextWaveIn: Math.max(0, Math.ceil(this.nextWaveAt - this.time)),
      jumps: this.player.jumpCount,
      stuntScore: this.stuntScore,
      player: {
        x: +this.player.x.toFixed(2),
        z: +this.player.z.toFixed(2),
        y: +(this.player.y || 0).toFixed(2),
        airborne: !!this.player.airborne,
        flipped: !!this.player.flipped,
        speed: Math.round(Math.abs(this.player.speed) * 3.6),
        health: Math.ceil(this.player.health),
        nitro: Math.round(this.player.nitro),
        boosting: !!this.player.boosting,
        boostStrength: +this.player.boostStrength.toFixed(2),
        turboState: this.player.boosting
          ? "boosting"
          : this.player.nitroLocked
            ? "recharging"
            : this.player.boostCooldown > 0
              ? "cooling"
              : "ready",
        drifting: !!this.player.isDrifting,
        slipAngle: Math.round((this.player.slip * 180) / Math.PI),
      },
      police: this.police.length,
      activePolice: this.police.filter((c) => !c.destroyed).length,
      policeHealth: this.police.map((c) => ({
        id: c.id,
        hp: Math.ceil(c.health),
        destroyed: c.destroyed,
        role: c.role,
      })),
      car: this.player.carId,
      takedowns: this.takedowns,
      treesBroken: this.trees.filter((t) => t.broken).length,
      roadblockAhead: !!this.roadblockAhead,
      escape: Number(this.escape.toFixed(1)),
      bust: Number(this.bust.toFixed(1)),
    };
  }
}
