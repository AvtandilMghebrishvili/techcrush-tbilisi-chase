// Device axes follow W3C Device Orientation; game steering is -left / +right.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const wrapDegrees = (v) => ((((v + 180) % 360) + 360) % 360) - 180;
export function screenTilt(beta, gamma, screenAngle = 0) {
  if (![beta, gamma, screenAngle].every(Number.isFinite)) return null;
  const b = (beta * Math.PI) / 180,
    g = (gamma * Math.PI) / 180,
    a = (screenAngle * Math.PI) / 180;
  // Project gravity onto the visible screen's horizontal axis. This avoids
  // Euler discontinuities at +/-180 and works in either landscape direction.
  const right =
    Math.cos(b) * Math.sin(g) * Math.cos(a) + Math.sin(b) * Math.sin(a);
  const normal = Math.cos(b) * Math.cos(g);
  if (Math.hypot(right, normal) < 0.08) return null;
  return (Math.atan2(right, normal) * 180) / Math.PI;
}
export class TiltSteering {
  constructor() {
    this.center = null;
    this.angle = null;
    this.lastSample = -Infinity;
    this.value = 0;
    this.range = 24;
    this.invert = false;
  }
  sample(beta, gamma, orientation, now) {
    const value = screenTilt(beta, gamma, orientation);
    if (value === null) return false;
    this.angle = value;
    this.lastSample = now;
    if (this.center === null) this.center = value;
    return true;
  }
  calibrate() {
    this.center = this.angle;
    this.value = 0;
  }
  reset() {
    this.center = this.angle = null;
    this.value = 0;
    this.lastSample = -Infinity;
  }
  update(dt, now) {
    if (
      this.center === null ||
      this.angle === null ||
      now - this.lastSample > 1000
    )
      return (this.value = 0);
    const delta =
        wrapDegrees(this.angle - this.center) * (this.invert ? -1 : 1),
      dead = 2,
      range = clamp(this.range, 12, 40),
      target =
        Math.sign(delta) *
        clamp((Math.abs(delta) - dead) / (range - dead), 0, 1);
    this.value +=
      (target - this.value) * (1 - Math.exp(-clamp(dt, 0, 0.1) / 0.065));
    return this.value;
  }
}
// Pointer ownership prevents lifting one finger from releasing another finger
// or a keyboard key. Capture loss, app switches and dialogs clear the ledger.
export class PointerLedger {
  constructor() {
    this.pointers = new Map();
  }
  down(id, key) {
    this.pointers.set(id, key);
  }
  up(id) {
    this.pointers.delete(id);
  }
  clear() {
    this.pointers.clear();
  }
  has(key) {
    for (const held of this.pointers.values()) if (held === key) return true;
    return false;
  }
  get size() {
    return this.pointers.size;
  }
}
export class NitroBurst {
  active = false;
  start(player, phase) {
    if (
      phase !== "running" ||
      player.health <= 0 ||
      player.nitro <= 0 ||
      player.nitroLocked
    )
      return false;
    this.active = true;
    return true;
  }
  read(player, phase) {
    if (
      phase !== "running" ||
      player.health <= 0 ||
      player.nitro <= 0 ||
      player.nitroLocked
    )
      this.clear();
    return this.active;
  }
  clear() {
    this.active = false;
  }
}
export class ThumbSteering {
  pointer = null;
  steer = 0;
  drift = false;
  down(id, x, y, bounds) {
    if (this.pointer !== null) return false;
    this.pointer = id;
    this.bounds = bounds;
    this.move(id, x, y);
    return true;
  }
  move(id, x, y) {
    if (this.pointer !== id) return;
    const { left, top, width, height } = this.bounds;
    const axis = clamp((x - left - width / 2) / (width * 0.42), -1, 1);
    this.steer = Math.sign(axis) * Math.max(0, (Math.abs(axis) - 0.07) / 0.93);
    // A lower strip lets the steering thumb also hold the handbrake.
    // Hysteresis avoids flickering at the edge of the drift strip.
    this.drift = (y - top) / height > (this.drift ? 0.59 : 0.7);
  }
  up(id) {
    if (this.pointer === id) this.clear();
  }
  clear() {
    this.pointer = null;
    this.steer = 0;
    this.drift = false;
  }
}
export function mergeMobileInput(
  keyboard,
  keys,
  touch,
  tilt,
  autoGas,
  active,
  assist = {},
) {
  const throttleHeld =
    keys.has("w") ||
    keys.has("s") ||
    keys.has("ArrowUp") ||
    keys.has("ArrowDown");
  const steerHeld =
    keys.has("a") ||
    keys.has("d") ||
    keys.has("ArrowLeft") ||
    keys.has("ArrowRight");
  const pedal = Number(touch.has("w")) - Number(touch.has("s"));
  return {
    throttle: active
      ? throttleHeld
        ? keyboard.throttle
        : touch.has("s") || touch.has("w")
          ? pedal
          : autoGas
            ? 1
            : 0
      : 0,
    steer: active
      ? steerHeld
        ? keyboard.steer
        : touch.has("a") || touch.has("d")
          ? Number(touch.has("d")) - Number(touch.has("a"))
          : (assist.steer ?? tilt)
      : 0,
    brake: active && (keyboard.brake || touch.has(" ") || !!assist.drift),
    boost: active && (keyboard.boost || touch.has("Shift") || !!assist.burst),
    ...(active && assist.burst ? { boostLatched: true } : {}),
    rewind: keyboard.rewind || touch.has("q"),
  };
}
export function deviceProfile(source = {}, mobile = false) {
  const memory = Number(source.deviceMemory) || 8,
    cores = Number(source.hardwareConcurrency) || 8,
    tier =
      mobile || memory <= 4 || cores <= 4
        ? "constrained"
        : memory < 8 || cores <= 6
          ? "balanced"
          : "high";
  return {
    tier,
    memory,
    cores,
    lowAssets: tier === "constrained",
    drawDistanceScale:
      tier === "constrained" ? 0.6 : tier === "balanced" ? 0.8 : 1,
  };
}
export function renderBudget(
  mode,
  mobile,
  width,
  height,
  dpr = 1,
  profile = {},
) {
  const automaticTier = profile.tier || (mobile ? "constrained" : "high"),
    tier =
      mode === "battery"
        ? "constrained"
        : mode === "high"
          ? "high"
          : automaticTier,
    low = tier === "constrained",
    pixels = low ? 800000 : tier === "balanced" ? 1500000 : 2400000;
  return {
    low,
    tier,
    pixelRatio: Math.min(
      dpr,
      low ? 1.1 : tier === "balanced" ? 1.4 : 1.7,
      Math.sqrt(pixels / Math.max(1, width * height)),
    ),
    shadows: tier === "high",
    treeNear: low ? 0 : tier === "balanced" ? 70 : 105,
    treeFar: low ? 230 : tier === "balanced" ? 330 : 420,
    drawDistanceScale:
      tier === "constrained" ? 0.6 : tier === "balanced" ? 0.8 : 1,
    cameraFar:
      tier === "constrained" ? 2500 : tier === "balanced" ? 3400 : 4800,
  };
}
export function nextAdaptiveScale(current, averageFrame, mode = "auto") {
  if (mode !== "auto" || !Number.isFinite(averageFrame)) return 1;
  if (averageFrame > 1 / 40) return Math.max(0.72, current - 0.1);
  if (averageFrame > 1 / 48) return Math.max(0.78, current - 0.05);
  if (averageFrame < 1 / 57) return Math.min(1, current + 0.04);
  return current;
}
export function portraitFov(base, aspect) {
  if (aspect >= 1) return base;
  return Math.min(
    100,
    (2 *
      Math.atan(Math.tan((base * Math.PI) / 360) / Math.max(0.55, aspect)) *
      180) /
      Math.PI,
  );
}
