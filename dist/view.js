import * as THREE from "./vendor/three.module.js";
import { CHECKPOINTS } from "./simulation.js";
import { carSpec, CAMERAS } from "./config.js";
import { buildGeorgianCity, updateScenery } from "./scenery.js";
import { makeCockpit, updateCockpit } from "./cockpit.js";
import { makeRouteGuide, updateRouteGuide } from "./route-guide.js";
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
    this.scene.background = new THREE.Color("#526778");
    this.scene.fog = new THREE.FogExp2("#526778", 0.0015);
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
    this.renderer.toneMappingExposure = 1.12;
    this.camera = new THREE.PerspectiveCamera(56, 1, 0.2, 3200);
    this.scene.add(new THREE.HemisphereLight("#a6c6ef", "#373e43", 2.1));
    const sun = new THREE.DirectionalLight("#ffe2b1", 2.2);
    sun.position.set(-120, 170, -200);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -220,
      right: 220,
      top: 220,
      bottom: -220,
      far: 650,
    });
    sun.shadow.bias = -0.0003;
    this.scene.add(sun);
    this.sun = sun;
    buildGeorgianCity(this);
    this.cameraMode = 0;
    this.cockpit = makeCockpit();
    this.camera.add(this.cockpit.root);
    this.scene.add(this.camera);
    this.fx = new Map();
    this.routeGuide = makeRouteGuide(this.scene);
    this.player = this.makeCar("#eecb39");
    this.player.position.set(4, 0, -30);
    this.scene.add(this.player);
    this.camera.position.set(11, 7.5, -49);
    this.camera.lookAt(-5, 2, -4);
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
    const group = new THREE.Group();
    const paint = material(color, { metalness: 0.45, roughness: 0.32 });
    const rubber = material("#10171d"),
      glass = material("#1b394b", { metalness: 0.6, roughness: 0.18 });
    this.box(2.4, 0.68, 4.6, paint, 0, 0.85, 0, group);
    this.box(2.18, 0.3, 4.1, paint, 0, 1.28, 0, group);
    this.box(1.94, 0.73, 2.12, glass, 0, 1.72, -0.18, group);
    this.box(1.98, 0.11, 1.82, police ? rubber : paint, 0, 2.13, -0.25, group);
    this.box(2.3, 0.15, 0.2, rubber, 0, 1.47, -2.26, group);
    this.box(2.28, 0.27, 0.18, rubber, 0, 0.7, 2.28, group);
    const wheels = [];
    for (const x of [-1.2, 1.2])
      for (const z of [-1.43, 1.43]) {
        const mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.46, 0.46, 0.3, 14),
          rubber,
        );
        mesh.rotation.z = Math.PI / 2;
        mesh.position.set(x, 0.5, z);
        group.add(mesh);
        wheels.push(mesh);
        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 0.32, 8),
          material("#828c8f", { metalness: 0.8 }),
        );
        hub.rotation.z = Math.PI / 2;
        hub.position.copy(mesh.position);
        group.add(hub);
      }
    const head = material("#f9f6d2", {
      emissive: "#f9f6d2",
      emissiveIntensity: 2,
    });
    const tail = material("#ee3c38", {
      emissive: "#ff3322",
      emissiveIntensity: 2,
    });
    for (const x of [-0.8, 0.8]) {
      this.box(0.58, 0.18, 0.08, head, x, 1.08, 2.31, group);
      this.box(0.6, 0.18, 0.08, tail, x, 1.09, -2.31, group);
    }
    if (police) {
      this.box(2.42, 0.38, 2.35, material("#d4dfdf"), 0, 0.95, 0, group);
      const red = material("#ff2342", {
          emissive: "#ff1635",
          emissiveIntensity: 4,
        }),
        blue = material("#359aff", {
          emissive: "#126dff",
          emissiveIntensity: 4,
        });
      this.box(0.68, 0.22, 0.45, red, -0.42, 2.33, -0.2, group);
      this.box(0.68, 0.22, 0.45, blue, 0.42, 2.33, -0.2, group);
      group.userData.lights = [red, blue];
    }
    if (!police && carId === "rally") {
      group.scale.set(1, 0.95, 0.87);
      this.box(2.45, 0.16, 0.55, rubber, 0, 2.03, -1.92, group);
      for (const x of [-0.33, 0.33])
        this.box(0.17, 0.02, 1.2, material("#f4f0df"), x, 1.45, 1.2, group);
    } else if (!police && carId === "suv") {
      group.scale.set(1.12, 1.25, 1.08);
      this.box(2.15, 0.2, 2.4, rubber, 0, 2.33, -0.25, group);
      this.box(2.5, 0.25, 0.25, rubber, 0, 0.9, 2.4, group);
      for (const x of [-0.8, 0, 0.8])
        this.box(0.32, 0.2, 0.18, head, x, 2.51, 0.93, group);
    }
    if (!police && this.georgiaFlag) {
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.68, 0.44),
        new THREE.MeshBasicMaterial({
          map: this.georgiaFlag,
          side: THREE.DoubleSide,
        }),
      );
      flag.rotation.x = -Math.PI / 2;
      flag.position.set(0, 1.447, 1.55);
      group.add(flag);
    }
    if (police) {
      const bar = makePatrolHealthBar();
      group.add(bar.sprite);
      group.userData.healthBar = bar;
    }
    group.userData.paint = paint;
    group.userData.wheels = wheels;
    return group;
  }
  async loadTextures() {
    const loader = new THREE.TextureLoader();
    const [road, facade, paint, oldTown] = await Promise.all(
      ["asphalt", "building", "paint", "old-tbilisi"].map((name) =>
        loader.loadAsync("./assets/" + name + ".png"),
      ),
    );
    for (const tex of [road, facade, paint, oldTown]) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = Math.min(
        8,
        this.renderer.capabilities.getMaxAnisotropy(),
      );
    }
    road.repeat.set(2, 70);
    this.paintTexture = paint;
    for (const m of this.oldTownMaterials) {
      m.map = oldTown;
      m.emissiveMap = oldTown;
      m.emissiveIntensity = 0.25;
      m.needsUpdate = true;
    }
    this.roadMaterial.map = road;
    this.roadMaterial.color.set("#9aabbd");
    this.roadMaterial.needsUpdate = true;
    for (const m of this.buildingMaterials) {
      m.map = facade;
      m.color.set("#889ba7");
      m.emissive.set("#7890a0");
      m.emissiveMap = facade;
      m.emissiveIntensity = 0.35;
      m.needsUpdate = true;
    }
    this.player.userData.paint.map = paint;
    this.player.userData.paint.color.set("#ffffff");
    this.player.userData.paint.needsUpdate = true;
  }
  setupGame(sim) {
    this.shake = 0;
    this.camera.position.set(11, 7.5, -49);
    this.camera.lookAt(-5, 2, -4);
    this.previewCamera = this.camera.position.clone();
    this.cameraLook = new THREE.Vector3(4, 1.3, -10);
    this.trafficMeshes = [];
    this.policeMeshes = [];
    // Consolidate repeated static geometry into instanced batches.
    const batches = new Map();
    for (const mesh of [...this.scene.children]) {
      if (mesh.type !== "Mesh" || mesh.geometry.type !== "BoxGeometry")
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
    floor.position.y = 0.07;
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
      const skid = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.4), skidMat);
      skid.rotation.x = -Math.PI / 2;
      skid.visible = false;
      this.scene.add(skid);
      this.skids.push(skid);
    }
    this.skidIndex = 0;
    this.skidTimer = 0;
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
      this.gate.rotation.y = cp.axis === "x" ? Math.PI / 2 : 0;
    }
  }
  startGame(sim) {
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
      const m = this.makeCar(
        ["#819caa", "#b7b3a3", "#4b6565", "#914b42", "#d5ddce"][
          this.trafficMeshes.length % 5
        ],
      );
      this.trafficMeshes.push(m);
      this.scene.add(m);
    }
    this.updateGate(0);
    this.camera.position.set(4, 8, -47);
    this.cameraLook.set(4, 1.5, -15);
    for (const m of this.skids) m.visible = false;
  }
  selectCar(id) {
    const spec = carSpec(id),
      previous = this.player;
    this.player = this.makeCar(spec.color, false, spec.id);
    if (spec.id === "gt" && this.paintTexture) {
      this.player.userData.paint.map = this.paintTexture;
      this.player.userData.paint.color.set("#ffffff");
    }
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
    this.player.position.set(4, 0, -30);
    this.player.rotation.set(0, 0, 0);
    this.camera.position.set(11, 7.5, -49);
    this.camera.lookAt(-5, 2, -4);
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
      this.player.rotation.z =
        -input.steer * Math.min(Math.abs(p.speed) / 50, 1) * 0.035;
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
          meshes[i].visible = !car.destroyed;
          if (car.destroyed) return;
          if (meshes[i].userData.healthBar)
            updatePatrolHealthBar(meshes[i].userData.healthBar, car.health);
          meshes[i].position.set(car.x, 0, car.z);
          meshes[i].rotation.y = car.angle;
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
      this.player.visible = !interior && !hood;
      this.cockpit.root.visible = interior;
      updateCockpit(this.cockpit, p, input.steer);
      const forward = new THREE.Vector3(
        Math.sin(p.angle),
        0,
        Math.cos(p.angle),
      );
      if (interior || hood) {
        const seat = mode === "cockpit" ? 0.2 : 1.8;
        this.camera.position.set(
          p.x + forward.x * seat,
          interior ? (p.carId === "suv" ? 2.48 : 1.87) : 1.5,
          p.z + forward.z * seat,
        );
        this.camera.lookAt(
          p.x + forward.x * 60,
          this.camera.position.y - 0.1,
          p.z + forward.z * 60,
        );
        this.camera.fov = interior ? 76 : 70;
      } else {
        const zoom = mode === "aerial" ? 29 : p.boosting ? 20 : 16;
        const target = new THREE.Vector3(
          p.x - forward.x * zoom,
          mode === "aerial" ? 27 : 8.5,
          p.z - forward.z * zoom,
        );
        if (
          sim.obstacles.some(
            (o) =>
              target.x > o.minX - 2 &&
              target.x < o.maxX + 2 &&
              target.z > o.minZ - 2 &&
              target.z < o.maxZ + 2,
          )
        ) {
          target.x = p.x - forward.x * 7;
          target.z = p.z - forward.z * 7;
          target.y = mode === "aerial" ? 32 : 16;
        }
        this.camera.position.lerp(target, 1 - Math.exp(-dt * 7));
        this.cameraLook.lerp(
          new THREE.Vector3(p.x + forward.x * 10, 1.5, p.z + forward.z * 10),
          1 - Math.exp(-dt * 10),
        );
        this.camera.lookAt(this.cameraLook);
        this.camera.fov +=
          ((p.boosting ? 65 : 56) - this.camera.fov) * Math.min(dt * 3, 1);
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
      if (
        sim.phase === "running" &&
        input.brake &&
        Math.abs(p.speed) > 10 &&
        this.skidTimer > 0.035
      ) {
        this.skidTimer = 0;
        for (const side of [-1, 1]) {
          const m = this.skids[this.skidIndex++ % this.skids.length];
          m.position.set(
            p.x + Math.cos(p.angle) * side,
            p.boosting ? 0.055 : 0.05,
            p.z - Math.sin(p.angle) * side,
          );
          m.rotation.set(-Math.PI / 2, 0, -p.angle);
          m.visible = true;
        }
      }
    }
    updateScenery(this, sim.time || performance.now() / 1000);
    updateRouteGuide(this.routeGuide, sim);
    this.renderer.render(this.scene, this.camera);
  }
}
