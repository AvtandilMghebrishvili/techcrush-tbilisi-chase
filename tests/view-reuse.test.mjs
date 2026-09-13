import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../dist/vendor/three.module.js";
import { SceneView } from "../dist/view.js";
import { updateVehicleDamage } from "../dist/vehicle-damage.js";
import { releaseResources } from "../dist/resource-lifetime.js";
test("the selected build is reused across restarts, fully repaired, and rebuilt when equipment changes", () => {
  const view = { scene: new THREE.Scene(), player: null };
  const select = (equipment = {}) =>
    SceneView.prototype.selectCar.call(view, "gt", equipment);
  select();
  const first = view.player;
  updateVehicleDamage(first, { health: 0, destroyed: true });
  first.userData.turboExhaust.visible = true;
  select();
  assert.equal(view.player, first);
  assert.equal(first.userData.turboExhaust.visible, false);
  assert(first.userData.damageView.signature.endsWith("/false"));
  for (const entry of first.userData.damageView.entries)
    assert.deepEqual(entry.mesh.geometry.attributes.position.array, entry.rest);
  let disposed = 0;
  first.traverse((m) =>
    m.geometry?.addEventListener("dispose", () => disposed++),
  );
  select({ spoiler: 3 });
  assert.notEqual(view.player, first);
  assert(disposed > 0);
  const second = view.player;
  select({ spoiler: 3 });
  assert.equal(view.player, second);
  releaseResources([view.scene]);
});
