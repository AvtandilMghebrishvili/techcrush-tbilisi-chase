import * as THREE from "./vendor/three.module.js";
import { batchStatic } from "./expansion-visuals.js";

// Regular city blocks have two prepared representations. The low-detail one
// retains every building footprint, roof and facade; only trim/chimneys are omitted.
export class BuildingLOD {
  constructor(parent, size = 240) {
    this.tiles = new Map();
    this.size = size;
    this.parent = parent;
  }
  tile(building) {
    const x = Math.floor(building.x / this.size),
      z = Math.floor(building.z / this.size),
      key = x + ":" + z;
    if (!this.tiles.has(key)) {
      const full = new THREE.Group(),
        simple = new THREE.Group();
      for (const group of [full, simple]) {
        group.userData.environment = true;
        this.parent.add(group);
      }
      simple.visible = false;
      this.tiles.set(key, {
        full,
        simple,
        x: (x + 0.5) * this.size,
        z: (z + 0.5) * this.size,
        radius: this.size * 0.71,
        detailed: true,
      });
    }
    const tile = this.tiles.get(key);
    tile.radius = Math.max(
      tile.radius,
      Math.hypot(building.x - tile.x, building.z - tile.z) +
        Math.hypot(building.w, building.d) / 2,
    );
    return tile.full;
  }
  finish() {
    for (const tile of this.tiles.values()) {
      for (const mesh of tile.full.children) {
        if (!mesh.userData.lodCore) continue;
        const copy = mesh.clone(false);
        copy.geometry = mesh.geometry.clone();
        copy.castShadow = false;
        tile.simple.add(copy);
      }
      batchStatic(tile.full, this.size, { maxDrawDistance: false });
      batchStatic(tile.simple, this.size, { maxDrawDistance: false });
    }
  }
  update(focus, nearDistance) {
    for (const tile of this.tiles.values()) {
      const distance =
        Math.hypot(tile.x - focus.x, tile.z - focus.z) - tile.radius;
      // Hysteresis keeps the same tile from flickering around the boundary.
      tile.detailed = distance < nearDistance + (tile.detailed ? 35 : 0);
      tile.full.visible = tile.detailed;
      tile.simple.visible = !tile.detailed;
    }
  }
}
