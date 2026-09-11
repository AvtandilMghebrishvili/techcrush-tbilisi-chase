import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../dist/vendor/three.module.js";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { vehicle, ChaseSimulation } from "../dist/simulation.js";
import { vehicleContact } from "../dist/contacts.js";
import {
  freshDamage,
  dentVehicle,
  repairBody,
  EXPLOSION_LIFETIME,
  IMPACT_LIFETIME,
} from "../dist/damage-state.js";
import { makeOriginalSportsCar } from "../dist/car-models.js";
import { sportsCar } from "../dist/sports-car.js";
import {
  updateVehicleDamage,
  deformBodyPoint,
} from "../dist/vehicle-damage.js";
import {
  createExplosion,
  animateExplosion,
  createImpactBurst,
  animateImpactBurst,
  disposeGroup,
} from "../dist/effects.js";
const positions = (m) => {
  const a = m.geometry.attributes.position;
  return Array.from({ length: a.count }, (_, i) => [
    a.getX(i),
    a.getY(i),
    a.getZ(i),
  ]).flat();
};

test("dents follow contact normals at every heading, are bounded and do not change handling", () => {
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const p = vehicle(0, 0, angle);
    p.impactNormal = { x: -Math.sin(angle), z: -Math.cos(angle) };
    dentVehicle(p, 40, 0);
    assert(p.damage.front > 0.5);
    assert.equal(p.damage.rear, 0);
    const first = p.damage.front;
    dentVehicle(p, 40, 0.01);
    assert.equal(p.damage.front, first);
    for (let i = 1; i < 20; i++) dentVehicle(p, 40, i);
    assert.equal(p.damage.front, 1);
    assert.equal(p.health, 100);
    assert.equal(p.width, 1.98);
    assert.equal(p.vx, 0);
    p.health = 85;
    repairBody(p, 70);
    assert.equal(p.damage.front, 0.5);
    p.health = 100;
    repairBody(p, 85);
    assert.deepEqual(p.damage, freshDamage());
  }
});
test("new car bodies visibly crumple, fittings follow and wheels/steering remain centered; repair restores exact vertices", () => {
  for (const id of ["gt", "rally", "suv"]) {
    const root = makeOriginalSportsCar(id, "#dd241e"),
      body = root.getObjectByName("body-shell");
    const original = body.geometry.attributes.position.array.slice(),
      wheelPositions = root.userData.wheels.map((w) => w.position.clone()),
      steering = root.userData.steering.rotor.position.clone();
    const lamp = root.userData.headlights[0].position.clone();
    updateVehicleDamage(root, {
      health: 30,
      damage: { front: 0.9, rear: 0.5, left: 0.4, right: 0, roof: 0.3 },
    });
    assert.notDeepEqual(body.geometry.attributes.position.array, original);
    assert(root.userData.headlights[0].position.z < lamp.z - 0.25);
    for (const entry of root.userData.damageView.entries)
      assert(
        entry.mesh.geometry.attributes.position.array.every(Number.isFinite),
      );
    root.userData.wheels.forEach((w, i) =>
      assert(w.position.equals(wheelPositions[i])),
    );
    assert(root.userData.steering.rotor.position.equals(steering));
    assert(root.userData.damageView.lines.some((l) => l.line.visible));
    updateVehicleDamage(root, { health: 100, damage: freshDamage() });
    assert.deepEqual(body.geometry.attributes.position.array, original);
    assert(root.userData.headlights[0].position.equals(lamp));
  }
});
test("the licensed original gets independent geometry on damage without altering its template or another car", async () => {
  const bytes = await readFile(
    new URL("../dist/assets/sports-car.glb", import.meta.url),
  );
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const template = gltf.scene.children[0],
    view = {
      carTemplate: template,
      carTemplateBounds: new THREE.Box3().setFromObject(template),
      carAO: null,
    };
  const a = sportsCar(view, "#ee9922"),
    b = sportsCar(view, "#22aaaa"),
    original = positions(template.getObjectByName("body"));
  updateVehicleDamage(a, {
    health: 20,
    damage: { front: 0.85, rear: 0, left: 0.4, right: 0, roof: 0 },
  });
  const deformed = positions(a.getObjectByName("body"));
  assert.equal(deformed.length, original.length);
  assert.notDeepEqual(deformed, original);
  for (let i = 0; i < original.length; i++)
    assert(
      Math.abs(deformed[i] - original[i]) < 1,
      "Deformation must not corrupt interleaved normals or UV storage",
    );
  assert.deepEqual(positions(template.getObjectByName("body")), original);
  assert.deepEqual(positions(b.getObjectByName("body")), original);
  updateVehicleDamage(a, { health: 100 });
  assert.deepEqual(positions(a.getObjectByName("body")), original);
});
function empty() {
  const s = new ChaseSimulation();
  s.start();
  s.police = [];
  s.traffic = [];
  s.trees = [];
  s.poles = [];
  s.obstacles = [];
  s.ramps = [];
  s.nextWaveAt = Infinity;
  return s;
}
test("real tree collision dents the front and emits same-step fragments; rewind restores both", () => {
  const s = empty(),
    p = s.player;
  p.angle = 0;
  s.trees = [{ id: 0, x: p.x, z: p.z + p.length / 2 + 0.1, radius: 0.4 }];
  s.timeline.frames = [];
  s.timeline.recordAt = 0;
  s.timeline.capture(s);
  p.vz = 20;
  p.speed = 20;
  s.update(1 / 120, {});
  assert(p.damage.front > 0);
  assert(s.impacts.length > 0);
  assert.equal(s.impacts[0].born, s.time);
  assert(s.trees[0].broken);
  s.timeline.restore(s, 0);
  assert.deepEqual(s.player.damage, freshDamage());
  assert.equal(s.impacts.length, 0);
  assert.equal(s.nextImpactId, 1);
  assert(!s.trees[0].broken);
});
test("destroyed vehicles remain solid until replacement, cannot be pushed, and give no repeated wreck rewards", () => {
  const live = vehicle(0, 0),
    wreck = { ...vehicle(0, 4), destroyed: true };
  live.vz = 20;
  const contact = vehicleContact(live, wreck);
  assert(contact.impact > 0);
  assert(live.vz < 1);
  assert.equal(wreck.z, 4);
  assert.equal(wreck.vz, 0);
  const s = empty(),
    p = s.player;
  const cop = s.makePolice(p.x, p.z + 6);
  s.police = [cop];
  cop.health = 1;
  s.damagePolice(cop, 20);
  const score = s.score;
  s.damagePolice(cop, 40);
  assert.equal(s.score, score);
  s.time = cop.respawnAt;
  s.respawnPolice(cop);
  assert(!cop.destroyed);
  assert.deepEqual(cop.damage, freshDamage());
});
test("a player wreck triggers one explosion, and impact history stays bounded and expires", () => {
  const s = empty();
  s.player.health = 0;
  s.update(1 / 120, {});
  assert.equal(s.phase, "wrecked");
  assert.equal(s.explosions.length, 1);
  assert.equal(s.soundEvents.filter((e) => e.kind === "explosion").length, 1);
  s.update(1 / 120, {});
  assert.equal(s.explosions.length, 1);
  const t = empty();
  for (let i = 0; i < 100; i++) t.emitSound("metal", t.player, 30, "hit:" + i);
  assert.equal(t.impacts.length, 24);
  t.time = IMPACT_LIFETIME + 1;
  t.update(1 / 120, {});
  assert.equal(t.impacts.length, 0);
});
test("explosions have soft fire/smoke and metal debris, rewind deterministically, and dispose all transient geometry", () => {
  const scene = new THREE.Scene(),
    fx = createExplosion(scene, { id: 5, x: 0, z: 0, born: 0 });
  animateExplosion(fx, 0.3);
  const first = fx.particles.map((p) => p.mesh.position.toArray());
  assert(fx.particles.some((p) => p.type === "smoke" && p.mesh.isSprite));
  assert(fx.particles.some((p) => p.type === "debris" && p.mesh.isMesh));
  animateExplosion(fx, 1.5);
  assert(!fx.flash.visible);
  assert(fx.particles.some((p) => p.smoke && p.mesh.material.opacity > 0));
  animateExplosion(fx, 0.3);
  assert.deepEqual(
    fx.particles.map((p) => p.mesh.position.toArray()),
    first,
  );
  animateExplosion(fx, EXPLOSION_LIFETIME);
  assert(fx.particles.every((p) => p.mesh.material.opacity === 0));
  const burst = createImpactBurst(scene, {
    id: "hit",
    x: 0,
    z: 0,
    born: 0,
    kind: "wood",
    impact: 20,
  });
  animateImpactBurst(burst, 0.2);
  assert(burst.particles.some((p) => p.mesh.position.length() > 0.1));
  animateImpactBurst(burst, IMPACT_LIFETIME);
  assert(burst.particles.every((p) => p.mesh.material.opacity === 0));
  disposeGroup(scene, fx.group);
  disposeGroup(scene, burst.group);
  assert.equal(scene.children.length, 0);
});
