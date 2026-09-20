import * as THREE from "./vendor/three.module.js";
import { levelHash } from "./level-conditions.js";

export const RAIN_STREAKS = 144;
export function showerAt(time, level = 1, mode = "auto") {
  if (mode !== "auto" || levelHash(level * 43 + 5) > 0.3) return 0;
  const age = time - (38 + Math.floor(levelHash(level * 73) * 45));
  if (age <= 0 || age >= 24) return 0;
  return Math.min(1, age / 3, (24 - age) / 3);
}
export class CityWeather {
  constructor(scene) {
    const positions = new Float32Array(RAIN_STREAKS * 6),
      tips = new Float32Array(RAIN_STREAKS * 2);
    for (let i = 0; i < RAIN_STREAKS; i++) {
      const p = [
        (levelHash(i * 3) - 0.5) * 56,
        levelHash(i * 3 + 1) * 20,
        (levelHash(i * 3 + 2) - 0.5) * 56,
      ];
      positions.set(p, i * 6);
      positions.set(p, i * 6 + 3);
      tips[i * 2 + 1] = 1;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("tip", new THREE.BufferAttribute(tips, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, opacity: { value: 0 } },
      vertexShader: `attribute float tip; uniform float time; varying float edge;
        void main(){vec3 p=position;p.y=3.+mod(p.y-time*22.,20.)-tip*1.25;
        p.x+=tip*.15;edge=1.-smoothstep(18.,28.,length(p.xz));
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: `uniform float opacity; varying float edge;
        void main(){gl_FragColor=vec4(.72,.83,.91,opacity*edge*.55);}`,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.mesh = new THREE.LineSegments(geometry, material);
    this.mesh.userData.environment = true;
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
  update(sim, mode = "auto", detail = 1) {
    const alpha = ["running", "rewinding", "paused"].includes(sim.phase)
      ? showerAt(sim.time, sim.level, mode)
      : 0;
    this.mesh.visible = alpha > 0;
    if (!alpha) return;
    this.mesh.geometry.setDrawRange(
      0,
      Math.max(1, Math.round(RAIN_STREAKS * detail)) * 2,
    );
    this.mesh.position.set(
      sim.player.x,
      Math.max(0, sim.player.y || 0),
      sim.player.z,
    );
    this.mesh.material.uniforms.time.value = sim.time;
    this.mesh.material.uniforms.opacity.value = alpha;
  }
}
