import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as THREE from "../dist/vendor/three.module.js";
import { batchStatic } from "../dist/expansion-visuals.js";
import { releaseResources } from "../dist/resource-lifetime.js";

for (const city of ["tbilisi", "kutaisi", "batumi", "rustavi"])
  test(
    city +
      " has three reachable roof rewards, safe approaches and persistent powerup markers",
    () => {
      execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `
 globalThis.location={href:'http://local/?map=${city}'};
 const assert=(await import('node:assert/strict')).default;
 const {ChaseSimulation,vehicle}=await import('./dist/simulation.js');
 const {ROOFTOP_QUESTS,roofAt}=await import('./dist/world-sites.js');
 const {availablePowerups,powerupIconSVG}=await import('./dist/powerup-map.js');
 const {navigationTarget,questRouteId,playerRoute}=await import('./dist/navigation-cache.js');
 const {overOpenWater,indexedPolygons,onIndexedSurface}=await import('./dist/surface-support.js');
 const {ROAD_SURFACE}=await import('./dist/road-surface-data.js');
 const asphalt=indexedPolygons(ROAD_SURFACE.asphalt),onAsphalt=p=>onIndexedSurface(asphalt,p);
 const {BUILDINGS,containsPoint,nearestRoad}=await import('./dist/city-map.js');
 const {STUNT_REWARDS}=await import('./dist/community-rules.js');
 const {RELEASED_EVENT_SITES}=await import('./dist/released-event-sites.js');
 assert.equal(ROOFTOP_QUESTS.length,3);
 for(const q of ROOFTOP_QUESTS){
   assert.equal(roofAt(q.box),q.roof);
   assert.equal(STUNT_REWARDS[q.roof.id].map||'tbilisi','${city}');
   const r=q.ramp;
   const approach=speed=>{const s=new ChaseSimulation();s.start('suv');s.police=[];s.traffic=[];s.nextWaveAt=Infinity;
     Object.assign(s.player,{x:r.x-Math.sin(r.angle)*(r.length/2+5),z:r.z-Math.cos(r.angle)*(r.length/2+5),angle:r.angle,vx:Math.sin(r.angle)*speed,vz:Math.cos(r.angle)*speed,speed});return s;};
   const s=approach(55);
   assert(!overOpenWater(s.player));assert(onAsphalt(s.player),'apron must be paved');
   assert(!BUILDINGS.some(b=>containsPoint(b,s.player.x,s.player.z,2)),'run-up blocked');
   s.navQuest=questRouteId(r);assert(playerRoute(s).length>0);
   let air=false;
   for(let i=0;i<700&&!s.runQuests.length;i++){s.update(1/120,{throttle:s.player.airborne?0:1});air||=s.player.airborne;if(s.player.airborne)assert.equal(navigationTarget(s).x,q.box.x);}
   assert(air,q.roof.id+' failed to launch');assert.deepEqual(s.runQuests,[q.roof.id],q.roof.id+' failed landing/collection at '+JSON.stringify({x:s.player.x,z:s.player.z,y:s.player.y,health:s.player.health}));
   assert.equal(s.player.y,q.roof.h);
   s.timeline.restore(s,0);assert.equal(s.runQuests.length,0);
   const slow=approach(14);for(let i=0;i<600;i++)slow.update(1/120,{throttle:slow.player.airborne?0:.25});assert.equal(slow.runQuests.length,0);
   const saved=approach(55);saved.runOptions.completedQuests=[q.roof.id];for(let i=0;i<700;i++)saved.update(1/120,{throttle:saved.player.airborne?0:1});assert.equal(saved.runQuests.length,0,'saved reward must not duplicate');
 }
 const sim=new ChaseSimulation();sim.start();
 for(const [level,n] of [[1,1],[4,1],[5,2],[9,2],[10,3],[99,3]]){sim.level=level;assert.equal(availablePowerups(sim).filter(p=>p.kind==='gear').length,n);assert.equal(availablePowerups(sim).filter(p=>p.kind==='grex').length,3);}
 const gear=availablePowerups(sim).find(p=>p.kind==='gear'),dino=availablePowerups(sim).find(p=>p.kind==='grex');
 sim.gearRepairs.push({id:gear.id});sim.grexTriggers.push({id:dino.id});assert.equal(availablePowerups(sim).length,4);
 for(const kind of ['gear','grex'])assert(powerupIconSVG(kind).includes('<svg'));
 for(const p of RELEASED_EVENT_SITES['${city}']){const r=nearestRoad(p);for(let t=0;t<=1;t+=.1)assert(!BUILDINGS.some(b=>containsPoint(b,p.x+(r.x-p.x)*t,p.z+(r.z-p.z)*t,1)),'released artifact access blocked');}
 `,
        ],
        { cwd: new URL("..", import.meta.url), stdio: "pipe" },
      );
    },
  );

