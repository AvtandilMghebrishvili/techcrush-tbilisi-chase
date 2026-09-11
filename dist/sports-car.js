import * as THREE from "./vendor/three.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { makePatrolHealthBar } from "./effects.js";
export async function loadSportsAssets(view) {
  const loader = new GLTFLoader();
  const [gltf, hdr, ao] = await Promise.all([
    loader.loadAsync("./assets/sports-car.glb"),
    new HDRLoader().loadAsync("./assets/daylight.hdr"),
    new THREE.TextureLoader().loadAsync("./assets/ferrari_ao.png"),
  ]);
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(view.renderer);
  view.scene.environment = pmrem.fromEquirectangular(hdr).texture;
  pmrem.dispose();
  view.scene.environmentIntensity = 0.85;
  view.scene.background = hdr;
  view.scene.backgroundIntensity = 0.62;
  view.scene.backgroundBlurriness = 0.045;
  view.carTemplate = gltf.scene.children[0];
  view.carAO = ao;
  const box = new THREE.Box3().setFromObject(view.carTemplate);
  view.carTemplateBounds = box;
}
export function sportsCar(view, color, police = false, carId = "gt") {
  const group = new THREE.Group(),
    body = view.carTemplate.clone(true),
    clones = new Map();
  group.add(body);
  body.traverse((m) => {
    if (!m.isMesh) return;
    m.userData.sharedGeometry = true;
    m.castShadow = true;
    m.receiveShadow = true;
    const copy = (original) => {
      if (!clones.has(original)) clones.set(original, original.clone());
      return clones.get(original);
    };
    m.material = Array.isArray(m.material)
      ? m.material.map(copy)
      : copy(m.material);
  });
  const paint = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.82,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.13,
  });
  body.getObjectByName("body").material = paint;
  const glass = body.getObjectByName("glass");
  if (glass)
    glass.material = new THREE.MeshPhysicalMaterial({
      color: "#8aa7af",
      metalness: 0.18,
      roughness: 0.1,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
  for (const name of ["rim_fl", "rim_fr", "rim_rr", "rim_rl"]) {
    const m = body.getObjectByName(name);
    if (m)
      m.material = new THREE.MeshStandardMaterial({
        color: carId === "rally" ? "#353738" : "#b4bcc0",
        metalness: 0.95,
        roughness: 0.24,
      });
  }
  const bounds = view.carTemplateBounds,
    size = bounds.getSize(new THREE.Vector3()),
    scale = 4.65 / size.z;
  body.scale.multiplyScalar(scale);
  body.position.y -= bounds.min.y * scale;
  // The source mesh points toward -Z; all simulation vehicles point toward +Z.
  body.rotation.y = Math.PI;
  const black = new THREE.MeshStandardMaterial({
    color: "#14191b",
    roughness: 0.5,
    metalness: 0.4,
  });
  if (carId === "rally" && !police) {
    view.box(1.75, 0.1, 0.45, black, 0, 1.25, -1.9, group);
    for (const x of [-0.65, 0.65])
      view.box(0.07, 0.32, 0.1, black, x, 1.06, -1.87, group);
  }
  if (police) {
    const bar = view.box(1.15, 0.07, 0.36, black, 0, 1.35, -0.18, group);
    const lights = ["#ef2649", "#1c78ff"].map(
      (color) =>
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 4,
        }),
    );
    lights.forEach((m, i) =>
      view.box(0.49, 0.16, 0.32, m, i ? 0.28 : -0.28, 1.46, -0.18, group),
    );
    group.userData.lights = lights;
    const hp = makePatrolHealthBar();
    hp.sprite.position.y = 2.5;
    group.add(hp.sprite);
    group.userData.healthBar = hp;
    // White Georgian patrol identification panels sit above the side intakes.
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#f1f2ef";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = "#1b3549";
    ctx.font = "bold 64px Arial";
    ctx.textAlign = "center";
    ctx.fillText("POLICE", 256, 88);
    const tex = new THREE.CanvasTexture(c);
    tex.userData.disposable = true;
    const m = new THREE.MeshStandardMaterial({
      map: tex,
      side: THREE.DoubleSide,
    });
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.32), m);
      panel.position.set(side * 0.975, 0.74, -0.22);
      panel.rotation.y = (side * Math.PI) / 2;
      group.add(panel);
    }
  }
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: view.carAO,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    color: "#000000",
  });
  shadowMaterial.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      "diffuseColor.a *= 1.0-texture2D(map,vMapUv).r;",
    );
  };
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3, 6), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.091;
  group.add(shadow);
  group.userData.paint = paint;
  group.userData.wheels = ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"]
    .map((n) => body.getObjectByName(n))
    .filter(Boolean);
  group.userData.body = body;
  return group;
}
export function animateWheels(group, speed, dt, steer = 0) {
  for (const wheel of group.userData.wheels || [])
    wheel.rotation.x -= (speed * dt) / 0.34;
  for (const pivot of group.userData.wheelSteering || [])
    pivot.rotation.y = -steer * 0.4;
  const wheel = group.userData.body?.getObjectByName("steering_wheel");
  if (wheel) wheel.rotation.z = steer * 0.45;
}
