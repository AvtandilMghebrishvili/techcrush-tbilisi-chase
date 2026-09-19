import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cableLoopPoint, cableLoopPhase } from "../dist/cable-path.js";

test("four circulating cabins stay attached, separated and continuous through both stations", () => {
  const a = { x: 700, z: 200, y: 28 },
    b = { x: 270, z: 95, y: 19 },
    length = Math.hypot(a.x - b.x, a.z - b.z);
  for (let t = 0; t < 400; t += 0.2) {
    const points = Array.from({ length: 4 }, (_, i) =>
      cableLoopPoint(a, b, cableLoopPhase(t, i / 4, length)),
    );
    points.forEach((p, i) => {
      const q = cableLoopPoint(a, b, cableLoopPhase(t + 0.001, i / 4, length));
      assert(Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < 0.01);
      for (let j = i + 1; j < 4; j++)
        assert(
          Math.hypot(p.x - points[j].x, p.z - points[j].z) > 5,
          "cabins may not share a lane or intersect",
        );
    });
  }
  assert.deepEqual(cableLoopPoint(a, b, 0), cableLoopPoint(a, b, 1));
});

for (const city of ["kutaisi", "batumi"])
  test(
    city +
      " landmarks have clear forecourts and no blocked roads, artifacts or floating ground",
    () => {
      const result = execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `
    globalThis.location={href:'http://local/?map=${city}'};
    const assert=(await import('node:assert/strict')).default;
    const {BUILDINGS,containsPoint,nearestRoad}=await import('./dist/city-map.js');
    const {TREES}=await import('./dist/world-props.js');
    const {overlapsRoad,footprintsOverlap}=await import('./dist/map-clearance.js');
    const data=await import('./dist/${city}-district-data.js');
    const sites=data.KUTAISI_SITES||data.BATUMI_SITES;
    const {groundHeight}=await import('./dist/terrain.js');
    const {RELEASED_EVENT_SITES}=await import('./dist/released-event-sites.js');
    const {FACADE_BANNERS,ROBOTICS_GEARS}=await import('./dist/city-brand-sites.js');
    assert(sites.length>=('${city}'==='kutaisi'?10:17));
    for(const b of BUILDINGS) assert(!overlapsRoad(b,0),b.name+' intersects a road');
    for(const s of sites){
      assert(groundHeight(s.x,s.z)<=0.1,s.name+' must be grounded');
      assert(Math.abs(s.x)<3100 && Math.abs(s.z)<3300);
    }
    for(const b of BUILDINGS.filter(b=>!b.landmark))for(const c of data.FORECOURTS){
      assert(!footprintsOverlap(b,c.apron),b.name+' obscures a landmark');
      assert(!footprintsOverlap(b,c.approach),b.name+' blocks a street sightline');
    }
    for(const t of TREES)assert(!data.landmarkViewReserved(t,3),'tree blocks the forecourt');
    for(const a of RELEASED_EVENT_SITES['${city}']){
      const r=nearestRoad(a);
      for(let t=0;t<=1;t+=.1)assert(!BUILDINGS.some(b=>containsPoint(b,a.x+(r.x-a.x)*t,a.z+(r.z-a.z)*t,1)),'artifact approach changed');
    }
    assert(FACADE_BANNERS.filter(b=>b.mainStreet).length>=FACADE_BANNERS.length*.65,'main roads get the majority of banners');
    assert(ROBOTICS_GEARS.every(g=>g.mainStreet));
    console.log(JSON.stringify({city:'${city}',landmarks:sites.length,banners:FACADE_BANNERS.length,mainRoadBanners:FACADE_BANNERS.filter(b=>b.mainStreet).length}));
  `,
        ],
        { cwd: new URL("..", import.meta.url), encoding: "utf8" },
      );
      console.log(result.trim());
    },
  );
