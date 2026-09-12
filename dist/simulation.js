import { ROOFTOP, QUEST_BOX, roofAt } from "./world-sites.js";
import { buildingContact } from "./building-contact.js";
import { levelRewards, creditAward } from "./community-rules.js";
import { TREES } from "./world-props.js";
import { BRIDGE_BARRIERS } from "./bridge-data.js";
import { nearbyObstacles } from "./spatial-index.js";
import { resolveTerrain, terrainBlocked } from "./terrain.js";
import {
  unsupportedWater,
  driveableLine,
  beginWater,
  stepWater,
} from "./water.js";
import {
  freshDamage,
  dentVehicle,
  repairBody,
  EXPLOSION_LIFETIME,
  IMPACT_LIFETIME,
} from "./damage-state.js";
import { vehicleContact, treeContact } from "./contacts.js";
import { RewindTimeline } from "./rewind.js";
import { RAMPS, driveRamp, stepAirborne, resolveRampSolid } from "./stunts.js";
import { upgradedSpec, pursuitTuning } from "./progression.js";
import { checkpointsForLevel } from "./level-routes.js";
import { createAirSupport, updateAirSupport } from "./air-support.js";
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
  return [
    ...BUILDINGS,
    ...BRIDGE_BARRIERS.map((b) => ({ ...b, broken: false })),
  ];
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
    damage: freshDamage(),
    damageAt: {},
    invulnerable: 0,
  };
}
export function resolveCircleRect(car, r, rect) {
  if (car.width && car.length) return buildingContact(car, rect);
  if (
    rect.broken ||
    (rect.h != null && (car.y || 0) >= rect.h - 0.1) ||
    (rect.base && (car.y || 0) + 1.8 < rect.base)
  )
    return false;
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
      impact: 0,
    };
    const hit = resolveCircleRect(local, r, {
      minX: -rect.w / 2,
      maxX: rect.w / 2,
      minZ: -rect.d / 2,
      maxZ: rect.d / 2,
    });
    if (hit) {
      if (rect.barrier && local.impact >= rect.breakSpeed) {
        rect.broken = true;
        car.vx *= 0.78;
        car.vz *= 0.78;
        car.impact = Math.max(car.impact || 0, local.impact * 0.65);
        return true;
      }
      car.x = rect.x + c * local.x + s * local.z;
      car.z = rect.z - s * local.x + c * local.z;
      car.vx = c * local.vx + s * local.vz;
      car.vz = -s * local.vx + c * local.vz;
      car.impact = Math.max(car.impact || 0, local.impact);
      if (local.impactNormal)
        car.impactNormal = {
          x: c * local.impactNormal.x + s * local.impactNormal.z,
          z: -s * local.impactNormal.x + c * local.impactNormal.z,
        };
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
    car.impactNormal = { x: dx, z: dz };
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
  const burst = !!input.boostLatched;
  const burning =
    !!input.boost &&
    (burst || (throttle > 0 && forward > 5 && !input.brake)) &&
    !car.nitroLocked &&
    car.nitro > 0;
  // A tapped mobile burst burns its tank continuously. Braking/reverse retains
  // control of acceleration; a handbrake turn can use nitro simultaneously.
  const boosting = burning && throttle > 0 && (burst ? forward >= 0 : true);
  car.boostStrength =
    (car.boostStrength || 0) +
    ((boosting ? 1 : 0) - (car.boostStrength || 0)) *
      (1 - Math.exp(-dt * (boosting ? 8 : 14)));
  const spec =
    car.performance || upgradedSpec(carSpec(car.carId), car.equipment);
  let accel =
    throttle * (throttle * forward < -0.5 ? spec.braking : spec.acceleration);
  if (boosting) accel += spec.boostPower * car.boostStrength;
  if (burning) {
    car.nitro = Math.max(0, car.nitro - dt * spec.nitroDrain);
    car.boostCooldown = spec.boostDelay;
    if (car.nitro <= 0) car.nitroLocked = true;
  } else if (car.boostCooldown <= 0)
    car.nitro = Math.min(100, car.nitro + dt * spec.nitroRegen);
  forward += accel * dt;
  forward *= Math.exp(-dt * (0.13 + 0.0038 * Math.abs(forward)));
  if (!throttle && Math.abs(forward) < 0.15) forward = 0;
  if (input.brake) forward *= Math.exp(-dt * 0.8);
  const limit = boosting ? spec.topSpeed + spec.boostSpeed : spec.topSpeed;
  // Preserve momentum on release: shed excess speed through drag instead of clipping it.
  if (forward > limit)
    forward = Math.max(limit, forward - (9 + (forward - limit) * 0.8) * dt);
  forward = Math.max(-10, Math.min(spec.topSpeed + spec.boostSpeed, forward));
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
  lateral *= Math.exp(-dt * (spec.grip - car.drift * 6.7));
  lateral = clamp(lateral, -Math.abs(forward) * 0.65, Math.abs(forward) * 0.65);
  car.slip = Math.atan2(lateral, Math.max(1, Math.abs(forward)));
  car.isDrifting = Math.abs(car.slip) > 0.1 && Math.abs(forward) > 10;
  car.vx = Math.sin(car.angle) * forward + Math.cos(car.angle) * lateral;
  car.vz = Math.cos(car.angle) * forward - Math.sin(car.angle) * lateral;
  car.impact = 0;
  car.invulnerable = Math.max(0, car.invulnerable - dt);
  // Swept substeps keep fast/upgraded cars from skipping thin walls.
  const steps = Math.max(1, Math.ceil((Math.hypot(car.vx, car.vz) * dt) / 0.8));
  for (let i = 0; i < steps; i++) {
    car.x += (car.vx * dt) / steps;
    car.z += (car.vz * dt) / steps;
    for (const rect of nearbyObstacles(obstacles, car.x, car.z, 5))
      resolveCircleRect(car, Math.max(2.1, (car.length || 4.65) / 2), rect);
  }
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
    if (nearbyObstacles(obstacles, x, z).some((o) => containsPoint(o, x, z)))
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
    for (const b of this.obstacles)
      if (b.barrier)
        Object.assign(b, { broken: false, fallenAt: 0, announced: false });
    this.player = vehicle(START.x, START.z, START.angle);
    this.player.carId = this.selectedCar || "gt";
    this.level = Math.max(1, Math.floor(this.runOptions?.level || 1));
    this.difficulty = pursuitTuning(this.level);
    this.rewardRates = levelRewards(this.level);
    this.checkpoints = checkpointsForLevel(this.level);
    this.helicopter = createAirSupport(this.player, this.level);
    this.player.equipment = structuredClone(this.runOptions?.equipment || {});
    this.player.performance = upgradedSpec(
      carSpec(this.player.carId),
      this.player.equipment,
    );
    this.player.width = this.player.performance.width;
    this.player.length = this.player.performance.length;
    this.runCash = 0;
    this.runDistance = 0;
    this.runDriftSeconds = 0;
    this.runJumps = 0;
    this.runQuests = [];
    this.runTopSpeed = 0;
    this.trafficWrecks = 0;
    this.time = 0;
    this.score = 0;
    this.checkpoint = 0;
    this.phase = "ready";
    this.bust = 0;
    this.escape = 0;
    this.events = [];
    this.soundEvents = [];
    this.soundCooldowns = new Map();
    this.explosions = [];
    this.impacts = [];
    this.nextImpactId = 1;
    this.takedowns = 0;
    this.driftScore = 0;
    this.stuntScore = 0;
    this.nextWaveAt = this.difficulty.waveInterval;
    this.heatLevel = 1;
    this.ramps = RAMPS;
    this.timeline = new RewindTimeline();
    this.trees = TREES.map((t) => ({
      ...t,
      broken: false,
      fallenAt: 0,
      fallAngle: 0,
    }));
    this.poles = (this.propDefinitions || []).map((p) => ({
      ...p,
      broken: false,
      fallenAt: 0,
      fallAngle: 0,
    }));
    this.nextCopId = 1;
    this.police = [];
    this.police = Array.from(
      { length: this.difficulty.initialUnits },
      (_, i) => 75 + i * 40,
    ).map((d, i) => {
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
        id: 10000 + i,
        hitCooldown: 0,
        destroyed: false,
        respawnAt: 0,
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
    const id = this.nextCopId++;
    const tanks = (this.police || []).filter(
      (c) => c.kind === "tank" && !c.destroyed,
    ).length;
    const kind =
      this.level >= 3 &&
      tanks < Math.min(3, 2 + Math.floor((this.level - 3) / 4)) &&
      (role === "blockade" || id % 3 === 0)
        ? "tank"
        : id % 5 === 0
          ? "sedan"
          : this.level >= 7 && id % 4 === 1
            ? "supercar"
            : this.level >= 4 && id % 4 === 3
              ? "interceptor"
              : this.level >= 2 && id % 2 === 0
                ? "suv"
                : "sedan";
    const spec =
      kind === "tank"
        ? {
            maxHealth: 220,
            mass: 4.2,
            width: 3.15,
            length: 6.3,
            height: 2.55,
            speedScale: 0.5,
            accelerationScale: 0.55,
            yawScale: 0.65,
          }
        : kind === "suv"
          ? {
              maxHealth: 145,
              mass: 1.85,
              width: 2.22,
              length: 5.3,
              height: 2.15,
              speedScale: 0.94,
              accelerationScale: 1.05,
              yawScale: 0.9,
            }
          : {
              maxHealth: 100,
              mass: 1.2,
              width: 1.98,
              length: 4.98,
              height: 1.6,
              speedScale: 1,
              accelerationScale: 1,
              yawScale: 1,
            };
    if (kind === "interceptor" || kind === "supercar")
      Object.assign(spec, {
        maxHealth: kind === "supercar" ? 120 : 110,
        width: kind === "supercar" ? 2.08 : 1.96,
        length: kind === "supercar" ? 4.8 : 4.5,
        height: 1.45,
        speedScale: kind === "supercar" ? 1.14 : 1.07,
        accelerationScale: kind === "supercar" ? 1.3 : 1.16,
        yawScale: 1.12,
        mass: 1.12,
      });
    return {
      ...vehicle(x, z),
      id,
      kind,
      ...spec,
      health: spec.maxHealth,
      role: kind === "tank" ? "blockade" : role,
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
  start(carId = this.selectedCar || "gt", options = this.runOptions || {}) {
    this.runOptions = options;
    this.selectedCar = carSpec(carId).id;
    this.reset();
    this.phase = "running";
    this.timeline.capture(this);
    this.events.push(
      this.level >= 3
        ? "HEAVY PURSUIT — TANKS & AIR SUPPORT"
        : this.level >= 2
          ? "SUV PATROLS & AIR SUPPORT INBOUND"
          : "CHASE ON — HIT THE TECHCRUSH ARCHES",
    );
  }
  emitSound(kind, source, impact, key, broken = false) {
    if (
      impact < 0.45 ||
      distance(source, this.player) > 125 ||
      this.time - (this.soundCooldowns.get(key) ?? -100) < 0.14
    )
      return;
    this.soundCooldowns.set(key, this.time);
    if (
      ["collision", "metal", "wood", "stone"].includes(kind) &&
      (impact > 4 || broken)
    ) {
      this.impacts.push({
        id: "impact:" + this.nextImpactId++,
        x: source.x,
        z: source.z,
        born: this.time,
        kind,
        impact,
        broken,
      });
      if (this.impacts.length > 24) this.impacts.shift();
    }
    if (this.soundCooldowns.size > 80)
      for (const [id, at] of this.soundCooldowns)
        if (this.time - at > 1) this.soundCooldowns.delete(id);
    if (this.soundEvents.length < 48)
      this.soundEvents.push({
        kind,
        x: source.x,
        z: source.z,
        impact,
        broken,
        time: this.time,
      });
  }
  damagePolice(cop, impact, credit = true) {
    if (cop.destroyed || cop.hitCooldown > 0 || impact < 5) return false;
    cop.health = Math.max(0, cop.health - clamp(impact * 1.5, 22, 44));
    cop.hitCooldown = 0.9;
    this.events.push("PATROL HIT");
    if (cop.health > 0) return false;
    cop.destroyed = true;
    cop.wreckedAt = this.time;
    cop.vx = cop.vz = 0;
    cop.respawnAt = this.time + 5;
    if (credit) {
      this.takedowns++;
      this.score += 750 * this.rewardRates.score;
      this.runCash += creditAward(350, this.level);
    }
    this.explosions.push({ id: cop.id, x: cop.x, z: cop.z, born: this.time });
    this.emitSound("explosion", cop, 40, `explosion:${cop.id}`);
    this.events.push(
      credit
        ? `PATROL DESTROYED  +${Math.round(750 * this.rewardRates.score)}`
        : "PATROL WRECKED",
    );
    return true;
  }
  damageTraffic(car, impact) {
    if (car.destroyed || car.hitCooldown > 0 || impact < 5) return;
    car.health = Math.max(0, car.health - clamp(impact * 2.2, 25, 75));
    car.hitCooldown = 0.9;
    if (car.health === 0) {
      car.destroyed = true;
      car.wreckedAt = this.time;
      car.vx = car.vz = 0;
      car.respawnAt = this.time + 12;
      this.runCash += creditAward(120, this.level);
      this.trafficWrecks++;
      this.explosions.push({
        id: `traffic-${car.id}`,
        x: car.x,
        z: car.z,
        born: this.time,
      });
      this.events.push("TRAFFIC WRECK  +120 CR");
      this.emitSound("explosion", car, 35, `explosion:${car.id}`);
    }
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
    spawn = this.safeRoadSpawn(spawn, cop);
    if (!spawn) {
      cop.respawnAt = this.time + 0.5;
      return false;
    }
    Object.assign(cop, this.makePolice(spawn.x, spawn.z, cop.role));
    cop.lastSeen = { x: p.x, z: p.z };
    cop.angle = spawn.angle ?? roadProjection(spawn).angle;
    cop.waterAt = null;
    cop.waterAge = 0;
    this.events.push("NEW PATROL INBOUND");
  }
  advanceWater(car, dt) {
    const finished = stepWater(car, dt);
    if (car.y <= -5.6 && !car.waterSplashed) {
      car.waterSplashed = true;
      this.impacts.push({
        id: "splash:" + this.nextImpactId++,
        kind: "water",
        x: car.x,
        z: car.z,
        born: this.time,
        impact: 30,
      });
      this.emitSound("water", car, 30, "water:" + (car.id ?? "player"));
    }
    return finished;
  }
  safeRoadSpawn(target, exclude) {
    const candidates = [
      roadProjection(target),
      ...ROADS.map((r) => ({
        x: (r.start.x + r.end.x) / 2,
        z: (r.start.z + r.end.z) / 2,
        angle: r.angle,
        road: r,
      })),
    ];
    candidates.sort((a, b) => distance(a, target) - distance(b, target));
    return candidates.find(
      (q) =>
        distance(q, this.player) > 85 &&
        !unsupportedWater(q) &&
        !terrainBlocked(q, 3.5) &&
        !nearbyObstacles(this.obstacles, q.x, q.z, 4).some((b) =>
          containsPoint(b, q.x, q.z, 3.5),
        ) &&
        [...this.traffic, ...this.police].every(
          (c) => c === exclude || c.waterAt != null || distance(c, q) > 14,
        ),
    );
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
    const activeCars = [...this.police, ...this.traffic];
    const p =
      candidates.find(
        (q) =>
          !unsupportedWater(q) &&
          !terrainBlocked(q, 2) &&
          !this.obstacles.some((b) => containsPoint(b, q.x, q.z, 2.2)) &&
          activeCars.every((c) => distance(c, q) > 12),
      ) || projected;
    this.player.x = p.x;
    this.player.z = p.z;
    this.player.vx = this.player.vz = this.player.speed = 0;
    Object.assign(this.player, {
      y: 0,
      vy: 0,
      waterAt: null,
      waterAge: 0,
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
      this.checkpoints[this.checkpoint] || this.checkpoints[0],
    ).find((q) => distance(q, p) > 10);
    this.player.angle = toward
      ? Math.atan2(toward.x - p.x, toward.z - p.z)
      : p.angle;
    this.player.invulnerable = 2;
    if (!automatic) this.score = Math.max(0, this.score - 200);
    this.events.push(automatic ? "BACK ON YOUR WHEELS" : "CAR RESET  −200");
  }
  addReinforcement(role, offset) {
    if (this.police.length >= this.difficulty.maxUnits) return;
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
    this.explosions = this.explosions.filter(
      (e) => this.time - e.born < EXPLOSION_LIFETIME,
    );
    this.impacts = this.impacts.filter(
      (e) => this.time - e.born < IMPACT_LIFETIME,
    );
    const p = this.player;
    const before = { x: p.x, z: p.z };
    const actors = [p, ...this.traffic, ...this.police];
    const positions = new Map(actors.map((c) => [c, { x: c.x, z: c.z }]));
    if (
      !p.airborne &&
      !p.flipped &&
      p.health > 0 &&
      Math.cos(p.roll || 0) * Math.cos(p.pitch || 0) < 0.3
    ) {
      p.flipped = true;
      p.flipTimer = 0.8;
      p.y = 1.38;
    }
    if (p.waterAt != null) {
      if (this.advanceWater(p, dt)) {
        p.health = Math.max(0, p.health - 20);
        if (p.health > 0) {
          this.recover(true);
          positions.set(p, { x: p.x, z: p.z });
        }
      }
    } else if (p.flipped) {
      p.flipTimer = Math.max(
        0,
        (Number.isFinite(p.flipTimer) ? p.flipTimer : 0.8) - dt,
      );
      p.vx *= Math.exp(-dt * 5);
      p.vz *= Math.exp(-dt * 5);
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      if (p.flipTimer <= 0 && p.health > 0) {
        this.recover(true);
        positions.set(p, { x: p.x, z: p.z });
      }
    } else if (p.airborne) {
      const landed = stepAirborne(
        p,
        input,
        dt,
        this.obstacles,
        resolveCircleRect,
      );
      if (p.impact > 2) this.emitSound("stone", p, p.impact, "wall");
      if (p.impact > 5 && p.invulnerable <= 0) {
        p.health = Math.max(
          0,
          p.health -
            Math.min(26, (p.impact - 3) * 0.65) * p.performance.damageScale,
        );
        p.invulnerable = 0.7;
      }
      dentVehicle(p, p.impact, this.time);
      if (landed) {
        if (landed.damage > 0)
          dentVehicle(p, landed.damage * 2, this.time, landed.flipped);
        this.emitSound(
          "collision",
          p,
          Math.max(8, landed.damage * 2),
          "landing",
        );
        const bonus = Math.round(
          (landed.flipped ? 50 : 150 + landed.distance * 4) *
            this.rewardRates.score,
        );
        if (!landed.flipped) this.runJumps++;
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
      const rampResult = driveRamp(p, input, dt, this.ramps, before);
      if (rampResult === "launch") this.events.push("AIRBORNE — A / D TO ROLL");
      if (rampResult === "impact" && p.impact > 5 && p.invulnerable <= 0) {
        p.health = Math.max(
          0,
          p.health -
            Math.min(26, (p.impact - 3) * 0.65) * p.performance.damageScale,
        );
        p.invulnerable = 0.7;
      }
      dentVehicle(p, p.impact, this.time);
      if (p.impact > 2)
        this.emitSound(
          rampResult === "impact" ? "metal" : "stone",
          p,
          p.impact,
          "wall",
        );
    }
    if (this.time >= this.nextWaveAt) {
      const role = ["pursuit", "intercept", "blockade"][this.heatLevel % 3];
      this.addReinforcement(role, role === "blockade" ? 180 : -160);
      this.heatLevel++;
      this.nextWaveAt += this.difficulty.waveInterval;
    }
    // Recovery teleports cannot generate distance or travel points.
    const travel = Math.min(
      distance(p, before),
      Math.max(Math.abs(p.speed), Math.hypot(p.vx, p.vz)) * dt + 0.1,
    );
    this.runDistance += travel;
    this.runTopSpeed = Math.max(this.runTopSpeed, Math.abs(p.speed) * 3.6);
    this.score += travel * 1.8 * this.rewardRates.score;
    for (const t of this.traffic) {
      if (t.waterAt != null) {
        if (this.advanceWater(t, dt)) {
          t.waterAt = null;
          t.destroyed = true;
          t.respawnAt = this.time;
        } else continue;
      }
      if (t.destroyed) {
        if (this.time < t.respawnAt) continue;
        const road =
          ROADS.find(
            (r, i) =>
              i > t.turnSeed % ROADS.length && distance(r.start, p) > 120,
          ) || ROADS[0];
        const spawn = this.safeRoadSpawn(road.start, t);
        if (!spawn) continue;
        Object.assign(t, {
          x: spawn.x,
          z: spawn.z,
          y: 0,
          vy: 0,
          pitch: 0,
          roll: 0,
          waterAge: 0,
          waterAt: null,
          vx: 0,
          vz: 0,
          angle: spawn.angle,
          fromNode: spawn.road.a,
          toNode: spawn.road.b,
          id: t.id + 10000,
          health: 100,
          destroyed: false,
          damage: freshDamage(),
          damageAt: {},
          hitCooldown: 0,
          nearMiss: false,
        });
      }
      if (t.id >= 20000 && t.vx === 0 && t.vz === 0)
        positions.set(t, { x: t.x, z: t.z });
      t.hitCooldown = Math.max(0, t.hitCooldown - dt);
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
      for (const o of actors) {
        if (o === t || o.waterAt != null) continue;
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
      t.impact = 0;
      for (const block of nearbyObstacles(this.obstacles, t.x, t.z, 5))
        resolveCircleRect(t, 2.1, block);
      dentVehicle(t, t.impact, this.time);
      if (t.impact > 4) this.emitSound("metal", t, t.impact, "wall:" + t.id);
    }
    // Patrols share observed positions. Once all sightlines are broken the radio goes quiet.
    updateAirSupport(
      this.helicopter,
      p,
      this.obstacles,
      this.radioContact,
      this.time,
      dt,
      this.level,
    );
    const sighted =
      this.helicopter?.tracking ||
      this.police.some(
        (cop) =>
          !cop.destroyed &&
          cop.waterAt == null &&
          p.waterAt == null &&
          distance(cop, p) < this.difficulty.sight &&
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
      if (cop.waterAt != null) {
        if (this.advanceWater(cop, dt)) {
          this.respawnPolice(cop);
          positions.set(cop, { x: cop.x, z: cop.z });
        } else continue;
      }
      if (cop.destroyed) {
        if (this.time >= cop.respawnAt) {
          this.respawnPolice(cop);
          positions.set(cop, { x: cop.x, z: cop.z });
        } else continue;
      }
      cop.hitCooldown = Math.max(0, cop.hitCooldown - dt);
      cop.ramRecovery = Math.max(0, cop.ramRecovery - dt);
      cop.repath -= dt;
      const visible =
        distance(cop, p) < this.difficulty.sight &&
        lineOfSight(cop, p, this.obstacles);
      if (sighted) {
        // One unit stays on the rear bumper, another tries to intercept farther ahead.
        const lead = cop.role === "intercept" ? this.difficulty.lead : 0.35;
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
        cop.lastSeen =
          lineOfSight(observation, predicted, this.obstacles) &&
          driveableLine(observation, predicted)
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
            x:
              o.x +
              (o.vx / speed) *
                (this.difficulty.roadblockRange + (cop.id % 2) * 25),
            z:
              o.z +
              (o.vz / speed) *
                (this.difficulty.roadblockRange + (cop.id % 2) * 25),
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
        cop.repath = this.difficulty.repath;
      }
      while (
        cop.path.length > 1 &&
        distance(cop, cop.path[0]) < 10 &&
        driveableLine(cop, cop.path[1])
      )
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
      if (
        this.difficulty.flank &&
        visible &&
        !cop.blockPoint &&
        cop.role === "pursuit" &&
        distance(cop, p) < 60 &&
        Math.abs(p.speed) > 12
      ) {
        // Two officers squeeze from opposite rear quarters using the current sighting.
        const side = cop.id % 2 ? 1 : -1;
        const flank = {
          x: p.x + Math.sin(p.angle) * 4 + Math.cos(p.angle) * side * 2.8,
          z: p.z + Math.cos(p.angle) * 4 - Math.sin(p.angle) * side * 2.8,
        };
        if (lineOfSight(cop, flank, this.obstacles)) target = flank;
      }
      // Seeing a player across the river does not imply a drivable shortcut.
      if (!driveableLine(cop, target))
        target = cop.path[0] || roadProjection(cop);
      const desired = holding
          ? cop.blockPoint.angle
          : Math.atan2(target.x - cop.x, target.z - cop.z),
        turn = angleDelta(desired, cop.angle);
      const max =
        (this.difficulty.maxSpeed + Math.min(this.checkpoint, 5) * 0.7) *
        (cop.ramRecovery > 0 ? 0.55 : 1) *
        (cop.speedScale || 1);
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
      for (const other of actors) {
        if (other === cop || other === p || other.waterAt != null) continue;
        const dx = other.x - cop.x,
          dz = other.z - cop.z,
          ahead = dx * Math.sin(cop.angle) + dz * Math.cos(cop.angle),
          side = Math.abs(dx * Math.cos(cop.angle) - dz * Math.sin(cop.angle));
        if (ahead > 0 && ahead < 12 && side < 2)
          want = Math.min(want, Math.max(2, (ahead - 4.8) * 3));
      }
      const cs = Math.hypot(cop.vx, cop.vz);
      const yawLimit = (2.7 / (1 + cs * 0.008)) * (cop.yawScale || 1);
      const reversing = cop.reverseUntil > this.time;
      if (!reversing) cop.angle += clamp(turn, -yawLimit * dt, yawLimit * dt);
      const signed =
        cop.vx * Math.sin(cop.angle) + cop.vz * Math.cos(cop.angle);
      const speed =
        signed +
        clamp(
          (reversing ? -7 : want) - signed,
          -34 * dt,
          this.difficulty.acceleration * (cop.accelerationScale || 1) * dt,
        );
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
      for (const block of nearbyObstacles(this.obstacles, cop.x, cop.z, 5))
        resolveCircleRect(
          cop,
          cop.kind === "tank" ? 3.35 : cop.kind === "suv" ? 2.65 : 2.1,
          block,
        );
      cop.stuck =
        !holding && (cop.impact > 1 || Math.abs(speed) < 2)
          ? cop.stuck + dt
          : Math.max(0, cop.stuck - dt);
      dentVehicle(cop, cop.impact, this.time);
      if (cop.impact > 4)
        this.emitSound("stone", cop, cop.impact, "wall:" + cop.id);
      if (cop.stuck > 1.4) {
        cop.reverseUntil = this.time + 0.85;
        cop.stuck = 0;
        cop.repath = 0;
      }
    }
    if (p.flipped) p.invulnerable = Math.max(p.invulnerable, 0.1);
    const allCars = [p, ...this.traffic, ...this.police];
    const officers = new Set(this.police);
    // Iterative body contacts resolve traffic, officers and the player as one physical system.
    for (let pass = 0; pass < 3; pass++)
      for (let i = 0; i < allCars.length; i++)
        for (let j = i + 1; j < allCars.length; j++) {
          const a = allCars[i],
            b = allCars[j];
          if (
            a.waterAt != null ||
            b.waterAt != null ||
            (a.destroyed && b.destroyed) ||
            Math.abs((a.y || 0) - (b.y || 0)) > 1.6 ||
            Math.abs(a.x - b.x) > 6 ||
            Math.abs(a.z - b.z) > 6
          )
            continue;
          const impact = collideVehicles(a, b);
          if (!a.destroyed) dentVehicle(a, impact, this.time);
          if (!b.destroyed) dentVehicle(b, impact, this.time);
          if (impact > 2)
            this.emitSound(
              "metal",
              { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
              impact,
              `cars:${a.id ?? "player"}:${b.id ?? "player"}`,
            );
          if (impact <= 4) continue;
          const playerHit = a === p || b === p;
          if (playerHit && p.invulnerable <= 0) {
            const other = a === p ? b : a,
              damage = officers.has(other)
                ? Math.min(8, impact * 0.35)
                : impact * 0.55;
            p.health = Math.max(
              0,
              p.health - damage * p.performance.damageScale,
            );
            p.invulnerable = 0.8;
            this.events.push("COLLISION");
          }
          for (const cop of [a, b])
            if (officers.has(cop)) {
              if (cop.ramRecovery <= 0)
                cop.ramRecovery = playerHit ? this.difficulty.ramRecovery : 0.8;
              this.damagePolice(cop, impact, playerHit);
            }
          if (playerHit)
            for (const civilian of [a, b])
              if (civilian !== p && !officers.has(civilian))
                this.damageTraffic(civilian, impact);
        }
    if (
      this.breakableTrees !== this.trees ||
      this.breakablePoles !== this.poles ||
      this.breakableCount !== this.trees.length + this.poles.length
    ) {
      this.breakableTrees = this.trees;
      this.breakablePoles = this.poles;
      this.breakableCount = this.trees.length + this.poles.length;
      this.breakables = [...this.trees, ...this.poles];
    }
    const breakables = this.breakables;
    for (const car of allCars) {
      if (car.destroyed || car.waterAt != null) continue;
      for (const tree of nearbyObstacles(breakables, car.x, car.z, 5)) {
        if (
          (car.y || 0) > Math.min(2.5, tree.h || 8) ||
          tree.broken ||
          Math.abs(tree.x - car.x) > 4 + (tree.radius || 0) ||
          Math.abs(tree.z - car.z) > 4 + (tree.radius || 0)
        )
          continue;
        const impact = treeContact(car, tree, this.time);
        dentVehicle(car, impact, this.time);
        if (impact > 0.45)
          this.emitSound(
            tree.soundMaterial || (tree.breakSpeed ? "metal" : "wood"),
            tree,
            impact,
            `prop:${tree.breakSpeed ? "p" : "t"}:${tree.linked?.[0] ?? tree.id}`,
            tree.broken,
          );
        if (tree.broken && tree.linked)
          for (const id of tree.linked) {
            const sibling = this.poles[id];
            if (sibling && !sibling.broken)
              Object.assign(sibling, {
                broken: true,
                fallenAt: tree.fallenAt,
                fallAngle: tree.fallAngle,
              });
          }
        if (impact > 4 && car === p) {
          if (p.invulnerable <= 0) {
            p.health = Math.max(
              0,
              p.health - Math.min(18, impact * 0.4) * p.performance.damageScale,
            );
            p.invulnerable = 0.8;
          }
          this.events.push(
            tree.broken
              ? tree.breakSpeed
                ? "POLE DOWN"
                : "TREE DOWN"
              : "COLLISION",
          );
        } else if (impact > 5 && officers.has(car))
          this.damagePolice(car, impact, false);
      }
      if (car !== p)
        for (const r of this.ramps)
          resolveRampSolid(car, r, positions.get(car) || car, false);
      // Pairwise pushes cannot leave an officer or civilian inside a building.
      for (const block of nearbyObstacles(this.obstacles, car.x, car.z, 5))
        if ((car.y || 0) < (block.h || 50) + 1)
          resolveCircleRect(
            car,
            car.kind === "tank" ? 3.35 : car.kind === "suv" ? 2.65 : 2.1,
            block,
          );
    }
    for (const car of allCars) {
      if (car.waterAt != null) continue;
      const impact = resolveTerrain(car, positions.get(car) || car);
      if (impact > 4) {
        dentVehicle(car, impact, this.time);
        this.emitSound("stone", car, impact, "terrain:" + (car.id ?? "player"));
        if (car === p && p.invulnerable <= 0) {
          p.health = Math.max(
            0,
            p.health - Math.min(24, impact * 0.5) * p.performance.damageScale,
          );
          p.invulnerable = 0.7;
        }
      }
      if (beginWater(car, this.time)) {
        if (car === p)
          this.events.push("IN THE RIVER — HOLD REWIND TO GO BACK");
      }
    }
    for (const rail of this.obstacles)
      if (rail.barrier && rail.broken && !rail.announced) {
        rail.announced = true;
        rail.fallenAt = this.time;
        this.emitSound("metal", rail, 40, "barrier:" + rail.id, true);
      }
    if (!p.airborne && !p.flipped && p.health > 0 && p.waterAt == null) {
      const unlock = (id, text) => {
        if (
          !this.runQuests.includes(id) &&
          !this.runOptions?.completedQuests?.includes(id)
        ) {
          this.runQuests.push(id);
          this.navQuest = null;
          this.events.push(text + " · BANK IN GARAGE");
          this.emitSound("reward", p, 20, "quest:" + id);
        }
      };
      if (
        p.lastLandingRamp === 4 &&
        roofAt(p) &&
        Math.abs(p.y - ROOFTOP.h) < 0.2 &&
        distance(p, QUEST_BOX) < 7
      )
        unlock(ROOFTOP.id, "SKYBOX FOUND · +1 BOX / 2,500 CR");
      if (
        p.lastLandingRamp === 5 &&
        p.launchSpeed >= 50 &&
        p.x < -850 &&
        Math.abs(p.z + 440) < 32
      )
        unlock("mtkvari-gap-v1", "MTKVARI GAP · +1 BOX / 1,500 CR");
    }
    let closest = Infinity;
    for (const cop of this.police)
      if (!cop.destroyed && cop.waterAt == null)
        closest = Math.min(closest, distance(cop, p));
    for (const t of this.traffic) {
      if (t.destroyed || t.waterAt != null) continue;
      const d = distance(t, p);
      if (d > 4 && d < 7 && Math.abs(p.speed) > 20 && !t.nearMiss) {
        this.score += 150 * this.rewardRates.score;
        t.nearMiss = true;
        this.events.push(
          `NEAR MISS  +${Math.round(150 * this.rewardRates.score)}`,
        );
      }
    }
    if (p.isDrifting && p.impact < 3) {
      this.runDriftSeconds += dt;
      const points = Math.abs(p.speed) * dt * 0.65 * this.rewardRates.score;
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
    for (const block of nearbyObstacles(this.obstacles, p.x, p.z, 5))
      if (p.waterAt == null && (p.y || 0) < (block.h || 50) + 1)
        resolveCircleRect(p, 2.1, block);
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
    const cp = this.checkpoints[this.checkpoint];
    if (
      cp &&
      p.waterAt == null &&
      distance(p, cp) < 13 &&
      p.y < 3 &&
      !p.flipped
    ) {
      this.checkpoint++;
      this.emitSound("checkpoint", p, 20, "checkpoint:" + this.checkpoint);
      this.runCash += creditAward(150, this.level);
      const bonus = Math.round(
        (1000 +
          Math.max(
            0,
            Math.round(800 - (this.time - this.lastCheckpointTime) * 12),
          )) *
          this.rewardRates.score,
      );
      this.score += bonus;
      this.lastCheckpointTime = this.time;
      const beforeRepair = p.health;
      p.health = Math.min(100, p.health + 30);
      repairBody(p, beforeRepair);
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
      const unseen =
        !this.helicopter?.tracking &&
        this.police.every(
          (c) =>
            c.destroyed ||
            c.waterAt != null ||
            distance(c, p) > 100 ||
            (!lineOfSight(c, p, this.obstacles) && distance(c, p) > 60),
        );
      this.escape = clamp(this.escape + (unseen ? dt : -dt * 1.5), 0, 8);
      if (this.escape >= 8) {
        this.phase = "won";
        this.emitSound("level-clear", p, 30, "level-clear");
        this.runCash += creditAward(800, this.level);
        this.score += Math.round(
          (3000 + Math.round(p.health * 20)) * this.rewardRates.score,
        );
      }
    }
    if (p.health <= 0) {
      p.boosting = false;
      p.boostStrength = 0;
      this.explosions.push({
        id: "player-wreck",
        x: p.x,
        y: p.y || 0,
        z: p.z,
        born: this.time,
      });
      this.emitSound("explosion", p, 45, "player-wreck");
      this.phase = "wrecked";
    } else if (this.bust >= 4) {
      this.phase = "busted";
    }
    if (this.phase === "running") this.timeline.capture(this);
  }
  snapshot() {
    return {
      phase: this.phase,
      level: this.level,
      route: this.checkpoints.map((p) => ({
        name: p.name,
        x: +p.x.toFixed(2),
        z: +p.z.toFixed(2),
      })),
      helicopter: this.helicopter
        ? {
            tracking: this.helicopter.tracking,
            x: this.helicopter.x,
            z: this.helicopter.z,
          }
        : null,
      runCash: this.runCash,
      trafficWrecks: this.trafficWrecks,
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
        kind: c.kind,
        maxHp: c.maxHealth,
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
