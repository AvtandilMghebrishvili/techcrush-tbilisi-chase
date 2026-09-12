import { updateExpansion } from "./expansion-visuals.js";
import { updateBridgeRails } from "./bridge-visuals.js";
import { createWaterSplash, animateWaterSplash } from "./crash-effects.js";
import * as THREE from "./vendor/three.module.js";
import { renderBudget, portraitFov } from "./mobile-input.js";
import { CityLighting, windowGlow } from "./city-lighting.js";
import { updateVehicleDamage, prepareVehicleDamage } from "./vehicle-damage.js";
import { EXPLOSION_LIFETIME, IMPACT_LIFETIME } from "./damage-state.js";
import { updateBreakables } from "./breakable-props.js";
import { makeOriginalSportsCar } from "./car-models.js";
import { CHECKPOINTS } from "./simulation.js";
import {
  makeCheckpointArch,
  positionCheckpointArch,
} from "./checkpoint-arch.js";
import {
  makePoliceVehicle,
  makeHelicopter,
  updateHelicopterMesh,
} from "./pursuit-vehicles.js";
import { carSpec, CAMERAS } from "./config.js";
import { updateInterior } from "./interior-detail.js";
import { paintColor } from "./customization.js";
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
import { animateDistricts } from "./tbilisi-districts.js";
import { loadSportsAssets, sportsCar, animateWheels } from "./sports-car.js";
import { makeCockpit, updateCockpit } from "./cockpit.js";
import { makeRouteGuide, updateRouteGuide } from "./route-guide.js";
import { applyTechcrushBrand } from "./landmarks.js";
import {
  createExplosion,
  animateExplosion,
  createImpactBurst,
  animateImpactBurst,
  disposeGroup,
  makePatrolHealthBar,
  updatePatrolHealthBar,
} from "./effects.js";
const material = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
export class SceneView {
  constructor(canvas) {
    this.mobile =
      matchMedia("(any-pointer: coarse)").matches ||
      navigator.maxTouchPoints > 0;
    this.quality = "auto";
    try {
      this.quality =
        JSON.parse(localStorage.getItem("techcrush-mobile") || "{}").quality ||
        "auto";
    } catch {}
    this.budget = renderBudget(
      this.quality,
      this.mobile,
      innerWidth,
      innerHeight,
      devicePixelRatio,
    );
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#b4c1c8");
    this.scene.fog = new THREE.FogExp2("#b8c1c5", 0.00052);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.budget.low,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(this.budget.pixelRatio);
    this.renderer.shadowMap.enabled = this.budget.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.camera = new THREE.PerspectiveCamera(56, 1, 0.06, 4800);
    this.hemisphere = new THREE.HemisphereLight("#dce8f3", "#78776b", 0.75);
    this.scene.add(this.hemisphere);
    this.blastLight = new THREE.PointLight("#ff9736", 0, 19, 2);
    this.scene.add(this.blastLight);
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
      this.budget = renderBudget(
        this.quality,
        this.mobile,
        innerWidth,
        innerHeight,
        devicePixelRatio,
      );
      this.renderer.setPixelRatio(this.budget.pixelRatio);
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    };
    addEventListener("resize", this.resize);
    this.resize();
  }
  setQuality(mode) {
    this.quality = ["auto", "battery", "high"].includes(mode) ? mode : "auto";
    this.resize();
    this.renderer.shadowMap.enabled = this.budget.shadows;
    this.renderer.shadowMap.needsUpdate = true;
    this.scene.traverse((o) => {
      if (o.isMesh)
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.needsUpdate = true;
    });
    if (this.trees) this.trees.nextUpdate = -1;
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
    if (carId === "classic" && this.carTemplate)
      return sportsCar(this, color, false, carId);
    const model = makeOriginalSportsCar(carId, color);
    // Only the player's headlights illuminate the city; distant traffic uses lenses.
    for (const light of model.userData.headlights) light.visible = false;
    return model;
  }
  async loadTextures(progress = () => {}) {
    progress(12, "LOADING STREETS & FACADES");
    const loader = new THREE.TextureLoader();
    let completed = 0;
    const track = (promise) =>
      promise.then((value) => {
        progress(
          12 + Math.round((++completed / 8) * 76),
          "LOADING CITY, CARS & TREES",
        );
        return value;
      });
    const [road, facade, logo, wordmark, hill, hillNormal] = await Promise.all([
      ...[
        "road-day.png",
        "limestone.png",
        "techcrush-logo.jpg",
        "techcrush-wordmark.png",
        "hills-diff.jpg",
        "hills-nor_gl.jpg",
      ].map((n) => track(loader.loadAsync("./assets/" + n))),
      track(loadTrees(this)),
      track(loadSportsAssets(this)),
    ]);
    progress(90, "FINISHING CITY MATERIALS");
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
    for (const [i, m] of this.buildingMaterials.entries()) {
      if (m.userData.originalFacade) continue;
      m.map = facade;
      m.emissive.set("#ffffff");
      m.emissiveMap = windowGlow(facade.image, i);
      m.emissiveIntensity = 0;
      m.needsUpdate = true;
    }
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
    const detailHill = hill.clone(),
      detailNormal = hillNormal.clone();
    detailHill.repeat.set(1, 1);
    detailNormal.repeat.set(1, 1);
    for (const m of [
      ...(this.localHillMaterials || []),
      this.districtMaterials?.ground,
    ].filter(Boolean)) {
      m.map = detailHill;
      m.normalMap = detailNormal;
      m.normalScale.set(0.3, 0.3);
      m.needsUpdate = true;
    }
    this.districtMaterials.ground.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        "#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.29,.31,.23),.72);",
      );
    };
    this.lighting = new CityLighting(this);
    progress(94, "CONNECTING YOUR GARAGE");
  }
  setupGame(sim) {
    sim.propDefinitions = (this.breakableProps || []).map((p) => p.definition);
    sim.poles = sim.propDefinitions.map((p) => ({
      ...p,
      broken: false,
      fallenAt: 0,
      fallAngle: 0,
    }));
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
    this.gate = makeCheckpointArch();
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
    this.renderer.shadowMap.autoUpdate = true;
    this.renderer.shadowMap.needsUpdate = true;
  }
  updateGate(index, checkpoints = this.checkpoints || CHECKPOINTS) {
    const cp = checkpoints[index];
    if (this.gateCheckpoint === cp) return;
    this.gateCheckpoint = cp;
    positionCheckpointArch(this.gate, cp);
  }
  startGame(sim) {
    updateBridgeRails(this, sim.obstacles, sim.time);
    this.checkpoints = sim.checkpoints;
    this.helicopterMesh = null;
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
    this.selectCar(sim.player.carId, sim.player.equipment);
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
  selectCar(id, equipment = {}) {
    const spec = carSpec(id),
      previous = this.player;
    this.player =
      spec.id === "classic"
        ? sportsCar(
            this,
            paintColor(equipment, spec.color),
            false,
            spec.id,
            equipment,
          )
        : makeOriginalSportsCar(
            spec.id,
            paintColor(equipment, spec.color),
            equipment,
          );
    addTurboExhaust(this.player);
    prepareVehicleDamage(this.player);
    if (previous) {
      this.player.position.copy(previous.position);
      this.player.rotation.copy(previous.rotation);
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
    this.blastLight.intensity = 0;
    updateVehicleDamage(this.player, { health: 100 });
    this.checkpoints = CHECKPOINTS;
    this.helicopterMesh = null;
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
    updateBreakables(this, sim);
    const ready = sim.phase === "ready";
    if (!ready) {
      const p = sim.player;
      this.player.position.set(p.x, p.y || 0, p.z);
      this.player.rotation.order = "YXZ";
      this.player.rotation.set(p.pitch || 0, p.angle, p.roll || 0, "YXZ");
      updateVehicleDamage(this.player, p);
      animateWheels(this.player, p.health <= 0 ? 0 : p.speed, dt, p.steering);
      updateTurboExhaust(this.player, p, sim.time);
      updateTireSmoke(
        this.tireSmoke,
        p,
        dt,
        sim.phase === "running" && p.isDrifting,
      );
      this.player.rotation.z =
        (p.roll || 0) -
        p.steering * Math.min(Math.abs(p.speed) / 50, 1) * 0.035;
      if (sim.phase === "rewinding" && !this.wasRewinding) {
        for (const mark of this.skids) mark.visible = false;
        resetTireSmoke(this.tireSmoke);
        this.lastTirePositions = null;
      }
      this.wasRewinding = sim.phase === "rewinding";
      while (this.policeMeshes.length < sim.police.length) {
        const m = makePoliceVehicle(this, sim.police[this.policeMeshes.length]);
        this.scene.add(m);
        this.policeMeshes.push(m);
      }
      sim.police.forEach((cop, i) => {
        if (this.policeMeshes[i].userData.kind !== cop.kind) {
          disposeGroup(this.scene, this.policeMeshes[i]);
          this.policeMeshes[i] = makePoliceVehicle(this, cop);
          this.scene.add(this.policeMeshes[i]);
        }
      });
      if (sim.helicopter && !this.helicopterMesh) {
        this.helicopterMesh = makeHelicopter();
        this.scene.add(this.helicopterMesh);
      }
      if (this.helicopterMesh)
        updateHelicopterMesh(this.helicopterMesh, sim.helicopter, sim.time);
      for (let i = sim.police.length; i < this.policeMeshes.length; i++)
        this.policeMeshes[i].visible = false;
      for (const [cars, meshes] of [
        [sim.traffic, this.trafficMeshes],
        [sim.police, this.policeMeshes],
      ])
        cars.forEach((car, i) => {
          meshes[i].visible = Math.hypot(car.x - p.x, car.z - p.z) < 330;
          meshes[i].position.set(car.x, car.y || 0, car.z);
          meshes[i].rotation.set(
            car.pitch || 0,
            car.angle,
            car.roll || 0,
            "YXZ",
          );
          if (meshes[i].visible) updateVehicleDamage(meshes[i], car);
          if (car.destroyed || car.waterAt != null) {
            if (meshes[i].userData.healthBar)
              meshes[i].userData.healthBar.sprite.visible = false;
            return;
          }
          if (meshes[i].userData.healthBar)
            updatePatrolHealthBar(
              meshes[i].userData.healthBar,
              car.health,
              car.maxHealth,
              car.kind,
            );
          if (meshes[i].userData.healthBar)
            meshes[i].userData.healthBar.sprite.visible =
              Math.hypot(
                car.x - this.camera.position.x,
                car.z - this.camera.position.z,
              ) > 10;
          meshes[i].position.set(car.x, car.y || 0, car.z);
          meshes[i].rotation.set(
            car.pitch || 0,
            car.angle,
            car.roll || 0,
            "YXZ",
          );
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
      updateExpansion(this, sim);
      updateBridgeRails(this, sim.obstacles, sim.time);
      this.updateGate(sim.checkpoint, sim.checkpoints);
      const mode = CAMERAS[this.cameraMode].id;
      const interior = mode === "cockpit",
        hood = mode === "hood";
      if (this.player.userData.glass)
        this.player.userData.glass.opacity = interior ? 0.16 : 0.8;
      this.player.visible = !hood;
      this.cockpit.root.visible = false;
      updateCockpit(this.cockpit, p, input.steer);
      updateInterior(this.player, p, sim.phase === "running" ? dt : 0, input);
      const forward = new THREE.Vector3(
        Math.sin(p.angle),
        0,
        Math.cos(p.angle),
      );
      if (interior || hood) {
        const cabin = this.player.userData.cockpitSeat || {
          x: 0.36,
          y: 1.08,
          z: -0.28,
        };
        const seat = interior ? cabin.z : 1.8;
        const driverOffset = interior ? cabin.x : 0;
        this.camera.position.set(
          p.x + forward.x * seat + forward.z * driverOffset,
          (p.y || 0) + (interior ? cabin.y : 0.97),
          p.z + forward.z * seat - forward.x * driverOffset,
        );
        this.camera.lookAt(
          p.x + forward.x * 60,
          this.camera.position.y - 0.1,
          p.z + forward.z * 60,
        );
        this.camera.fov = portraitFov(interior ? 76 : 70, this.camera.aspect);
      } else {
        const zoom = mode === "aerial" ? 27 : 9 + p.boostStrength * 1.6;
        const target = new THREE.Vector3(
          p.x - forward.x * zoom,
          (p.y || 0) + (mode === "aerial" ? 26 : 4.4),
          p.z - forward.z * zoom,
        );
        const anchor = { x: p.x, y: (p.y || 0) + 1.7, z: p.z };
        const clearTarget = clearCameraPosition(anchor, target, sim.obstacles);
        this.camera.position.lerp(clearTarget, 1 - Math.exp(-dt * 7));
        // Smoothing around a corner can itself cross a wall; constrain that path too.
        this.camera.position.copy(
          clearCameraPosition(anchor, this.camera.position, sim.obstacles),
        );
        this.cameraLook.lerp(
          new THREE.Vector3(
            p.x + forward.x * 10,
            (p.y || 0) + 1.5,
            p.z + forward.z * 10,
          ),
          1 - Math.exp(-dt * 10),
        );
        this.camera.lookAt(this.cameraLook);
        this.camera.fov +=
          (portraitFov(56 + p.boostStrength * 8, this.camera.aspect) -
            this.camera.fov) *
          (1 - Math.exp(-dt * 5));
      }
      this.camera.updateProjectionMatrix();
      // Finish the destruction burst behind the game-over UI. Pause and rewind
      // continue to use authoritative simulation time.
      const terminal = ["wrecked", "busted", "won"].includes(sim.phase);
      this.effectTime = terminal
        ? Math.max(sim.time, this.effectTime || 0) + dt
        : sim.time;
      for (const e of sim.explosions) {
        if (!this.fx.has(e.id) && this.effectTime - e.born < EXPLOSION_LIFETIME)
          this.fx.set(e.id, createExplosion(this.scene, e));
      }
      for (const e of sim.impacts || [])
        if (!this.fx.has(e.id) && this.effectTime - e.born < IMPACT_LIFETIME) {
          const fx =
            e.kind === "water"
              ? createWaterSplash(this.scene, e)
              : createImpactBurst(this.scene, e);
          fx.isWater = e.kind === "water";
          fx.isImpact = true;
          this.fx.set(e.id, fx);
        }
      for (const [id, fx] of this.fx) {
        if (this.effectTime - fx.born >= fx.lifetime || fx.born > sim.time) {
          disposeGroup(this.scene, fx.group);
          this.fx.delete(id);
        } else if (fx.isWater) animateWaterSplash(fx, this.effectTime);
        else if (fx.isImpact) animateImpactBurst(fx, this.effectTime);
        else animateExplosion(fx, this.effectTime);
      }
      const flashes = [...this.fx.values()]
        .filter((fx) => fx.light?.intensity > 0)
        .sort(
          (a, b) =>
            a.group.position.distanceToSquared(this.player.position) -
            b.group.position.distanceToSquared(this.player.position),
        );
      this.blastLight.intensity = flashes[0]?.light.intensity || 0;
      if (flashes[0]) this.blastLight.position.copy(flashes[0].group.position);
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
    const worldTime =
      sim.phase === "ready" ? performance.now() / 1000 : sim.time;
    updateScenery(this, worldTime);
    animateDistricts(this, worldTime);
    updateTrees(this, sim.player, worldTime, sim.trees);
    updateRouteGuide(
      this.routeGuide,
      sim,
      CAMERAS[this.cameraMode].id,
      this.camera,
    );
    this.lighting?.update(sim);
    this.sun.position.set(
      this.player.position.x - 75,
      145,
      this.player.position.z - 95,
    );
    this.sun.target.position.copy(this.player.position);
    this.renderer.render(this.scene, this.camera);
  }
}
