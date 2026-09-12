import { levelCondition } from "./level-conditions.js";
import { CityWeather } from "./city-weather.js";
import * as THREE from "./vendor/three.module.js";

export const LIGHTING_MODES = ["auto", "night", "day", "dusk"];
export const LOCAL_LIGHT_LIMIT = 3;
export const LAMP_EFFECT_LIMIT = 64;
const smooth = (a, b, n) => THREE.MathUtils.smoothstep(n, a, b);
export const DAY_CYCLE_SECONDS = 180;
const cycle = [
  [0, 1],
  [25, 0.45],
  [50, 0],
  [85, 0],
  [115, 0.4],
  [145, 1],
  [180, 1],
];

// Simulation time makes pause, recovery and the five-second rewind coherent.
export function lightingAt(time, mode = "auto") {
  let night = mode === "night" ? 1 : mode === "dusk" ? 0.64 : 0;
  const t =
    ((time % DAY_CYCLE_SECONDS) + DAY_CYCLE_SECONDS) % DAY_CYCLE_SECONDS;
  if (mode === "auto") {
    for (let i = 1; i < cycle.length; i++) {
      const [end, b] = cycle[i],
        [start, a] = cycle[i - 1];
      if (t <= end) {
        night = THREE.MathUtils.lerp(a, b, smooth(start, end, t));
        break;
      }
    }
  }
  return {
    night,
    lamps: smooth(0.24, 0.72, night),
    label:
      night > 0.83
        ? "NIGHT"
        : mode === "auto" && t >= 10 && t < 50
          ? "DAWN"
          : night > 0.22
            ? "DUSK"
            : mode === "auto" && t >= 60 && t <= 85
              ? "NOON"
              : "DAY",
  };
}

export function nearestLamps(
  lamps,
  player,
  poles = [],
  limit = LAMP_EFFECT_LIMIT,
) {
  return lamps
    .filter((l) => !poles[l.propId]?.broken)
    .map((l) => ({
      lamp: l,
      distance: Math.hypot(l.position.x - player.x, l.position.z - player.z),
    }))
    .filter((l) => l.distance < 245)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((l) => l.lamp);
}

function glowTexture() {
  const size = 64,
    pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(
          ((x + 0.5) / size) * 2 - 1,
          ((y + 0.5) / size) * 2 - 1,
        ),
        i = (y * size + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
      pixels[i + 3] = Math.round(255 * Math.max(0, 1 - r) ** 2.8);
    }
  const t = new THREE.DataTexture(pixels, size, size);
  t.needsUpdate = true;
  t.magFilter = t.minFilter = THREE.LinearFilter;
  return t;
}

