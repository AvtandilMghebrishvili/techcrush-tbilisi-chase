import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  GEAR_OUTLINE,
  GEAR_HOLE,
  ROBOTICS_COLOR,
} from "../dist/robotics-logo-data.js";
import { gearGeometry, bannerGeometry } from "../dist/city-branding.js";

test("all four cities have distributed, reachable roadside gears and correctly fitted facade banners", () => {
  for (const city of ["tbilisi", "kutaisi", "batumi", "rustavi"]) {
    const source = `
      globalThis.location={href:'http://local/?map=${city}'};
      const {FACADE_BANNERS,ROBOTICS_GEARS,GREX_MONUMENTS,BRAND_DENSITY}=await import('./dist/city-brand-sites.js');
      const {BUILDINGS,containsPoint,nearestRoad}=await import('./dist/city-map.js');
      const {roadClear}=await import('./dist/road-clearance.js');
      const {overOpenWater}=await import('./dist/surface-support.js');
      const {terrainBlocked}=await import('./dist/terrain.js');
      const assert=(await import('node:assert/strict')).default;
      assert.equal(FACADE_BANNERS.length,BRAND_DENSITY.banners);
      assert(FACADE_BANNERS.length >= (["kutaisi","batumi"].includes("${city}") ? 108 : 78));
      assert(ROBOTICS_GEARS.every(p=>p.mainStreet));
      assert.equal(GREX_MONUMENTS.length,3);
      assert.equal(ROBOTICS_GEARS.length,3);
      const { MAP_PLACES }=await import("./dist/map-landmarks.js");
      assert(MAP_PLACES.length>=5);
      assert(MAP_PLACES.every(p=>Number.isFinite(p.x) && Number.isFinite(p.z) && p.description));
      assert.equal(ROBOTICS_GEARS.length,BRAND_DENSITY.gears);
      assert(FACADE_BANNERS.filter(b=>b.brand==='robotics').length>=5);
      assert(FACADE_BANNERS.filter(b=>b.brand==='techcrush').length>=5);
      assert(FACADE_BANNERS.some(b=>b.draped));
      for(const b of FACADE_BANNERS) {
        assert(b.size>8 && b.size<b.faceWidth);
        assert(b.top-b.size>=2.7);
        // The visible front is outside the supporting wall; it faces the road.
        assert(!containsPoint(b.building,b.x,b.z,0));
        const road=nearestRoad(b.building);
        assert((road.x-b.x)*Math.sin(b.angle)+(road.z-b.z)*Math.cos(b.angle)>0);
      }
      for(const p of [...ROBOTICS_GEARS,...GREX_MONUMENTS]) {
        assert(roadClear(p,p.radius+1));
        assert(!overOpenWater(p));assert(!terrainBlocked(p,p.radius+1));
        assert(!BUILDINGS.some(b=>containsPoint(b,p.x,p.z,p.radius+3)));
        for(const q of ROBOTICS_GEARS) if(p!==q) assert(Math.hypot(p.x-q.x,p.z-q.z)>65);
      }
      console.log(JSON.stringify({city:'${city}',banners:FACADE_BANNERS.length,gears:ROBOTICS_GEARS.length}));`;
    const run = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", source],
      { encoding: "utf8" },
    );
    assert.equal(run.status, 0, city + ": " + run.stderr);
    console.log(run.stdout.trim());
  }
});

test("the supplied eight-tooth logo keeps its exact sampled color, open center and finite extruded geometry", () => {
  assert.equal(ROBOTICS_COLOR, "#f2394b");
  assert.equal(GEAR_OUTLINE.length, 256);
  assert(GEAR_HOLE > 0.45 && GEAR_HOLE < 0.6);
  const g = gearGeometry();
  g.computeBoundingBox();
  assert(g.boundingBox.max.x - g.boundingBox.min.x > 1.8);
  assert(g.boundingBox.max.z - g.boundingBox.min.z < 0.3);
  assert([...g.attributes.position.array].every(Number.isFinite));
  // No cap triangle fills the hollow center.
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    assert(Math.hypot(x, y) > GEAR_HOLE * 0.95);
  }
  g.dispose();
});

test("roof drapes preserve the poster UVs, remain above traffic and fold back onto the roof", () => {
  const g = bannerGeometry({ size: 20, top: 24, draped: true });
  g.computeBoundingBox();
  assert(g.boundingBox.min.y >= 4);
  assert(g.boundingBox.min.z < -1.5);
  assert(g.boundingBox.max.z < 0.1);
  assert([...g.attributes.uv.array].every((v) => v >= 0 && v <= 1));
  g.dispose();
});
