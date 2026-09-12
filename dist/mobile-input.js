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
    return [...this.pointers.values()].includes(key);
  }
  get size() {
    return this.pointers.size;
  }
}
export function mergeMobileInput(keyboard, keys, touch, tilt, autoGas, active) {
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
          : tilt
      : 0,
    brake: active && (keyboard.brake || touch.has(" ")),
    boost: active && (keyboard.boost || touch.has("Shift")),
    rewind: keyboard.rewind || touch.has("q"),
  };
}
export function renderBudget(mode, mobile, width, height, dpr = 1) {
  const low = mode === "battery" || (mode === "auto" && mobile);
  const pixels = low ? 800000 : 2400000;
  return {
    low,
    pixelRatio: Math.min(
      dpr,
      low ? 1.15 : 1.7,
      Math.sqrt(pixels / Math.max(1, width * height)),
    ),
    shadows: !low,
    treeNear: low ? 0 : 105,
    treeFar: low ? 230 : 420,
  };
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
