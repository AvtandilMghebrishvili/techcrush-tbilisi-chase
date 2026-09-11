import * as THREE from "./vendor/three.module.js";
import { CHECKPOINTS } from "./simulation.js";
const material = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
export class SceneView {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#526778");
    this.scene.fog = new THREE.FogExp2("#526778", 0.0032);
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
    this.camera = new THREE.PerspectiveCamera(56, 1, 0.2, 1500);
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
    this.buildCity();
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
  buildCity() {
    const road = material("#293846"),
      concrete = material("#71818b"),
      line = material("#d2d0b4"),
      dark = material("#253441");
    this.roadMaterial = road;
    this.buildingMaterials = [];
    this.box(1100, 0.3, 1100, material("#33414a"), 0, -0.6, 0);
    for (let i = -3; i <= 3; i++) {
      this.box(30, 0.12, 1010, road, i * 140, -0.05, 0);
      this.box(1010, 0.12, 30, road, 0, -0.045, i * 140);
      for (let j = -480; j < 500; j += 14) {
        if (Math.abs(j / 140 - Math.round(j / 140)) * 140 > 19) {
          this.box(0.16, 0.015, 6, line, i * 140, 0.03, j);
          this.box(6, 0.015, 0.16, line, j, 0.035, i * 140);
        }
      }
    }
    let seed = 12;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let gx = -3; gx < 3; gx++)
      for (let gz = -3; gz < 3; gz++) {
        const cx = gx * 140 + 70,
          cz = gz * 140 + 70;
        this.box(106, 0.5, 106, concrete, cx, 0, cz);
        for (let a = 0; a < 2; a++)
          for (let b = 0; b < 2; b++) {
            const w = 36 + rand() * 9,
              d = 36 + rand() * 9,
              h = 18 + rand() * 75;
            const x = cx + (a - 0.5) * 51,
              z = cz + (b - 0.5) * 51;
            const m = material(
              new THREE.Color().setHSL(0.59, 0.14, 0.18 + rand() * 0.15),
            );
            this.buildingMaterials.push(m);
            this.box(w, h, d, m, x, h / 2 + 0.3, z);
            this.box(w + 1, 0.7, d + 1, dark, x, h + 0.8, z);
            const wm = material("#dce2c7", {
              emissive: "#cbb688",
              emissiveIntensity: 0.55,
            });
            const count = Math.floor(h / 4.7) * Math.floor(w / 5) * 2;
            const geo = new THREE.BoxGeometry(1.65, 2.1, 0.08);
            const windows = new THREE.InstancedMesh(geo, wm, count);
            let n = 0;
            const matrix = new THREE.Matrix4();
            for (let y = 3; y < h - 2; y += 4.7)
              for (let xx = -w / 2 + 3; xx < w / 2 - 2; xx += 5) {
                if (rand() > 0.32) {
                  matrix.makeTranslation(x + xx, y, z - d / 2 - 0.05);
                  windows.setMatrixAt(n++, matrix);
                  matrix.makeTranslation(x + xx, y, z + d / 2 + 0.05);
                  windows.setMatrixAt(n++, matrix);
                }
              }
            windows.count = n;
            this.scene.add(windows);
            this.box(w * 0.35, 3, d * 0.32, dark, x + 4, h + 2, z);
          }
      }
    const lamp = material("#303d45"),
      glow = material("#fff0c9", { emissive: "#ffdaa0", emissiveIntensity: 3 });
    for (let g = -2; g <= 2; g++)
      for (let z = -390; z < 420; z += 52) {
        if (Math.abs(z / 140 - Math.round(z / 140)) * 140 < 20) continue;
        for (const side of [-1, 1]) {
          const x = g * 140 + side * 17;
          this.box(0.3, 9, 0.3, lamp, x, 4.5, z);
          this.box(3, 0.25, 0.35, lamp, x - side * 1.3, 9, z);
          this.box(1.7, 0.12, 0.7, glow, x - side * 2, 8.8, z);
        }
      }
    for (let x = -280; x <= 280; x += 140)
      for (let z = -280; z <= 280; z += 140) {
        for (let p = -11; p <= 11; p += 3) {
          this.box(1.4, 0.015, 4, line, x + p, 0.04, z - 19);
          this.box(4, 0.015, 1.4, line, x - 19, 0.04, z + p);
        }
      }
    for (let i = 0; i < 16; i++) {
      const c = this.makeCar(
        ["#dce0db", "#446274", "#854c44", "#b4ada0"][i % 4],
      );
      c.position.set(i % 2 ? 7 : -7, 0, (i - 7) * 48);
      c.rotation.y = i % 2 ? 0 : Math.PI;
      this.scene.add(c);
    }
  }
  makeCar(color, police = false) {
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
    group.userData.paint = paint;
    group.userData.wheels = wheels;
    return group;
  }
  async loadTextures() {
    const loader = new THREE.TextureLoader();
    const [road, facade, paint] = await Promise.all(
      ["asphalt", "building", "paint"].map((name) =>
        loader.loadAsync("./assets/" + name + ".png"),
      ),
    );
    for (const tex of [road, facade, paint]) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = Math.min(
        8,
        this.renderer.capabilities.getMaxAnisotropy(),
      );
    }
    road.repeat.set(2, 55);
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
        child !== this.gate
      )
        this.scene.remove(child);
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
      const ahead = p.speed < -2 ? -1 : 1;
      const zoom = p.boosting ? 20 : 16;
      const target = new THREE.Vector3(
        p.x - Math.sin(p.angle) * zoom * ahead,
        8.5,
        p.z - Math.cos(p.angle) * zoom * ahead,
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
        target.x = p.x - Math.sin(p.angle) * 7 * ahead;
        target.z = p.z - Math.cos(p.angle) * 7 * ahead;
        target.y = 12;
      }
      this.camera.position.lerp(target, 1 - Math.exp(-dt * 5));
      this.cameraLook.lerp(
        new THREE.Vector3(
          p.x + Math.sin(p.angle) * 10,
          1.5,
          p.z + Math.cos(p.angle) * 10,
        ),
        1 - Math.exp(-dt * 8),
      );
      this.camera.lookAt(this.cameraLook);
      this.camera.fov +=
        (p.boosting ? 65 - this.camera.fov : 56 - this.camera.fov) *
        Math.min(dt * 3, 1);
      this.camera.updateProjectionMatrix();
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
    this.renderer.render(this.scene, this.camera);
  }
}