test("static batches preserve world placement, shadows, UVs and dynamic instances with bounded resource ownership", () => {
  const root = new THREE.Group();
  root.position.set(1700, 0, -1300);
  root.rotation.y = 0.3;
  const mat = new THREE.MeshStandardMaterial();
  const a = new THREE.Mesh(new THREE.BoxGeometry(3, 12, 4), mat);
  a.position.set(42, 6, 13);
  a.castShadow = true;
  a.receiveShadow = true;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat);
  water.position.set(39, -1, 11);
  water.receiveShadow = true;
  const moving = new THREE.InstancedMesh(new THREE.BoxGeometry(), mat, 2);
  root.add(a, water, moving);
  root.updateMatrixWorld(true);
  const before = new THREE.Box3().setFromObject(a);
  batchStatic(root);
  root.updateMatrixWorld(true);
  assert.equal(moving.parent, root);
  const meshes = root.children.filter((m) => m.isMesh && !m.isInstancedMesh);
  assert.equal(meshes.length, 2);
  const solid = meshes.find((m) => m.castShadow),
    flat = meshes.find((m) => !m.castShadow);
  assert(flat && solid);
  assert.equal(flat.receiveShadow, true);
  const after = new THREE.Box3().setFromObject(solid);
  assert(before.min.distanceTo(after.min) < 0.0001);
  assert(before.max.distanceTo(after.max) < 0.0001);
  let disposed = 0;
  mat.addEventListener("dispose", () => disposed++);
  const released = releaseResources([root]);
  releaseResources([root], released);
  assert.equal(disposed, 1);
});

test("all roof rewards bank together once, without resetting an existing garage", async () => {
  const { newProfile, applyProgressAction } = await import(
    "../dist/progression.js"
  );
  const { STUNT_REWARDS } = await import("../dist/community-rules.js");
  const { MAP_COURSES } = await import("../dist/map-selection.js");
  for (const map of ["tbilisi", "kutaisi", "batumi", "rustavi"]) {
    let p = newProfile();
    p.cars.gt.engine = 3;
    const quests = Object.keys(STUNT_REWARDS).filter(
      (id) => (STUNT_REWARDS[id].map || "tbilisi") === map,
    );
    const begin = (p, id, now) =>
      applyProgressAction(
        p,
        { type: "begin-run", map, car: "classic", course: MAP_COURSES[map] },
        undefined,
        { runId: id, now: Date.UTC(2026, 8, 25) + now },
      );
    const settle = (p, ids, now) =>
      applyProgressAction(
        p,
        {
          type: "settle",
          runId: p.activeRun.id,
          level: p.activeRun.level,
          result: "abandoned",
          metrics: {
            time: 80,
            score: 18000,
            checkpoints: 0,
            takedowns: 0,
            trafficWrecks: 0,
            distance: 2500,
            driftSeconds: 0,
            jumps: 4,
            topSpeed: 250,
            quests: ids,
          },
        },
        undefined,
        { now: Date.UTC(2026, 8, 25) + now },
      );
    p = begin(p, "new-roofs-" + map, 1000);
    assert.throws(() => settle(p, [...quests, quests[0]], 90000), /stunt/);
    p = settle(p, quests, 90000);
    const cash = p.credits,
      boxes = p.platinumBoxes;
    assert.equal(
      boxes,
      quests.reduce((n, id) => n + (STUNT_REWARDS[id].platinum || 0), 0),
    );
    assert.deepEqual(p.quests.completed, quests);
    assert.equal(p.cars.gt.engine, 3);
    p = settle(begin(p, "repeat-roofs-" + map, 91000), quests, 180000);
    assert.equal(p.credits, cash);
    assert.equal(p.platinumBoxes, boxes);
  }
});

test("nearby and radar-edge repair/pulse badges stay separate with exact anchors", async () => {
  const { separatePowerupPins } = await import("../dist/powerup-map.js");
  for (const radius of [Infinity, 88]) {
    const inputs = Array.from({ length: 6 }, (_, id) => ({ id, x: 80, y: id }));
    const pins = separatePowerupPins(inputs, 20, radius);
    for (const [i, p] of pins.entries()) {
      assert.equal(p.anchorX, inputs[i].x);
      assert.equal(p.anchorY, inputs[i].y);
      assert(Math.hypot(p.x, p.y) <= radius);
      for (const q of pins.slice(0, i))
        assert(Math.hypot(p.x - q.x, p.y - q.y) >= 20);
    }
  }
});
