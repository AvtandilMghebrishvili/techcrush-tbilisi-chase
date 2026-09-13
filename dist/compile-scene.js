// Three r180's compileAsync owns an uncancellable polling timeout. Use the same
// compiled-program readiness check with page-owned cancellation, before disposal.
// The program access is isolated here to the pinned, vendored Three revision.
export function compileScene(
  renderer,
  scene,
  camera,
  signal,
  timers = globalThis,
) {
  if (signal.aborted) return Promise.reject(signal.reason);
  const materials = renderer.compile(scene, camera);
  const programs = new Set(
    [...materials].map((m) => renderer.properties.get(m).currentProgram),
  );
  return new Promise((resolve, reject) => {
    let timer;
    const finish = (error) => {
      timers.clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      programs.clear();
      if (error) reject(error);
      else resolve();
    };
    const abort = () =>
      finish(
        signal.reason || new DOMException("Loading cancelled", "AbortError"),
      );
    const lost = () => finish(new Error("Graphics context lost while loading"));
    const check = () => {
      if (signal.aborted) {
        abort();
        return;
      }
      if (renderer.getContext().isContextLost()) {
        lost();
        return;
      }
      try {
        for (const program of programs)
          if (program.isReady()) programs.delete(program);
        if (!programs.size) finish();
        else timer = timers.setTimeout(check, 10);
      } catch (error) {
        finish(error);
      }
    };
    signal.addEventListener("abort", abort, { once: true });
    renderer.domElement.addEventListener("webglcontextlost", lost, {
      once: true,
    });
    timer = timers.setTimeout(check, 10);
  });
}
