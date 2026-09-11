import * as THREE from "./vendor/three.module.js";
import { sportsCar } from "./sports-car.js";
import { makeOriginalSportsCar } from "./car-models.js";
import { carSpec } from "./config.js";
import { paintColor, box, metal } from "./customization.js";
import { makePartModel } from "./workshop-parts.js";
import { disposeGroup } from "./effects.js";

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
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
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
    const c = this.renderer.domElement;
    c.onpointerdown = (e) => {
      this.drag = { x: e.clientX, y: e.clientY };
      c.setPointerCapture(e.pointerId);
    };
    c.onpointermove = (e) => {
      if (!this.drag) return;
      this.mode = "exterior";
      this.yaw -= (e.clientX - this.drag.x) * 0.009;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch + (e.clientY - this.drag.y) * 0.006,
        0.08,
        0.85,
      );
      this.drag = { x: e.clientX, y: e.clientY };
    };
    c.onpointerup = c.onpointercancel = () => (this.drag = null);
    c.onwheel = (e) => {
      e.preventDefault();
      this.zoom = THREE.MathUtils.clamp(this.zoom + e.deltaY * 0.004, 5.6, 10);
    };
    this.resize();
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
    this.carId = id;
    if (this.car.userData.glass) this.car.userData.glass.opacity = 0.55;
    for (const l of this.car.userData.headlights || []) l.intensity = 0;
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
  }
  start() {
    if (this.active) return;
    this.active = true;
    this.resize();
    this.tick();
  }
  stop() {
    this.active = false;
    cancelAnimationFrame(this.frame);
    this.drag = null;
  }
  resize() {
    const r = this.host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.renderer.setSize(r.width, r.height);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
  }
  tick = () => {
    if (!this.active) return;
    if (this.car) {
      if (this.mode === "cabin") {
        if (this.car.userData.glass) this.car.userData.glass.opacity = 0.13;
        const s = this.car.userData.cockpitSeat;
        this.camera.position.set(s.x, s.y, s.z);
        this.camera.lookAt(s.x, s.y - 0.08, 4);
        this.camera.fov = 76;
      } else {
        if (this.car.userData.glass) this.car.userData.glass.opacity = 0.55;
        this.camera.position.set(
          Math.sin(this.yaw) * this.zoom,
          1 + this.zoom * this.pitch,
          Math.cos(this.yaw) * this.zoom,
        );
        this.camera.lookAt(0, 0.6, 0);
        this.camera.fov = 38;
      }
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
    }
    this.frame = requestAnimationFrame(this.tick);
  };
  artwork(id, tier) {
    const key = `${id}:${tier}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const part = makePartModel(id, tier);
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
    disposeGroup(this.photoScene, part);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.resize();
    return url;
  }
  hydrate(container) {
    for (const node of container.querySelectorAll("[data-art-part]")) {
      const url = this.artwork(
        node.dataset.artPart,
        Number(node.dataset.artTier),
      );
      node.style.backgroundImage = `url("${url}")`;
      node.classList.add("rendered-part");
    }
  }
}
