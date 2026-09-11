import * as THREE from "./vendor/three.module.js";
export function addTurboExhaust(car) {
  const root = new THREE.Group();
  root.visible = false;
  const material = new THREE.MeshBasicMaterial({
    color: "#57caff",
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  for (const p of car.userData.exhaustPositions ||
    [-0.28, 0, 0.28].map((x) => ({ x, y: 0.41, z: -2.25 }))) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 1.25, 12),
      material,
    );
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(p.x, p.y, p.z - 0.625);
    flame.userData.nozzleZ = p.z;
    root.add(flame);
    const core = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.7, 10),
      new THREE.MeshBasicMaterial({
        color: "#efffff",
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    core.rotation.x = -Math.PI / 2;
    core.position.set(p.x, p.y, p.z - 0.35);
    core.userData.nozzleZ = p.z;
    root.add(core);
  }
  car.add(root);
  car.userData.turboExhaust = root;
}
export function updateTurboExhaust(car, p, time) {
  const root = car.userData.turboExhaust;
  if (!root) return;
  root.visible = p.boosting && p.boostStrength > 0.12;
  root.children.forEach((m, i) => {
    m.scale.y = (0.65 + Math.sin(time * 47 + i * 2) * 0.15) * p.boostStrength;
    m.position.z =
      m.userData.nozzleZ - m.geometry.parameters.height * m.scale.y * 0.5;
    m.material.opacity = 0.5 + p.boostStrength * 0.35;
  });
}
export function createTireSmoke(scene) {
  const count = 96,
    positions = new Float32Array(count * 3),
    opacity = new Float32Array(count),
    size = new Float32Array(count),
    particles = [];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("opacity", new THREE.BufferAttribute(opacity, 1));
  geometry.setAttribute("size", new THREE.BufferAttribute(size, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: `attribute float opacity;attribute float size;varying float a;void main(){a=opacity;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(size*260./max(1.,-p.z),1.,80.);}`,
    fragmentShader: `varying float a;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.65,.68,.67,a*(1.-smoothstep(.1,1.,r)));}`,
  });
  const mesh = new THREE.Points(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { mesh, positions, opacity, size, particles, index: 0, timer: 0 };
}
export function updateTireSmoke(fx, p, dt, active) {
  fx.timer += dt;
  if (active && fx.timer > 0.03) {
    fx.timer = 0;
    for (const side of [-1, 1]) {
      const i = fx.index++ % 96;
      fx.particles[i] = {
        age: 0,
        x: p.x - Math.sin(p.angle) * 1.5 + Math.cos(p.angle) * side * 0.85,
        z: p.z - Math.cos(p.angle) * 1.5 - Math.sin(p.angle) * side * 0.85,
      };
    }
  }
  fx.particles.forEach((q, i) => {
    q.age += dt;
    const a = q.age;
    fx.opacity[i] = Math.max(0, 0.23 * (1 - a / 1.4));
    fx.size[i] = 0.5 + a * 1.8;
    fx.positions.set(
      [
        q.x + Math.sin(i) * a * 0.45,
        0.25 + a * 0.65,
        q.z + Math.cos(i) * a * 0.45,
      ],
      i * 3,
    );
  });
  for (const attribute of Object.values(fx.mesh.geometry.attributes))
    attribute.needsUpdate = true;
}
export function resetTireSmoke(fx) {
  fx.particles.length = 0;
  fx.opacity.fill(0);
  fx.mesh.geometry.attributes.opacity.needsUpdate = true;
  fx.index = fx.timer = 0;
}
