import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

for (const city of ["tbilisi", "kutaisi", "batumi"])
  test(
    city +
      " all five released artifacts are collectible without breaking bridge rails",
    () => {
      const output = execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `
globalThis.location={href:'http://local/?map=${city}'};
const assert=(await import('node:assert/strict')).default;
const THREE=await import('./dist/vendor/three.module.js');
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const {buildSponsorBanners}=await import('./dist/sponsor-banners.js');
const {calibrateRoadsideProps}=await import('./dist/breakable-props.js');
const {ChaseSimulation}=await import('./dist/simulation.js');
const {nearestRoad,routeBetween,START}=await import('./dist/city-map.js');
const {EVENT_ID,ARTIFACT_BANNERS}=await import('./dist/event-rules.js');
const {RELEASED_EVENT_SITES}=await import('./dist/released-event-sites.js');
const v={decor:new THREE.Group(),box:()=>{}};
buildSponsorBanners(v);calibrateRoadsideProps(v);
const defs=v.breakableProps.map(e=>e.definition);
for(const id of ARTIFACT_BANNERS){
 const anchor=defs.find(d=>d.bannerId===id&&d.bannerAnchor),fixed=RELEASED_EVENT_SITES['${city}'].find(d=>d.id===id),r=nearestRoad(anchor);
 assert.equal(anchor.x,fixed.x);assert.equal(anchor.z,fixed.z);assert(routeBetween(START,r).length>1);
 for(const car of ['classic','gt','suv','creator']){
  const sim=new ChaseSimulation();sim.propDefinitions=defs;sim.start(car,{event:EVENT_ID,level:1});sim.police=[];sim.traffic=[];sim.nextWaveAt=Infinity;sim.checkpoints=[];
  const angle=Math.atan2(anchor.x-r.x,anchor.z-r.z);
  Object.assign(sim.player,{x:r.x,z:r.z,y:r.y,angle,vx:Math.sin(angle)*12,vz:Math.cos(angle)*12,speed:12});
  for(let t=0;t<900&&!sim.runArtifacts.includes(id);t++){sim.update(1/120,{throttle:.35});assert(sim.player.waterAt==null,'Water on approach');assert.equal(sim.phase,'running');}
  assert(sim.runArtifacts.includes(id),car+' cannot collect artifact '+id);assert(sim.player.health>90,'Unexpected damage beyond the normal banner impact');
  assert(!sim.obstacles.some(o=>o.bridgeRail&&o.broken),'Collection should not require breaking a bridge rail');
 }
}
console.log('20 successful collections');
`,
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );
      assert.match(output, /20 successful collections/);
    },
  );

test("Metekhi lay-by supports only its visible footprint and retains water-side guards", async () => {
  const {
    METEKHI_LAYBY: b,
    laybyPoint,
    LAYBY_RAILS,
  } = await import("../dist/metekhi-layby.js");
  const { overOpenWater } = await import("../dist/surface-support.js");
  const { BRIDGE_BARRIERS } = await import("../dist/bridge-data.js");
  assert(b);
  for (let x = -8; x <= 8; x++)
    for (let z = -5; z <= 5; z++) assert(!overOpenWater(laybyPoint(x, z)));
  assert(
    overOpenWater(laybyPoint(0, -8)),
    "Water beyond the platform must stay water",
  );
  assert.equal(LAYBY_RAILS.length, 3);
  assert(BRIDGE_BARRIERS.some((r) => r.name === "METEKHI BRIDGE LAY-BY"));
});
