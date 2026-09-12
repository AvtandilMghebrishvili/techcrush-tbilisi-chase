// One coalesced frame request. Idle/hidden views own no animation callback.
export class FrameLoop {
  constructor(
    render,
    {
      request = (fn) => requestAnimationFrame(fn),
      cancel = (id) => cancelAnimationFrame(id),
    } = {},
  ) {
    this.render = render;
    this.request = request;
    this.cancel = cancel;
    this.enabled = false;
    this.pending = null;
    this.last = null;
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      if (this.pending !== null) this.cancel(this.pending);
      this.pending = null;
      this.last = null;
    }
  }
  invalidate = () => {
    if (!this.enabled || this.pending !== null) return;
    this.pending = this.request(this.tick);
  };
  tick = (now) => {
    this.pending = null;
    if (!this.enabled) return;
    const dt =
      this.last === null
        ? 1 / 60
        : Math.min(Math.max((now - this.last) / 1000, 0), 0.05);
    this.last = now;
    if (this.render(dt)) this.invalidate();
    else this.last = null;
  };
}
