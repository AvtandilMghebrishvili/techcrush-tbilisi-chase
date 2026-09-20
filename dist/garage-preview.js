import * as THREE from "./vendor/three.module.js";
import { sportsCar } from "./sports-car.js";
import { makeOriginalSportsCar } from "./car-models.js";
import { carSpec } from "./config.js";
import { paintColor, box, metal } from "./customization.js";
import { makePartModel } from "./workshop-parts.js";
import { disposeGroup } from "./effects.js";
import { FrameLoop } from "./frame-loop.js";
import { releaseResources } from "./resource-lifetime.js";
import { positionCockpitCamera } from "./cockpit-view.js";
import { makeBatFins } from "./batmobile.js";

export class GaragePreview {
  constructor(host, source) {
    this.host = host;
    this.source = source;
    this.signature = "";
    this.cache = new Map();
    this.yaw = 0.7;
    this.pitch = 0.28;
    this.zoom = 6.7;
    this.mode = "exterior";
    this.loop = new FrameLoop(() => {
      this.tick();
      return false;
    });
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, source.budget?.low ? 1 : 1.5),
    );
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D preview of your selected car. Drag to rotate.",
    );
    this.renderer.domElement.setAttribute("role", "img");
    host.prepend(this.renderer.domElement);
    this.scene = this.studio();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
    this.photoScene = this.studio();
    this.photoCamera = new THREE.PerspectiveCamera(36, 1, 0.05, 50);
    const podium = new THREE.Mesh(
      new THREE.CylinderGeometry(3.5, 3.6, 0.1, 96),
      metal("#202631", 0.5),
    );
    podium.position.y = -0.085;
    this.scene.add(podium);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(3.42, 0.018, 8, 96),
      new THREE.MeshBasicMaterial({ color: "#fa234c" }),
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -0.027;
    this.scene.add(halo);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.visibility = () => {
      this.loop.setEnabled(this.active && !document.hidden);
      this.loop.invalidate();
    };
    document.addEventListener("visibilitychange", this.visibility);
    const c = this.renderer.domElement;
    this.pointers = new Map();
    c.onpointerdown = (e) => {
      e.preventDefault();
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.pinch = this.pinchDistance();
      this.drag = { x: e.clientX, y: e.clientY };
      c.setPointerCapture(e.pointerId);
    };
    c.onpointermove = (e) => {
      if (!this.drag || !this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pinch = this.pinchDistance();
      if (pinch && this.pinch) {
        this.zoom = THREE.MathUtils.clamp(
          (this.zoom * this.pinch) / pinch,
          5.6,
          10,
        );
        this.pinch = pinch;
        this.drag = { x: e.clientX, y: e.clientY };
        this.loop.invalidate();
        return;
      }
      this.mode = "exterior";
      this.yaw -= (e.clientX - this.drag.x) * 0.009;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch + (e.clientY - this.drag.y) * 0.006,
        0.08,
        0.85,
      );
      this.drag = { x: e.clientX, y: e.clientY };
      this.loop.invalidate();
    };
    c.onpointerup =
      c.onpointercancel =
      c.onlostpointercapture =
        (e) => {
          this.pointers.delete(e.pointerId);
          this.pinch = this.pinchDistance();
          this.drag = this.pointers.size
            ? [...this.pointers.values()][0]
            : null;
        };
    c.onwheel = (e) => {
      e.preventDefault();
      this.zoom = THREE.MathUtils.clamp(this.zoom + e.deltaY * 0.004, 5.6, 10);
      this.loop.invalidate();
    };
    this.resize();
  }
  pinchDistance() {
    if (this.pointers.size < 2) return 0;
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  studio() {
    const scene = new THREE.Scene();
    // Share the source HDR pixels; render-target PMREM textures belong to their renderer.
    if (this.source.daylightHDR?.isTexture)
      scene.environment = this.source.daylightHDR;
    else if (this.source.scene.background?.isTexture)
      scene.environment = this.source.scene.background;
    scene.environmentIntensity = 0.8;
    scene.add(new THREE.HemisphereLight("#dcecff", "#34303a", 0.8));
    for (const [color, intensity, pos] of [
      ["#fff2e4", 2, [3, 5, 5]],
      ["#91b8ff", 1.2, [-4, 3, -3]],
      ["#ffffff", 1, [0, 4, -4]],
    ]) {
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(...pos);
      scene.add(light);
    }
    return scene;
  }
  setCar(id, equipment) {
    const signature = JSON.stringify([id, equipment]);
    if (signature === this.signature) return;
    this.signature = signature;
    const spec = carSpec(id),
      color = paintColor(equipment, spec.color);
    if (this.car) disposeGroup(this.scene, this.car);
    this.car =
      id === "classic"
        ? sportsCar(this.source, color, false, id, equipment)
        : makeOriginalSportsCar(id, color, equipment);
    this.scene.add(this.car);
    this.car.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this.car);
    this.carCenter = bounds.getCenter(new THREE.Vector3());
    this.fitCorners = [];
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z])
          this.fitCorners.push(new THREE.Vector3(x, y, z).sub(this.carCenter));
    this.carId = id;
    if (this.car.userData.glass) this.car.userData.glass.opacity = 0.55;
    for (const l of this.car.userData.headlights || []) l.intensity = 0;
    this.loop.invalidate();
  }
  angle(mode) {
    this.mode = mode;
    if (mode === "front") {
      this.yaw = 0.7;
      this.pitch = 0.25;
      this.zoom = 6.7;
    }
    if (mode === "rear") {
      this.yaw = 2.4;
      this.pitch = 0.25;
      this.zoom = 6.7;
    }
    if (mode === "wheels") {
      this.yaw = 1.3;
      this.pitch = 0.16;
      this.zoom = 5.6;
    }
    this.loop.invalidate();
  }
  start() {
    if (this.disposed || this.active) return;
    this.active = true;
    this.loop.setEnabled(!document.hidden);
    this.resize();
    this.loop.invalidate();
  }
  stop() {
    this.active = false;
    this.loop.setEnabled(false);
    this.drag = null;
    this.pointers.clear();
    this.pinch = 0;
  }
  resize() {
    if (this.disposed) return;
    const r = this.host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.renderer.setSize(r.width, r.height);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
    this.loop.invalidate();
  }
  tick = () => {
    if (!this.active) return;
    if (this.car) {
      if (this.mode === "cabin") {
        if (this.car.userData.glass) this.car.userData.glass.opacity = 0.13;
        positionCockpitCamera(this.camera, this.car);
      } else {
        this.camera.up.set(0, 1, 0);
        if (this.car.userData.glass) this.car.userData.glass.opacity = 0.55;
        // Fit each model and its installed aero at the current angle/aspect.
        // Eight cached corners also handle long pickups in narrow desktop panes.
        const direction = new THREE.Vector3(
          Math.sin(this.yaw),
          this.pitch,
          Math.cos(this.yaw),
        ).normalize();
        const right = new THREE.Vector3(
          direction.z,
          0,
          -direction.x,
        ).normalize();
        const up = direction.clone().cross(right);
        const tanV = Math.tan((19 * Math.PI) / 180),
          tanH = tanV * this.camera.aspect;
        let fit = 1;
        for (const corner of this.fitCorners)
          fit = Math.max(
            fit,
            corner.dot(direction) +
              Math.max(
                Math.abs(corner.dot(right)) / tanH,
                Math.abs(corner.dot(up)) / tanV,
              ),
          );
        this.camera.position
          .copy(this.carCenter)
          .addScaledVector(direction, (fit * 1.12 * this.zoom) / 6.7);
        this.camera.lookAt(this.carCenter);
        this.camera.fov = 38;
      }
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
    }
  };
  artwork(id, tier) {
    if (this.disposed) return "";
    const batFins = this.carId === "batmobile" && id === "spoiler";
    const key = `${batFins ? "bat-fins" : id}:${tier}`;
    if (this.cache.has(key)) {
      const url = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, url);
      return url;
    }
    const part = batFins ? makeBatFins(tier) : makePartModel(id, tier);
    part.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(part),
      center = bounds.getCenter(new THREE.Vector3()),
      size = bounds.getSize(new THREE.Vector3());
    part.position.sub(center);
    this.photoScene.add(part);
    const reach = Math.max(size.x, size.y, size.z) * 2.25;
    this.photoCamera.position.set(reach * 0.65, reach * 0.5, reach);
    this.photoCamera.lookAt(0, 0, 0);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(320, 280, false);
    this.renderer.render(this.photoScene, this.photoCamera);
    const url = this.renderer.domElement.toDataURL("image/png");
    this.cache.set(key, url);
    // Enough for the visible cards and recent rewards; never retain every tier.
    while (this.cache.size > 32)
      this.cache.delete(this.cache.keys().next().value);
    disposeGroup(this.photoScene, part);
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, this.source.budget?.low ? 1 : 1.5),
    );
    this.resize();
    return url;
  }
  hydrate(container) {
    if (this.disposed || document.hidden) return;
    for (const node of container.querySelectorAll("[data-art-part]")) {
      const url = this.artwork(
        node.dataset.artPart,
        Number(node.dataset.artTier),
      );
      node.style.backgroundImage = `url("${url}")`;
      node.classList.add("rendered-part");
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.observer.disconnect();
    document.removeEventListener("visibilitychange", this.visibility);
    releaseResources([this.scene, this.photoScene], new WeakSet(), {
      preserveShared: true,
      protectedTextures: [this.source.daylightHDR, this.source.carAO],
    });
    this.cache.clear();
    this.scene.clear();
    this.photoScene.clear();
    this.scene.environment = this.photoScene.environment = null;
    this.car = this.source = null;
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
