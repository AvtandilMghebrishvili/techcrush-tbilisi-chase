// Toggle costly scenery maps only when quality changes, keeping originals for
// switching back without downloads or creating new materials every frame.
export function applySceneryQuality(view) {
  const budget = view.budget;
  const buildings = new Set([
    ...(view.buildingMaterials || []),
    ...(view.nightWindowMaterials || []),
  ]);
  const materials = new Set(
    [
      ...buildings,
      view.roadMaterial,
      view.terrainMaterial,
      ...(view.localHillMaterials || []),
      view.districtMaterials?.ground,
    ].filter(Boolean),
  );
  view.qualityMaterials ||= new Map();
  for (const material of materials) {
    if (!view.qualityMaterials.has(material))
      view.qualityMaterials.set(material, {
        emissiveMap: material.emissiveMap,
        bumpMap: material.bumpMap,
        normalMap: material.normalMap,
      });
    const saved = view.qualityMaterials.get(material);
    let changed = false;
    for (const key of ["emissiveMap", "bumpMap", "normalMap"]) {
      const enabled =
        key === "emissiveMap"
          ? !buildings.has(material) || budget.buildingLights
          : !budget.low;
      const map = enabled ? saved[key] : null;
      if (material[key] !== map) {
        material[key] = map;
        changed = true;
      }
    }
    if (changed) material.needsUpdate = true;
    for (const key of ["map", "emissiveMap", "normalMap", "bumpMap"]) {
      const texture = material[key];
      if (!texture) continue;
      const anisotropy = Math.min(
        budget.anisotropy,
        view.renderer.capabilities.getMaxAnisotropy(),
      );
      if (texture.anisotropy !== anisotropy) {
        texture.anisotropy = anisotropy;
        texture.needsUpdate = true;
      }
    }
  }
}
