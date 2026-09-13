// Removing thousands of sibling meshes one by one repeatedly searches/splices
// the same child array. Compact each parent once while retaining dynamic nodes.
export function detachStaticMeshes(objects) {
  const parents = new Map();
  for (const object of objects) {
    if (!object.parent) continue;
    if (!parents.has(object.parent)) parents.set(object.parent, new Set());
    parents.get(object.parent).add(object);
  }
  for (const [parent, remove] of parents) {
    const children = parent.children;
    let length = 0;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!remove.has(child)) children[length++] = child;
    }
    children.length = length;
    for (const child of remove) {
      child.parent = null;
      child.dispatchEvent({ type: "removed" });
      parent.dispatchEvent({ type: "childremoved", child });
    }
  }
}
