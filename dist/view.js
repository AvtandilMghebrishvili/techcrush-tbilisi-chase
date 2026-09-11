import * as THREE from "./vendor/three.module.js";
import { CHECKPOINTS } from "./simulation.js";
import { carSpec, CAMERAS } from "./config.js";
import { updateScenery } from "./scenery.js";
import { buildRealisticCity } from "./realistic-city.js";
import { loadTrees, updateTrees } from "./trees.js";
import { makeSedan } from "./patrol-car.js";
import {
  addTurboExhaust,
  updateTurboExhaust,
  createTireSmoke,
  updateTireSmoke,
  resetTireSmoke,
} from "./turbo-effects.js";
import { START } from "./city-map.js";
import { clearCameraPosition } from "./camera-clearance.js";
import { loadSportsAssets, sportsCar, animateWheels } from "./sports-car.js";
import { makeCockpit, updateCockpit } from "./cockpit.js";
import { makeRouteGuide, updateRouteGuide } from "./route-guide.js";
import { applyTechcrushBrand } from "./landmarks.js";
import {
  createExplosion,
  animateExplosion,
  disposeGroup,
  makePatrolHealthBar,
  updatePatrolHealthBar,
} from "./effects.js";
const material = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
export class SceneView {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#b4c1c8");
    this.scene.fog = new THREE.FogExp2("#b8c1c5", 0.00052);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.camera = new THREE.PerspectiveCamera(56, 1, 0.06, 4800);
    this.scene.add(new THREE.HemisphereLight("#dce8f3", "#78776b", 0.75));
    const sun = new THREE.DirectionalLight("#fff3d9", 2.3);
    sun.position.set(START.x - 75, 145, START.z - 95);
    this.scene.add(sun.target);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -85,
      right: 85,
      top: 85,
      bottom: -85,
      far: 650,
    });
    sun.shadow.bias = -0.0003;
    this.scene.add(sun);
    this.sun = sun;
    buildRealisticCity(this);
    this.cameraMode = 0;
    this.cockpit = makeCockpit();
    this.camera.add(this.cockpit.root);
    this.scene.add(this.camera);
    this.fx = new Map();
    this.routeGuide = makeRouteGuide(this.scene);
    this.player = this.makeCar("#eecb39");
    this.player.position.set(START.x, 0, START.z);
    this.scene.add(this.player);
    this.camera.position.set(START.x - 12, 5.2, START.z + 6);
    this.camera.lookAt(START.x + 9, 1.1, START.z - 7);
    this.resize = () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    };
    addEventListener("resize", this.resize);
    this.resize();
  }
  box(w, h, d, mat, x, y, z, parent = this.scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  makeCar(color, police = false, carId = "gt") {
    if (police) return makeSedan(this, true);
    return this.carTemplate
      ? sportsCar(this, color, police, carId)
      : new THREE.Group();
  }
  async loadTextures() {
    const loader = new THREE.TextureLoader();
    const [road, facade, logo, wordmark] = await Promise.all(
      [
        "road-day.png",
        "limestone.png",
        "techcrush-logo.jpg",
        "techcrush-wordmark.png",
      ].map((n) => loader.loadAsync("./assets/" + n)),
    );
    applyTechcrushBrand(this, logo.image, wordmark.image);
    logo.dispose();
    wordmark.dispose();
    for (const t of [road, facade]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    }
    this.roadMaterial.map = road;
    this.roadMaterial.color.set("#a7aaa5");
    this.roadMaterial.roughness = 0.96;
    this.roadMaterial.bumpMap = road;
    this.roadMaterial.bumpScale = 0.018;
    this.roadMaterial.needsUpdate = true;
    for (const m of this.buildingMaterials) {
      m.map = facade;
      m.needsUpdate = true;
    }
    const [hill, hillNormal] = await Promise.all(
      ["hills-diff.jpg", "hills-nor_gl.jpg"].map((n) =>
        loader.loadAsync("./assets/" + n),
      ),
    );
    hill.colorSpace = THREE.SRGBColorSpace;
    for (const t of [hill, hillNormal]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(16, 14);
      t.anisotropy = 4;
    }
    this.terrainMaterial.map = hill;
    this.terrainMaterial.normalMap = hillNormal;
    this.terrainMaterial.normalScale.set(0.6, 0.6);
    this.terrainMaterial.needsUpdate = true;
    await Promise.all([loadTrees(this), loadSportsAssets(this)]);
    this.selectCar("gt");
  }
  setupGame(sim) {
    this.shake = 0;
    this.camera.position.set(START.x - 12, 5.2, START.z + 6);
    this.camera.lookAt(START.x + 9, 1.1, START.z - 7);
    this.previewCamera = this.camera.position.clone();
    this.cameraLook = new THREE.Vector3(START.x, 1.3, START.z);
    this.trafficMeshes = [];
    this.policeMeshes = [];
    // Consolidate repeated static geometry into instanced batches.
    const batches = new Map();
    for (const mesh of [...this.scene.children]) {
      if (
        mesh.type !== "Mesh" ||
        mesh.geometry.type !== "BoxGeometry" ||
        mesh.userData.preserveUV
      )
        continue;
      const key = mesh.material.uuid;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(mesh);
    }
    for (const meshes of batches.values()) {
      const batch = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        meshes[0].material,
        meshes.length,
      );
      meshes.forEach((m, i) => {
        const p = m.geometry.parameters;
        m.scale.set(p.width, p.height, p.depth);
        m.updateMatrix();
        batch.setMatrixAt(i, m.matrix);
        this.scene.remove(m);
        m.geometry.dispose();
      });
      batch.castShadow = true;
      batch.receiveShadow = true;
      this.scene.add(batch);
    }
    this.gate = new THREE.Group();
    const cyan = material("#74f6f0", {
      emissive: "#40e8ea",
      emissiveIntensity: 2.3,
    });
    for (const x of [-12, 12])
      this.box(0.32, 7, 0.32, cyan, x, 3.5, 0, this.gate);
    this.box(24, 0.28, 0.32, cyan, 0, 7, 0, this.gate);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 4),
      new THREE.MeshBasicMaterial({
        color: "#54dbe4",
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.1;
    this.gate.add(floor);
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 512;
    labelCanvas.height = 96;
    const c = labelCanvas.getContext("2d");
    c.fillStyle = "#0a2330";
    c.fillRect(0, 0, 512, 96);
    c.fillStyle = "#9ffbf1";
    c.font = "bold 37px Arial";
    c.textAlign = "center";
    c.fillText("CHECKPOINT", 256, 61);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(labelCanvas),
        depthTest: true,
      }),
    );
    sprite.position.y = 9;
    sprite.scale.set(13, 2.45, 1);
    this.gate.add(sprite);
    this.scene.add(this.gate);
    this.updateGate(0);
    this.skids = [];
    const skidMat = new THREE.MeshBasicMaterial({
      color: "#101c27",
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    for (let i = 0; i < 160; i++) {
      const skid = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1), skidMat);
      skid.rotation.x = -Math.PI / 2;
      skid.visible = false;
      this.scene.add(skid);
      this.skids.push(skid);
    }
    this.skidIndex = 0;
    this.skidTimer = 0;
    this.lastTirePositions = null;
    this.tireSmoke = createTireSmoke(this.scene);
    const beamMat = new THREE.MeshBasicMaterial({
      color: "#f8eabb",
      transparent: true,
      opacity: 0.065,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.headlightBeams = [];
    for (const x of [-0.85, 0.85]) {
      const geo = new THREE.PlaneGeometry(3, 13);
      const m = new THREE.Mesh(geo, beamMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.08, 8.5);
      this.player.add(m);
      this.headlightBeams.push(m);
    }
    this.renderer.shadowMap.autoUpdate = true;
    this.renderer.shadowMap.needsUpdate = true;
  }
  updateGate(index) {
    const cp = CHECKPOINTS[index];
    this.gate.visible = !!cp;
    if (cp) {
      this.gate.position.set(cp.x, 0, cp.z);
      this.gate.rotation.y = cp.angle;
    }
  }
  startGame(sim) {
    resetTireSmoke(this.tireSmoke);
    this.lastTirePositions = null;
    for (const child of [...this.scene.children])
      if (
        child.type === "Group" &&
        child !== this.player &&
        child !== this.gate &&
        !child.userData.environment
      )
        disposeGroup(this.scene, child);
    this.fx.clear();
    this.selectCar(sim.player.carId);
    this.trafficMeshes = [];
    this.policeMeshes = [];
    for (const car of sim.traffic) {
      const color = ["#819caa", "#b7b3a3", "#4b6565", "#914b42", "#d5ddce"][
        this.trafficMeshes.length % 5
      ];
      const m =
        car.kind === "sport"
          ? this.makeCar(color)
          : makeSedan(this, false, color, car.kind);
      this.trafficMeshes.push(m);
      this.scene.add(m);
    }
    this.updateGate(0);
    this.camera.position.set(
      sim.player.x - Math.sin(sim.player.angle) * 9,
      4.4,
      sim.player.z - Math.cos(sim.player.angle) * 9,
    );
    this.cameraLook.set(sim.player.x, 1.2, sim.player.z);
    for (const m of this.skids) m.visible = false;
  }
  selectCar(id) {
    const spec = carSpec(id),
      previous = this.player;
    this.player = this.makeCar(spec.color, false, spec.id);
    addTurboExhaust(this.player);
    if (previous) {
      this.player.position.copy(previous.position);
      this.player.rotation.copy(previous.rotation);
      for (const beam of this.headlightBeams || []) this.player.add(beam);
      disposeGroup(this.scene, previous);
    }
    this.scene.add(this.player);
  }
  setCamera(id) {
    const index = CAMERAS.findIndex((c) => c.id === id);
    if (index < 0) throw Error("Unknown camera");
    this.cameraMode = index;
    return CAMERAS[index];
  }
  cycleCamera() {
    this.cameraMode = (this.cameraMode + 1) % CAMERAS.length;
    return CAMERAS[this.cameraMode];
  }
  resetPreview() {
    resetTireSmoke(this.tireSmoke);
    for (const child of [...this.scene.children])
      if (
        child.type === "Group" &&
        child !== this.player &&
        child !== this.gate &&
        !child.userData.environment
      )
        disposeGroup(this.scene, child);
    this.fx.clear();
    this.trafficMeshes = [];
    this.policeMeshes = [];
    this.player.visible = true;
    this.cockpit.root.visible = false;
    this.player.position.set(START.x, 0, START.z);
    this.player.rotation.set(0, START.angle, 0);
    this.camera.position.set(START.x - 12, 5.2, START.z + 6);
    this.camera.lookAt(START.x + 9, 1.1, START.z - 7);
    this.camera.fov = 56;
    this.camera.updateProjectionMatrix();
    this.updateGate(0);
  }
  render(sim, dt, input) {
    const ready = sim.phase === "ready";
    if (!ready) {
      const p = sim.player;
      this.player.position.set(p.x, 0, p.z);
      this.player.rotation.y = p.angle;
      animateWheels(this.player, p.speed, dt, p.steering);
      updateTurboExhaust(this.player, p, sim.time);
      updateTireSmoke(
        this.tireSmoke,
        p,
        dt,
        sim.phase === "running" && p.isDrifting,
      );
      this.player.rotation.z =
        -p.steering * Math.min(Math.abs(p.speed) / 50, 1) * 0.035;
      while (this.policeMeshes.length < sim.police.length) {
        const m = this.makeCar("#18232b", true);
        this.scene.add(m);
        this.policeMeshes.push(m);
      }
      for (const [cars, meshes] of [
        [sim.traffic, this.trafficMeshes],
        [sim.police, this.policeMeshes],
      ])
        cars.forEach((car, i) => {
          meshes[i].visible =
            !car.destroyed && Math.hypot(car.x - p.x, car.z - p.z) < 330;
          if (car.destroyed) return;
          if (meshes[i].userData.healthBar)
            updatePatrolHealthBar(meshes[i].userData.healthBar, car.health);
          if (meshes[i].userData.healthBar)
            meshes[i].userData.healthBar.sprite.visible =
              Math.hypot(
                car.x - this.camera.position.x,
                car.z - this.camera.position.z,
              ) > 10;
          meshes[i].position.set(car.x, 0, car.z);
          meshes[i].rotation.y = car.angle;
          animateWheels(meshes[i], Math.hypot(car.vx, car.vz), dt);
          if (meshes[i].userData.brakeLights)
            meshes[i].userData.brakeLights.emissiveIntensity =
              car.ramRecovery > 0 ? 2.2 : 0.65;
          if (meshes[i].userData.lights)
            meshes[i].userData.lights.forEach(
              (m, j) =>
                (m.emissiveIntensity =
                  Math.sin(sim.time * 19 + j * Math.PI) > 0 ? 6 : 0.3),
            );
        });
      this.updateGate(sim.checkpoint);
      const mode = CAMERAS[this.cameraMode].id;
      const interior = mode === "cockpit",
        hood = mode === "hood";
      this.player.visible = !hood;
      this.cockpit.root.visible = false;
      updateCockpit(this.cockpit, p, input.steer);
      const forward = new THREE.Vector3(
        Math.sin(p.angle),
        0,
        Math.cos(p.angle),
      );
      if (interior || hood) {
        const seat = mode === "cockpit" ? -0.28 : 1.8;
        const driverOffset = interior ? 0.34 : 0;
        this.camera.position.set(
          p.x + forward.x * seat + forward.z * driverOffset,
          interior ? 1.08 : 0.97,
          p.z + forward.z * seat - forward.x * driverOffset,
        );
        this.camera.lookAt(
          p.x + forward.x * 60,
          this.camera.position.y - 0.1,
          p.z + forward.z * 60,
        );
        this.camera.fov = interior ? 76 : 70;
      } else {
        const zoom = mode === "aerial" ? 27 : 9 + p.boostStrength * 1.6;
        const target = new THREE.Vector3(
          p.x - forward.x * zoom,
          mode === "aerial" ? 26 : 4.4,
          p.z - forward.z * zoom,
        );
        const anchor = { x: p.x, y: 1.7, z: p.z };
        const clearTarget = clearCameraPosition(anchor, target, sim.obstacles);
        this.camera.position.lerp(clearTarget, 1 - Math.exp(-dt * 7));
        // Smoothing around a corner can itself cross a wall; constrain that path too.
        this.camera.position.copy(
          clearCameraPosition(anchor, this.camera.position, sim.obstacles),
        );
        this.cameraLook.lerp(
          new THREE.Vector3(p.x + forward.x * 10, 1.5, p.z + forward.z * 10),
          1 - Math.exp(-dt * 10),
        );
        this.camera.lookAt(this.cameraLook);
        this.camera.fov +=
          (56 + p.boostStrength * 8 - this.camera.fov) *
          (1 - Math.exp(-dt * 5));
      }
      this.camera.updateProjectionMatrix();
      for (const e of sim.explosions) {
        if (!this.fx.has(e.id))
          this.fx.set(e.id, createExplosion(this.scene, e));
      }
      for (const [id, fx] of this.fx) {
        if (sim.time - fx.born >= 2.2) {
          disposeGroup(this.scene, fx.group);
          this.fx.delete(id);
        } else animateExplosion(fx, sim.time);
      }
      if (this.shake > 0) {
        this.camera.position.x += (Math.random() - 0.5) * this.shake;
        this.camera.position.y += (Math.random() - 0.5) * this.shake;
        this.shake = Math.max(0, this.shake - dt);
      }
      this.skidTimer += dt;
      const marking =
        sim.phase === "running" &&
        (input.brake || p.isDrifting) &&
        Math.abs(p.speed) > 10;
      if (!marking) this.lastTirePositions = null;
      if (marking && this.skidTimer > 0.035) {
        this.skidTimer = 0;
        const tires = [-1, 1].map((side) => ({
          x: p.x - forward.x * 1.45 + forward.z * side * 0.85,
          z: p.z - forward.z * 1.45 - forward.x * side * 0.85,
        }));
        tires.forEach((tire, i) => {
          const previous = this.lastTirePositions?.[i];
          if (!previous) return;
          const dx = tire.x - previous.x,
            dz = tire.z - previous.z;
          const length = Math.hypot(dx, dz);
          if (length < 0.02 || length > 5) return;
          const m = this.skids[this.skidIndex++ % this.skids.length];
          m.position.set(
            (tire.x + previous.x) / 2,
            0.084,
            (tire.z + previous.z) / 2,
          );
          m.rotation.set(-Math.PI / 2, 0, Math.atan2(dx, dz));
          m.scale.y = length + 0.025;
          m.visible = true;
        });
        this.lastTirePositions = tires;
      }
    }
    updateScenery(this, sim.time || performance.now() / 1000);
    updateTrees(
      this,
      sim.player,
      sim.time || performance.now() / 1000,
      sim.trees,
    );
    updateRouteGuide(this.routeGuide, sim);
    this.sun.position.set(
      this.player.position.x - 75,
      145,
      this.player.position.z - 95,
    );
    this.sun.target.position.copy(this.player.position);
    this.renderer.render(this.scene, this.camera);
  }
}
