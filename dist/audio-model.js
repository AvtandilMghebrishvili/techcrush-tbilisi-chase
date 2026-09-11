// Audio telemetry is presentation only: it never changes acceleration or saved progress.
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const ENGINE_VOICES = {
  classic: {
    name: "V8",
    idle: 950,
    redline: 8800,
    gears: 7,
    pitch: 1.06,
    body: 150,
    brightness: 3100,
    harmonics: [
      0.18, 0.12, 0.2, 0.8, 0.28, 0.18, 0.1, 0.5, 0.08, 0.1, 0.08, 0.25,
    ],
  },
  gt: {
    name: "Flat six",
    idle: 850,
    redline: 7600,
    gears: 6,
    pitch: 0.88,
    body: 220,
    brightness: 2400,
    harmonics: [
      0.28, 0.18, 0.9, 0.16, 0.2, 0.55, 0.2, 0.13, 0.3, 0.12, 0.09, 0.2,
    ],
  },
  rally: {
    name: "V12",
    idle: 1050,
    redline: 9400,
    gears: 7,
    pitch: 1.2,
    body: 290,
    brightness: 3900,
    harmonics: [
      0.08, 0.13, 0.15, 0.1, 0.13, 0.9, 0.16, 0.12, 0.1, 0.15, 0.12, 0.6,
    ],
  },
  suv: {
    name: "W16",
    idle: 750,
    redline: 7100,
    gears: 7,
    pitch: 0.71,
    body: 95,
    brightness: 2000,
    harmonics: [
      0.5, 0.36, 0.15, 0.33, 0.11, 0.2, 0.16, 0.75, 0.12, 0.2, 0.1, 0.38, 0.08,
      0.1, 0.07, 0.35,
    ],
  },
};
export function engineTelemetry(
  player,
  input = {},
  previous = {},
  dt = 1 / 60,
) {
  const id = ENGINE_VOICES[player.carId] ? player.carId : "gt",
    voice = ENGINE_VOICES[id];
  const speed = Math.abs(player.speed || 0),
    top = player.performance?.topSpeed || 64;
  const reverse = (player.speed || 0) < -0.7;
  const ceilings = Array.from(
    { length: voice.gears },
    (_, i) => top * [0.27, 0.42, 0.59, 0.77, 0.96, 1.14, 1.32][i],
  );
  let gear = previous.car === id ? previous.gear || 1 : 1;
  let shift = 0,
    cooldown = Math.max(0, (previous.cooldown || 0) - dt);
  if (!reverse && !player.airborne && cooldown === 0) {
    if (speed > ceilings[gear - 1] * 0.91 && gear < voice.gears) {
      gear++;
      shift = 1;
    } else if (gear > 1 && speed < ceilings[gear - 2] * 0.65) {
      gear--;
      shift = -1;
    }
    if (shift) cooldown = 0.25;
  }
  const gas = clamp(input.throttle || 0, 0, 1);
  const load = gas * (input.brake ? 0.2 : 1);
  const ceiling = reverse ? 12 : ceilings[gear - 1];
  let target =
    voice.idle + (voice.redline - voice.idle) * clamp(speed / ceiling, 0, 1);
  target += gas * (speed < 2 ? 1700 : 380);
  if (player.airborne)
    target = Math.max(
      target,
      voice.idle + gas * (voice.redline - voice.idle) * 0.85,
    );
  target = clamp(target, voice.idle, voice.redline);
  const prior = previous.car === id ? previous.rpm : voice.idle;
  const rpm =
    prior + (target - prior) * (1 - Math.exp(-dt * (shift ? 18 : gas ? 9 : 5)));
  return {
    car: id,
    voice,
    gear,
    rpm,
    load,
    shift,
    cooldown,
    reverse,
    speed,
    gearLabel: reverse ? "R" : String(gear),
    rev: clamp((rpm - voice.idle) / (voice.redline - voice.idle), 0, 1),
    shiftCut: cooldown > 0.12 ? 0.52 : 1,
  };
}
export function spatialSound(player, source, range = 65) {
  const dx = source.x - player.x,
    dz = source.z - player.z,
    d = Math.hypot(dx, dz);
  // The game faces +Z at heading zero, so screen-right is world -X.
  return {
    distance: d,
    pan: clamp(
      (-dx * Math.cos(player.angle) + dz * Math.sin(player.angle)) /
        Math.max(3, d),
      -1,
      1,
    ),
    gain: Math.pow(clamp(1 - d / range, 0, 1), 1.6),
  };
}
export class PassByTracker {
  constructor() {
    this.reset();
  }
  reset() {
    this.previous = new Map();
    this.lastPlayer = null;
  }
  sample(player, vehicles, time) {
    if (
      this.lastPlayer &&
      Math.hypot(player.x - this.lastPlayer.x, player.z - this.lastPlayer.z) >
        40
    )
      this.reset();
    this.lastPlayer = { x: player.x, z: player.z };
    const result = [],
      alive = new Set();
    for (const car of vehicles) {
      if (car.destroyed) continue;
      alive.add(car.id);
      const dx = car.x - player.x,
        dz = car.z - player.z;
      const along = dx * Math.sin(player.angle) + dz * Math.cos(player.angle),
        side = dx * Math.cos(player.angle) - dz * Math.sin(player.angle);
      const relativeSpeed = Math.hypot(
        (car.vx || 0) - (player.vx || 0),
        (car.vz || 0) - (player.vz || 0),
      );
      const prev = this.previous.get(car.id),
        d = Math.hypot(dx, dz);
      if (
        prev &&
        prev.along * along <= 0 &&
        Math.abs(prev.along - along) < 35 &&
        d < 14 &&
        Math.abs(side) > 2.5 &&
        relativeSpeed > 9 &&
        time - prev.passed > 1.3
      ) {
        result.push({
          kind: "pass",
          x: car.x,
          z: car.z,
          impact: relativeSpeed,
          pan: spatialSound(player, car).pan,
        });
        prev.passed = time;
      }
      this.previous.set(car.id, { along, passed: prev?.passed ?? -100 });
    }
    for (const id of this.previous.keys())
      if (!alive.has(id)) this.previous.delete(id);
    return result;
  }
}
