export const EXPLOSION_LIFETIME = 3.8;
export const IMPACT_LIFETIME = 0.75;
export const DAMAGE_ZONES = ["front", "rear", "left", "right", "roof"];
export const freshDamage = () =>
  Object.fromEntries(DAMAGE_ZONES.map((k) => [k, 0]));

// Contact normals point away from the struck surface. Presentation damage is
// bounded and separate from HP, collision dimensions, performance and rewards.
export function dentVehicle(car, impact, time, roof = false) {
  if (impact < 4) return;
  const n = car.impactNormal || {
    x: -Math.sin(car.angle),
    z: -Math.cos(car.angle),
  };
  const x = -n.x * Math.cos(car.angle) + n.z * Math.sin(car.angle);
  const z = -n.x * Math.sin(car.angle) - n.z * Math.cos(car.angle);
  const zone = roof
    ? "roof"
    : Math.abs(z) >= Math.abs(x)
      ? z > 0
        ? "front"
        : "rear"
      : x > 0
        ? "left"
        : "right";
  car.damage ||= freshDamage();
  car.damageAt ||= {};
  if (time - (car.damageAt[zone] ?? -100) < 0.16) return;
  car.damageAt[zone] = time;
  car.damage[zone] = Math.min(
    1,
    car.damage[zone] +
      Math.min(0.65, (impact - 3) / 65) * (car.kind === "tank" ? 0.4 : 1),
  );
}
export function repairBody(car, beforeHealth) {
  const ratio = Math.max(
    0,
    (100 - car.health) / Math.max(1, 100 - beforeHealth),
  );
  if (car.damage) for (const k of DAMAGE_ZONES) car.damage[k] *= ratio;
}