// Derive emission only inside the actual dark window panes of the existing
// facade texture. Stonework, frames and unoccupied rooms remain unlit.
export function windowGlow(image, variant = 0) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, 512, 512);
  const data = ctx.getImageData(0, 0, 512, 512),
    d = data.data;
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      const i = (y * 512 + x) * 4,
        sx = x * 2,
        sy = y * 2,
        col = Math.floor(sx / 205),
        row = Math.floor(sy / 256);
      const u = sx % 205,
        w = sy % 256,
        l = (d[i] + d[i + 1] + d[i + 2]) / 765;
      const occupied = (col * 13 + row * 7 + variant * 3) % 10 < 6;
      const pane =
        occupied &&
        u > 48 &&
        u < 123 &&
        w > 58 &&
        w < 195 &&
        l > 0.07 &&
        l < 0.39 &&
        d[i + 2] > d[i] * 0.83;
      const brightness = pane ? Math.min(1, 0.34 + l * 1.65) : 0;
      d[i] = 255 * brightness;
      d[i + 1] = (variant % 2 ? 164 : 190) * brightness;
      d[i + 2] = (variant % 2 ? 89 : 120) * brightness;
      d[i + 3] = 255;
    }
  ctx.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function skyMaterial(dayMap) {
  return new THREE.ShaderMaterial({
    uniforms: { dayMap: { value: dayMap }, night: { value: 0.45 } },
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    vertexShader: `varying vec2 vUv;varying vec3 vDirection;
      void main(){vUv=uv;vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D dayMap;uniform float night;varying vec2 vUv;varying vec3 vDirection;
      void main(){
        vec3 dir=normalize(vDirection);
        vec3 day=texture2D(dayMap,vUv).rgb*.62;
        float horizon=pow(1.-max(0.,dir.y),4.);
        float dusk=sin(night*3.14159265);
        vec3 color=mix(day,vec3(.006,.012,.033)+horizon*vec3(.033,.021,.039),night);
        color+=dusk*horizon*vec3(.22,.052,.018);
        float clouds=clamp(dot(day,vec3(.21,.72,.07)),0.,1.);
        color+=vec3(.016,.020,.037)*clouds*night;
        vec3 moonDir=normalize(vec3(.87,.20,-.28));
        float md=length(dir-moonDir);
        float disc=1.-smoothstep(.019,.0205,md);
        float craters=.5+.5*sin(dir.x*1870.)*sin(dir.z*1330.);
        color+=vec3(.18,.24,.38)*exp(-md*65.)*night;
        color+=vec3(1.6,1.7,1.8)*disc*(.78+.22*craters)*smoothstep(.25,.9,night);
        vec2 cell=floor(vUv*vec2(1500.,700.));
        float star=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
        float point=pow(max(0.,1.-length(fract(vUv*vec2(1500.,700.))-.5)*2.),3.);
        color+=step(.9987,star)*point*vec3(.4,.48,.7)*smoothstep(.65,1.,night)*smoothstep(.03,.3,dir.y);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export class CityLighting {
  constructor(view) {
    this.view = view;
    this.mode = "auto";
    this.level = lightingAt(0);
    this.weather = new CityWeather(view.scene);
    this.near = [];
    this.refreshAt = -1;
    this.dayMap = view.daylightHDR || view.scene.background;
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(2200, 32, 16),
      skyMaterial(this.dayMap),
    );
    this.sky.renderOrder = -1000;
    this.sky.frustumCulled = false;
    this.sky.userData.environment = true;
    view.scene.background = null;
    view.scene.add(this.sky);
    view.scene.updateMatrixWorld(true);
    this.lamps = (view.streetLamps || []).map((l) => ({
      ...l,
      position: l.head.getWorldPosition(new THREE.Vector3()),
    }));
    const texture = glowTexture();
    const basic = (opacity) =>
      new THREE.MeshBasicMaterial({
        map: texture,
        color: "#ffda9a",
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
    this.halos = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1.9, 1.9),
      basic(0.8),
      LAMP_EFFECT_LIMIT,
    );
    this.pools = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(22, 22),
      basic(0.2),
      LAMP_EFFECT_LIMIT,
    );
    for (const mesh of [this.halos, this.pools]) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.userData.environment = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      view.scene.add(mesh);
    }
    this.local = Array.from({ length: LOCAL_LIGHT_LIMIT }, () => {
      const light = new THREE.PointLight("#ffcb8b", 0, 27, 2);
      light.castShadow = false;
      view.scene.add(light);
      return light;
    });
    this.matrix = new THREE.Object3D();
    this.daySun = new THREE.Color("#fff3d9");
    this.duskSun = new THREE.Color("#ffa86e");
    this.nightSun = new THREE.Color("#9dbbff");
    this.dayFog = new THREE.Color("#b8c1c5");
    this.nightFog = new THREE.Color("#172239");
    this.dayAmbient = new THREE.Color("#dce8f3");
    this.nightAmbient = new THREE.Color("#a9bded");
  }
  setMode(mode) {
    if (LIGHTING_MODES.includes(mode)) this.mode = mode;
    return this.mode;
  }
  update(sim) {
    this.weather.update(sim, this.mode);
    if (!this.condition || this.conditionLevel !== sim.level) {
      this.conditionLevel = sim.level;
      this.condition = levelCondition(sim.level);
    }
    const v = this.view,
      state = (this.level = lightingAt(
        sim.time + this.condition.offset,
        this.mode,
      )),
      n = state.night;
    this.sky.position.copy(v.camera.position);
    this.sky.material.uniforms.night.value = n;
    v.sun.color
      .copy(this.daySun)
      .lerp(this.duskSun, Math.sin(n * Math.PI))
      .lerp(this.nightSun, n * n);
    v.sun.intensity = THREE.MathUtils.lerp(2.3, 0.3, n);
    v.hemisphere.intensity = THREE.MathUtils.lerp(0.75, 0.32, n);
    v.hemisphere.color.copy(this.dayAmbient).lerp(this.nightAmbient, n);
    v.scene.environmentIntensity = THREE.MathUtils.lerp(0.85, 0.16, n);
    v.scene.fog.color.copy(this.dayFog).lerp(this.nightFog, n);
    v.scene.fog.density = THREE.MathUtils.lerp(0.00052, 0.00072, n);
    for (const m of v.buildingMaterials)
      m.emissiveIntensity = state.lamps * 1.5;
    for (const m of v.nightWindowMaterials || [])
      m.emissiveIntensity = state.lamps * 0.9;
    for (const m of v.streetLampMaterials || [])
      m.emissiveIntensity = 0.08 + state.lamps * 3;
    for (const lamp of this.lamps)
      lamp.head.visible = !sim.poles?.[lamp.propId]?.broken;
    for (const l of v.player.userData.headlights || []) {
      l.intensity = THREE.MathUtils.lerp(16, 145, n);
      l.distance = 52;
    }
    if (sim.player.health <= 0)
      for (const l of v.player.userData.headlights || []) l.intensity = 0;
    if (
      sim.time >= this.refreshAt ||
      sim.time < this.refreshAt - 0.3 ||
      this.lastMode !== this.mode
    ) {
      this.near = nearestLamps(this.lamps, sim.player, sim.poles);
      this.refreshAt = sim.time + 0.15;
      this.lastMode = this.mode;
    }
    const live = this.near.filter((l) => !sim.poles?.[l.propId]?.broken);
    const active = state.lamps > 0.001;
    this.halos.visible = this.pools.visible = active;
    if (active) {
      this.halos.material.opacity = 0.9 * state.lamps;
      this.pools.material.opacity = 0.22 * state.lamps;
      live.forEach((lamp, i) => {
        this.matrix.position.copy(lamp.position);
        this.matrix.quaternion.copy(v.camera.quaternion);
        this.matrix.scale.setScalar(1);
        this.matrix.updateMatrix();
        this.halos.setMatrixAt(i, this.matrix.matrix);
        this.matrix.position.set(lamp.position.x, 0.115, lamp.position.z);
        this.matrix.rotation.set(-Math.PI / 2, 0, 0);
        this.matrix.updateMatrix();
        this.pools.setMatrixAt(i, this.matrix.matrix);
      });
      this.halos.count = this.pools.count = live.length;
      this.halos.instanceMatrix.needsUpdate =
        this.pools.instanceMatrix.needsUpdate = true;
    }
    this.local.forEach((light, i) => {
      const lamp = live[i],
        d = lamp
          ? Math.hypot(
              lamp.position.x - sim.player.x,
              lamp.position.z - sim.player.z,
            )
          : 100;
      if (lamp) light.position.copy(lamp.position);
      light.intensity = state.lamps * 220 * (1 - smooth(32, 68, d));
    });
  }
}
