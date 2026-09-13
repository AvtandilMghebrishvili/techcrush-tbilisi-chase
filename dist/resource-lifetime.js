// Explicit ownership for a whole page/world, including assets that finish late.
// Never use this to dispose a single car: those can share the world's textures.
export function releaseResources(
  values,
  released = new WeakSet(),
  options = {},
) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set(),
    targets = new Set(),
    instances = new Set(),
    visited = new Set();
  const collect = (value) => {
    if (!value || typeof value !== "object" || visited.has(value)) return;
    visited.add(value);
    if (Array.isArray(value)) return value.forEach(collect);
    if (value.isTexture) {
      textures.add(value);
      return;
    }
    if (value.isMaterial) {
      materials.add(value);
      for (const item of Object.values(value))
        if (item?.isTexture) collect(item);
      for (const uniform of Object.values(value.uniforms || {}))
        collect(uniform.value);
      return;
    }
    if (value.isBufferGeometry) {
      geometries.add(value);
      return;
    }
    if (value.isWebGLRenderTarget) {
      targets.add(value);
      for (const texture of value.textures || [value.texture])
        released.add(texture);
      if (value.depthTexture) released.add(value.depthTexture);
      return;
    }
    if (value.isObject3D) {
      if (!options.preserveShared || !value.userData.sharedGeometry)
        collect(value.geometry);
      collect(value.material);
      collect(value.environment);
      collect(value.background);
      collect(value.shadow?.map);
      collect(value.shadow?.mapPass);
      if (value.isInstancedMesh) instances.add(value);
      value.children.forEach(collect);
    } else if (value.scene?.isObject3D) collect(value.scene); // GLTF result
  };
  values.forEach(collect);
  for (const texture of options.protectedTextures || [])
    textures.delete(texture);
  for (const resource of [
    ...instances,
    ...targets,
    ...geometries,
    ...materials,
    ...textures,
  ]) {
    if (released.has(resource)) continue;
    released.add(resource);
    resource.dispose();
  }
  return released;
}

export class AssetScope {
  constructor(manager) {
    this.manager = manager;
    this.values = [];
    this.released = new WeakSet();
    this.disposed = false;
  }
  track(promise) {
    return promise.then((value) => {
      if (this.disposed) {
        releaseResources([value], this.released);
        throw new DOMException("City loading cancelled", "AbortError");
      }
      this.values.push(value);
      return value;
    });
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.manager?.abort();
    releaseResources(this.values, this.released);
    this.values.length = 0;
  }
}
