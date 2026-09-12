import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../dist/vendor/three.module.js";
import {
  lightingAt,
  nearestLamps,
  CityLighting,
  LOCAL_LIGHT_LIMIT,
  LAMP_EFFECT_LIMIT,
} from "../dist/city-lighting.js";

test("lighting completes night, dawn, noon and dusk in exactly three minutes", () => {
  assert.equal(lightingAt(0).label, "NIGHT");
  assert.equal(lightingAt(150).label, "NIGHT");
  assert.equal(lightingAt(50).label, "DAY");
  assert.equal(lightingAt(75).label, "NOON");
  assert.equal(lightingAt(115).label, "DUSK");
  assert.equal(lightingAt(25).label, "DAWN");
  for (let t = 0; t < 1200; t += 0.5) {
    const s = lightingAt(t);
    assert(s.night >= 0 && s.night <= 1 && s.lamps >= 0 && s.lamps <= 1);
    assert(Math.abs(s.night - lightingAt(t - 0.001).night) < 0.001);
    assert.deepEqual(s, lightingAt(t + 180));
  }
  assert.equal(lightingAt(999, "night").night, 1);
  assert.equal(lightingAt(999, "day").lamps, 0);
  assert.equal(lightingAt(999, "dusk").label, "DUSK");
});

test("street lighting chooses only nearby intact lamps and has a fixed effect budget", () => {
  const lamps = Array.from({ length: 200 }, (_, i) => ({
    propId: i,
    position: new THREE.Vector3(i * 2, 8, 0),
  }));
  const poles = lamps.map((_, i) => ({ broken: i % 3 === 0 }));
  const near = nearestLamps(lamps, { x: 0, z: 0 }, poles);
  assert.equal(near.length, LAMP_EFFECT_LIMIT);
  assert(near.every((l) => !poles[l.propId].broken && l.position.x < 245));
  assert.equal(near[0].propId, 1);
  assert.deepEqual(nearestLamps(lamps, { x: 10000, z: 0 }, poles), []);
});

test("broken lamp illumination cuts out in the same frame; rewind restores it without new lights", () => {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2();
  const player = new THREE.Group();
  player.userData.headlights = [new THREE.SpotLight()];
  const heads = [0, 20].map((x) => {
    const head = new THREE.Group();
    head.position.set(x, 8, 0);
    scene.add(head);
    return head;
  });
  const view = {
    scene,
    player,
    camera: new THREE.PerspectiveCamera(),
    daylightHDR: new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 255]),
      1,
      1,
    ),
    sun: new THREE.DirectionalLight(),
    hemisphere: new THREE.HemisphereLight(),
    buildingMaterials: [],
    streetLamps: heads.map((head, propId) => ({ head, propId })),
  };
  const lighting = new CityLighting(view);
  const sim = {
    time: 1,
    player: { x: 0, z: 0, health: 100 },
    poles: [{ broken: false }, { broken: false }],
  };
  lighting.setMode("night");
  lighting.update(sim);
  const count = scene.children.length;
  assert.equal(lighting.local.length, LOCAL_LIGHT_LIMIT);
  assert(lighting.local.every((l) => !l.castShadow));
  assert.equal(lighting.halos.count, 2);
  assert(lighting.local[0].intensity > 0);
  sim.poles[0].broken = true;
  lighting.update(sim);
  assert.equal(heads[0].visible, false);
  assert.equal(lighting.halos.count, 1);
  assert.equal(lighting.local[0].position.x, 20);
  sim.time = 0.5;
  sim.poles[0].broken = false;
  lighting.update(sim);
  assert.equal(heads[0].visible, true);
  assert.equal(lighting.halos.count, 2);
  for (let i = 0; i < 240; i++) {
    sim.time += 1 / 60;
    lighting.update(sim);
  }
  assert.equal(scene.children.length, count);
  lighting.setMode("day");
  lighting.update(sim);
  assert.equal(lighting.halos.visible, false);
  assert(lighting.local.every((l) => l.intensity === 0));
  sim.player.health = 0;
  lighting.setMode("night");
  lighting.update(sim);
  assert.equal(player.userData.headlights[0].intensity, 0);
});
