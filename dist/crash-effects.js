import * as THREE from "./vendor/three.module.js";
import { EXPLOSION_LIFETIME, IMPACT_LIFETIME } from "./damage-state.js";
const clamp = THREE.MathUtils.clamp;
function cloudTexture() {
  const size = 96,
    data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = ((x + 0.5) / size) * 2 - 1,
        v = ((y + 0.5) / size) * 2 - 1,
        r = Math.hypot(u, v);
      const noise =
        0.72 +
        0.14 * Math.sin(x * 0.23 + Math.cos(y * 0.18) * 2) +
        0.1 * Math.sin(y * 0.47 + x * 0.31);
      const a = Math.pow(clamp((1 - r) / 0.6, 0, 1), 1.7) * noise;
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(a * 255);
    }
  const texture = new THREE.DataTexture(data, size, size);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}
const cloud = cloudTexture(); // shared for the lifetime of the scene, never disposed per burst
function sprite(color, additive = false) {
  return new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: cloud,
      color,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      toneMapped: !additive,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }),
  );
}
function seeded(id) {
  let n = String(id)
    .split("")
    .reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 123);
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
function shard(color, size, rng) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -0.6 * size,
        -0.4 * size,
        0,
        0.35 * size,
        -0.3 * size,
        0.12 * size,
        0.55 * size,
        0.3 * size,
        -0.08 * size,
        -0.2 * size,
        0.55 * size,
        0.08 * size,
        0,
        0,
        0.22 * size,
      ],
      3,
    ),
  );
  geo.setIndex([0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]);
  geo.computeVertexNormals();
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color,
      metalness: 0.65,
      roughness: 0.65,
      side: THREE.DoubleSide,
      transparent: true,
    }),
  );
}
export function createExplosion(scene, event) {
  const group = new THREE.Group(),
    rng = seeded(event.id);
  group.position.set(event.x, (event.y || 0) + 0.7, event.z);
  scene.add(group);
  const particles = [];
  for (let i = 0; i < 46; i++) {
    const type =
      i < 10 ? "fire" : i < 25 ? "smoke" : i < 37 ? "debris" : "spark";
    const mesh =
      type === "fire"
        ? sprite(i % 2 ? "#ff7d19" : "#ffc95a", true)
        : type === "smoke"
          ? sprite(i % 2 ? "#343638" : "#555149")
          : type === "debris"
            ? shard(i % 2 ? "#30363b" : "#7d7d76", 0.09 + rng() * 0.16, rng)
            : sprite("#ffc47b", true);
    const a = rng() * Math.PI * 2,
      speed =
        type === "smoke"
          ? 1 + rng() * 2
          : type === "fire"
            ? 2 + rng() * 3
            : 4 + rng() * 10;
    group.add(mesh);
    particles.push({
      mesh,
      type,
      smoke: type === "smoke",
      vx: Math.cos(a) * speed,
      vz: Math.sin(a) * speed,
      vy: type === "smoke" ? 1.2 + rng() * 1.8 : 2 + rng() * 7,
      delay: type === "smoke" ? rng() * 0.25 : 0,
      spin: rng() * 7 - 3.5,
      size: 0.7 + rng(),
    });
  }
  const flash = sprite("#fff2c0", true);
  group.add(flash);
  // The view owns one permanent flash light, avoiding new light-count shader
  // variants in the middle of a collision. This value is its animated strength.
  const light = { intensity: 0 };
  const fx = {
    group,
    particles,
    flash,
    light,
    born: event.born,
    lifetime: EXPLOSION_LIFETIME,
  };
  animateExplosion(fx, event.born);
  return fx;
}
function ballistic(p, age, ground = -0.62) {
  const hit = (p.vy + Math.sqrt(p.vy * p.vy - 19.6 * ground)) / 9.8;
  let y = p.vy * age - 4.9 * age * age,
    travel = age;
  if (age > hit) {
    const after = age - hit,
      bounce = (9.8 * hit - p.vy) * 0.23;
    y = Math.max(ground, ground + bounce * after - 4.9 * after * after);
    travel = hit + (1 - Math.exp(-after * 3)) * 0.25;
  }
  p.mesh.position.set(p.vx * travel, y, p.vz * travel);
}
export function animateExplosion(fx, time) {
  const age = Math.max(0, time - fx.born),
    life = fx.lifetime;
  fx.flash.visible = age < 0.32;
  fx.flash.scale.setScalar(1.7 + age * 18);
  fx.flash.material.opacity = Math.max(0, 1 - age / 0.32) * 0.8;
  fx.light.intensity = age < 0.35 ? 50 * Math.exp(-age * 11) : 0;
  for (const p of fx.particles) {
    const t = Math.max(0, age - p.delay),
      m = p.mesh;
    m.visible = age >= p.delay && age < life;
    if (p.type === "smoke") {
      m.position.set(
        p.vx * (1 - Math.exp(-t)) + 0.35 * t,
        p.vy * t + 0.5,
        p.vz * (1 - Math.exp(-t)),
      );
      m.scale.setScalar(p.size * (1.4 + t * 2.2));
      m.material.rotation = p.spin * 0.08 * t;
      m.material.opacity =
        Math.min(0.63, t * 4) * Math.pow(Math.max(0, 1 - age / life), 0.7);
    } else if (p.type === "fire") {
      const travel = 1 - Math.exp(-t * 2.8);
      m.position.set(
        p.vx * travel * 0.5,
        p.vy * travel * 0.35,
        p.vz * travel * 0.5,
      );
      m.scale.setScalar(p.size * (0.8 + t * 4));
      m.material.rotation = p.spin * t * 0.4;
      m.material.opacity = Math.max(0, 1 - age / 0.85) * 0.82;
    } else {
      ballistic(p, t);
      m.rotation.set(t * p.spin, t * 3, t * p.spin * 0.7);
      if (p.type === "spark") {
        m.scale.set(0.035, 0.22, 0.035);
        m.material.opacity = Math.max(0, 1 - age / 0.8);
      } else m.material.opacity = Math.min(1, Math.max(0, (life - age) / 0.8));
    }
    if (age >= life) m.material.opacity = 0;
  }
}
export function createImpactBurst(scene, event) {
  const group = new THREE.Group(),
    rng = seeded(event.id),
    particles = [];
  group.position.set(event.x, 0.55, event.z);
  scene.add(group);
  const metal = event.kind === "metal" || event.kind === "collision",
    power = clamp(event.impact / 35, 0.2, 1);
  for (let i = 0; i < 10; i++) {
    const spark = metal && i < 5,
      mesh = spark
        ? sprite("#ffc885", true)
        : shard(
            event.kind === "wood"
              ? "#aa8655"
              : event.kind === "stone"
                ? "#aca596"
                : "#71797c",
            0.035 + power * 0.09,
            rng,
          );
    const a = rng() * Math.PI * 2,
      speed = (1 + rng() * 5) * power;
    particles.push({
      mesh,
      vx: Math.cos(a) * speed,
      vz: Math.sin(a) * speed,
      vy: 1 + rng() * 3,
      spin: rng() * 8,
      spark,
    });
    group.add(mesh);
  }
  const dust = sprite(event.kind === "wood" ? "#a4947c" : "#8c8d8a");
  group.add(dust);
  const fx = {
    group,
    particles,
    dust,
    born: event.born,
    lifetime: IMPACT_LIFETIME,
    power,
  };
  animateImpactBurst(fx, event.born);
  return fx;
}
export function animateImpactBurst(fx, time) {
  const age = Math.max(0, time - fx.born),
    fade = Math.max(0, 1 - age / fx.lifetime);
  for (const p of fx.particles) {
    ballistic(p, age, -0.5);
    p.mesh.rotation.set(age * p.spin, age * 5, age * 2);
    p.mesh.material.opacity = fade;
    if (p.spark) p.mesh.scale.set(0.025, 0.14, 0.025);
  }
  fx.dust.position.y = 0.2 + age * 0.6;
  fx.dust.scale.setScalar(0.4 + age * 2.2);
  fx.dust.material.opacity = fade * 0.22 * fx.power;
}
