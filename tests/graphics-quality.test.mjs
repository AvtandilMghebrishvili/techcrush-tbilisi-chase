import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../dist/vendor/three.module.js";
import { renderBudget } from "../dist/mobile-input.js";
import { normalizeQuality } from "../dist/graphics-quality.js";
import { BuildingLOD } from "../dist/building-lod.js";
import { simpleTree } from "../dist/simple-tree.js";
import { loadTrees, updateTrees } from "../dist/trees.js";
import { applySceneryQuality } from "../dist/graphics-materials.js";
import { CityLighting } from "../dist/city-lighting.js";

test("four manual graphics levels have increasing detail budgets and retain saved battery/auto preferences", () => {
  assert.equal(normalizeQuality("battery"), "low");
  assert.equal(normalizeQuality("unknown"), "auto");
  const budgets = ["low", "medium", "high", "ultra"].map((mode) =>
    renderBudget(mode, true, 1920, 1080, 3, { tier: "constrained" }),
  );
  for (let i = 1; i < budgets.length; i++)
    for (const property of [
      "pixelRatio",
      "buildingNear",
      "treeNear",
      "treeFar",
      "treeHorizon",
      "cameraFar",
      "localLights",
    ])
      assert(budgets[i][property] > budgets[i - 1][property], property);
  assert.equal(budgets[0].buildingLights, false);
  assert.equal(budgets[0].shadows, false);
  assert.equal(budgets[3].shadows, true);
  assert.equal(
    budgets[3].level,
    "ultra",
    "manual quality overrides device detection",
  );
});

test("distant building blocks keep roofs and footprints, reduce geometry, and restore without rebuilding", () => {
  const parent = new THREE.Group(),
    lod = new BuildingLOD(parent),
    material = new THREE.MeshStandardMaterial();
  const b = { x: 20, z: 20, w: 30, d: 20, h: 40 },
    full = lod.tile(b);
  for (let i = 0; i < 7; i++) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(30, i === 0 ? 40 : 0.5, 20),
      material,
    );
    mesh.position.set(20, i === 0 ? 20 : i * 7, 20);
    mesh.rotation.y = 0.6;
    mesh.userData.lodCore = i === 0 || i === 6;
    full.add(mesh);
  }
  lod.finish();
  const tile = [...lod.tiles.values()][0];
  const vertices = (group) =>
    group.children.reduce(
      (sum, m) => sum + m.geometry.attributes.position.count,
      0,
    );
  assert(vertices(tile.simple) < vertices(tile.full) / 2);
  const ids = parent.children.flatMap((g) =>
    g.children.map((m) => m.geometry.uuid),
  );
  lod.update({ x: 0, z: 0 }, 160);
  assert(full.visible);
  assert(!tile.simple.visible);
  lod.update({ x: 800, z: 0 }, 160);
  assert(!full.visible);
  assert(tile.simple.visible);
  lod.update({ x: 800, z: 0 }, 1200);
  assert(full.visible);
  assert(!tile.simple.visible);
  for (let i = 0; i < 100; i++) lod.update({ x: i % 2 ? 0 : 1800, z: 0 }, 160);
  assert.deepEqual(
    parent.children.flatMap((g) => g.children.map((m) => m.geometry.uuid)),
    ids,
  );
});

test("low quality keeps every nearby tree as a simpler model, including falling and rewind", async () => {
  const states = [0, 200, 850].map((x, i) => ({
    x,
    z: 0,
    h: 9 + i,
    broken: false,
    fallAngle: 0,
    fallenAt: 0,
  }));
  const v = {
    mobile: false,
    decor: new THREE.Group(),
    treePositions: states,
    budget: renderBudget("low", false, 1280, 720),
  };
  const model = simpleTree(10);
  await loadTrees(v, [model, model]);
  updateTrees(v, { x: 0, z: 0 }, 1, states, true);
  assert(
    v.trees.groups
      .filter((g) => g.level === 2)
      .every((g) => g.batch.count === 3),
  );
  assert(
    v.trees.groups.filter((g) => g.level < 2).every((g) => g.batch.count === 0),
  );
  v.budget = renderBudget("ultra", false, 1280, 720);
  updateTrees(v, { x: 0, z: 0 }, 1, states, true);
  for (const level of [0, 1, 2])
    assert(
      v.trees.groups
        .filter((g) => g.level === level)
        .every((g) => g.batch.count === 1),
    );
  states[0].broken = true;
  states[0].fallenAt = 1;
  updateTrees(v, { x: 0, z: 0 }, 2, states, true);
  assert.equal(v.trees.stumps.count, 1);
  const fallen = v.trees.groups[0].batch.instanceMatrix.array.slice(0, 16);
  states[0].broken = false;
  updateTrees(v, { x: 0, z: 0 }, 0.5, states, true);
  assert.equal(v.trees.stumps.count, 0);
  assert.notDeepEqual(
    v.trees.groups[0].batch.instanceMatrix.array.slice(0, 16),
    fallen,
  );
});

test("light quality changes remove costly windows/shadows and restore original maps without allocating new materials", () => {
  const map = new THREE.Texture(),
    bump = new THREE.Texture(),
    material = new THREE.MeshStandardMaterial({
      emissiveMap: map,
      bumpMap: bump,
    });
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2();
  const head = new THREE.Group();
  head.position.set(0, 8, 0);
  scene.add(head);
  const view = {
    scene,
    buildingMaterials: [material],
    nightWindowMaterials: [],
    camera: new THREE.PerspectiveCamera(),
    player: new THREE.Group(),
    sun: new THREE.DirectionalLight(),
    hemisphere: new THREE.HemisphereLight(),
    streetLamps: [{ head, propId: 0 }],
    renderer: { capabilities: { getMaxAnisotropy: () => 16 } },
    budget: renderBudget("low", false, 1280, 720),
  };
  const lighting = new CityLighting(view);
  lighting.setMode("night");
  const sim = {
    time: 1,
    level: 1,
    player: { x: 0, z: 0, health: 100 },
    poles: [],
    phase: "paused",
  };
  applySceneryQuality(view);
  lighting.update(sim);
  assert.equal(material.emissiveMap, null);
  assert.equal(material.bumpMap, null);
  assert.equal(material.emissiveIntensity, 0);
  assert(lighting.local.every((l) => !l.visible));
  assert(!lighting.halos.visible);
  view.budget = renderBudget("ultra", false, 1280, 720);
  lighting.refreshAt = -1;
  applySceneryQuality(view);
  lighting.update(sim);
  assert.equal(material.emissiveMap, map);
  assert.equal(material.bumpMap, bump);
  assert(material.emissiveIntensity > 0);
  assert(lighting.local.every((l) => l.visible));
  assert(lighting.halos.visible);
  assert.equal(view.qualityMaterials.size, 1);
});
