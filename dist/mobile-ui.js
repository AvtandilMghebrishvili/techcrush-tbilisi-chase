import {
  TiltSteering,
  PointerLedger,
  mergeMobileInput,
} from "./mobile-input.js";
const $ = (id) => document.getElementById(id);
export class MobileControls {
  constructor({ pause, clearKeys, recover, quality, phase }) {
    this.actions = { pause, clearKeys, recover, quality, phase };
    this.touch = new PointerLedger();
    this.tilt = new TiltSteering();
    this.mode = "buttons";
    this.requestId = 0;
    this.coarse = matchMedia("(any-pointer: coarse)");
    this.mobile = this.coarse.matches || navigator.maxTouchPoints > 0;
    this.settings = {
      range: 24,
      invert: false,
      autoGas: false,
      quality: "auto",
      controls: "auto",
    };
    try {
      Object.assign(
        this.settings,
        JSON.parse(localStorage.getItem("techcrush-mobile") || "{}"),
      );
    } catch {}
    this.settings.range = Math.max(
      12,
      Math.min(40, Number(this.settings.range) || 24),
    );
    if (!["auto", "battery", "high"].includes(this.settings.quality))
      this.settings.quality = "auto";
    if (!["auto", "on"].includes(this.settings.controls))
      this.settings.controls = "auto";
    this.tilt.range = this.settings.range;
    this.tilt.invert = !!this.settings.invert;
    $("tilt-range").value = this.settings.range;
    $("tilt-invert").checked = !!this.settings.invert;
    $("auto-gas").checked = !!this.settings.autoGas;
    $("graphics-quality").value = this.settings.quality;
    $("touch-visibility").value = this.settings.controls;
    $("control-settings").onclick = () => this.open();
    $("mobile-setup").onclick = () => this.open();
    $("controls-close").onclick = () => $("controls-dialog").close();
    $("controls-dialog").addEventListener("close", () => this.clear());
    $("tilt-enable").onclick = () => this.enableTilt();
    $("buttons-enable").onclick = () => this.disableTilt();
    $("tilt-center").onclick = $("touch-center").onclick = () =>
      this.calibrate();
    $("touch-recover").onclick = () => {
      this.clear();
      this.actions.recover();
    };
    $("tilt-range").oninput = (e) => {
      this.tilt.range = this.settings.range = Number(e.target.value);
      this.save();
    };
    $("tilt-invert").onchange = (e) => {
      this.tilt.invert = this.settings.invert = e.target.checked;
      this.save();
    };
    $("auto-gas").onchange = (e) => {
      this.settings.autoGas = e.target.checked;
      this.save();
    };
    $("graphics-quality").onchange = (e) => {
      this.settings.quality = e.target.value;
      this.actions.quality(e.target.value);
      this.save();
    };
    $("touch-visibility").onchange = (e) => {
      this.settings.controls = e.target.value;
      this.syncLayout();
      this.save();
    };
    $("mobile-fullscreen").onclick = () => this.fullscreen();
    this.coarse.addEventListener("change", () => {
      this.mobile = this.coarse.matches || navigator.maxTouchPoints > 0;
      this.syncLayout();
    });
    this.onOrientation = (e) => {
      if (this.mode !== "gyro" || document.hidden) return;
      const angle = screen.orientation?.angle ?? window.orientation ?? 0;
      if (!this.tilt.sample(e.beta, e.gamma, angle, performance.now())) return;
      if (this.waiting) {
        this.waiting = false;
        clearTimeout(this.sensorTimer);
        this.status("Gyro ready. Tilt left / right; hold GAS to drive.");
      }
    };
    const rotated = () => {
      this.clear();
      this.tilt.reset();
      if (["running", "rewinding"].includes(this.actions.phase()))
        this.actions.pause();
      if (this.mode === "gyro")
        this.status("Screen rotated. Hold the phone comfortably, then resume.");
    };
    if (screen.orientation?.addEventListener)
      screen.orientation.addEventListener("change", rotated);
    else addEventListener("orientationchange", rotated);
    addEventListener("blur", () => this.clear());
    document.addEventListener("visibilitychange", () => {
      this.clear();
      if (document.hidden) this.releaseWake();
    });
    addEventListener("pagehide", () => {
      this.clear();
      this.releaseWake();
    });
    for (const button of document.querySelectorAll("[data-key]")) {
      button.addEventListener("contextmenu", (e) => e.preventDefault());
      button.addEventListener("pointerdown", (e) => {
        if (
          button.disabled ||
          $("controls-dialog").open ||
          $("workshop").open ||
          $("loot-dialog").open
        )
          return;
        e.preventDefault();
        this.touch.down(e.pointerId, button.dataset.key);
        button.setPointerCapture(e.pointerId);
        this.paintHeld();
      });
      for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
        button.addEventListener(name, (e) => {
          this.touch.up(e.pointerId);
          this.paintHeld();
        });
    }
    this.syncLayout();
    this.save();
    this.status(
      "Choose buttons, or enable gyro and allow Motion & Orientation when asked.",
    );
  }
  get visible() {
    return this.mobile || this.settings.controls === "on";
  }
  get active() {
    return (
      !$("controls-dialog").open &&
      !$("workshop").open &&
      !$("loot-dialog").open
    );
  }
  save() {
    try {
      localStorage.setItem("techcrush-mobile", JSON.stringify(this.settings));
    } catch {}
    $("tilt-range-value").textContent = this.settings.range + "° to full lock";
  }
  syncLayout() {
    document.body.classList.toggle("mobile-controls", this.visible);
    $("mobile-setup").hidden = !this.visible;
    $("touch-controls").hidden =
      !this.visible || !document.body.classList.contains("playing");
    $("turbo-key-label").textContent = this.visible ? "TURBO" : "SHIFT / TURBO";
  }
  paintHeld() {
    for (const b of document.querySelectorAll("[data-key]"))
      b.classList.toggle("pressed", this.touch.has(b.dataset.key));
  }
  clear() {
    this.touch.clear();
    this.paintHeld();
    this.tilt.value = 0;
    this.actions.clearKeys();
  }
  reset() {
    this.clear();
    this.tilt.calibrate();
  }
  open() {
    if (
      this.actions.phase() === "running" ||
      this.actions.phase() === "rewinding"
    )
      this.actions.pause();
    this.clear();
    $("controls-dialog").showModal();
  }
  status(message) {
    $("tilt-status").textContent = message;
    $("touch-mode").textContent =
      this.mode === "gyro"
        ? this.waiting
          ? "GYRO · WAITING"
          : "GYRO"
        : "BUTTONS";
  }
  disableTilt(
    message = "Button steering active. Hold left / right and GAS together.",
  ) {
    ++this.requestId;
    clearTimeout(this.sensorTimer);
    this.mode = "buttons";
    this.waiting = false;
    removeEventListener("deviceorientation", this.onOrientation);
    this.tilt.reset();
    document.body.classList.remove("gyro-active");
    $("tilt-enable").disabled = false;
    $("tilt-enable").setAttribute("aria-pressed", "false");
    $("buttons-enable").setAttribute("aria-pressed", "true");
    this.status(message);
  }
  async enableTilt() {
    const request = ++this.requestId;
    clearTimeout(this.sensorTimer);
    if (!isSecureContext || !window.DeviceOrientationEvent)
      return this.disableTilt(
        "Gyro is unavailable here. Use buttons, or open the HTTPS game in Safari / Chrome.",
      );
    $("tilt-enable").disabled = true;
    try {
      // Must be invoked inside this click, before any other asynchronous work.
      const permission =
        typeof DeviceOrientationEvent.requestPermission === "function"
          ? await DeviceOrientationEvent.requestPermission()
          : "granted";
      if (request !== this.requestId) return;
      if (permission !== "granted")
        return this.disableTilt(
          "Motion permission was declined. Buttons still work. Enable access in browser settings to try gyro again.",
        );
      this.mode = "gyro";
      this.waiting = true;
      this.tilt.reset();
      this.settings.controls = "on";
      this.syncLayout();
      this.save();
      addEventListener("deviceorientation", this.onOrientation);
      document.body.classList.add("gyro-active");
      $("tilt-enable").setAttribute("aria-pressed", "true");
      $("buttons-enable").setAttribute("aria-pressed", "false");
      this.status(
        "Hold your phone in a comfortable driving position. Waiting for the motion sensor…",
      );
      this.sensorTimer = setTimeout(() => {
        if (this.waiting)
          this.disableTilt(
            "No motion data received. Use buttons or open the game directly in Safari / Chrome.",
          );
      }, 5000);
    } catch {
      if (request === this.requestId)
        this.disableTilt(
          "Motion access is unavailable. Button steering is ready.",
        );
    } finally {
      if (request === this.requestId) $("tilt-enable").disabled = false;
    }
  }
  calibrate() {
    if (
      this.mode !== "gyro" ||
      performance.now() - this.tilt.lastSample > 1000
    ) {
      this.status("Enable gyro and wait for motion data before centering.");
      return;
    }
    this.tilt.calibrate();
    this.status("Centered. This position now drives straight.");
  }
  tick(dt) {
    this.tilt.update(dt, performance.now());
    $("tilt-meter").style.setProperty("--steer", this.tilt.value);
    if (
      this.mode === "gyro" &&
      !this.waiting &&
      performance.now() - this.tilt.lastSample > 3000 &&
      !document.hidden
    )
      this.disableTilt(
        "Motion data stopped. Button steering is active; enable gyro to retry.",
      );
    const running =
      this.actions.phase() === "running" && this.visible && !document.hidden;
    if (running && !this.wake && !this.wakePending && !this.wakeFailed)
      this.acquireWake();
    if (!running && this.wake) this.releaseWake();
  }
  read(keyboard, keys, phase) {
    return mergeMobileInput(
      keyboard,
      keys,
      this.touch,
      this.mode === "gyro" ? this.tilt.value : 0,
      this.visible && this.settings.autoGas,
      this.active && ["running", "rewinding"].includes(phase),
    );
  }
  async acquireWake() {
    if (!navigator.wakeLock?.request) {
      this.wakeFailed = true;
      return;
    }
    this.wakePending = true;
    try {
      const wake = await navigator.wakeLock.request("screen");
      if (this.actions.phase() !== "running" || document.hidden) {
        await wake.release();
        return;
      }
      this.wake = wake;
      wake.addEventListener("release", () => {
        if (this.wake === wake) this.wake = null;
      });
    } catch {
      this.wakeFailed = true;
    } finally {
      this.wakePending = false;
    }
  }
  releaseWake() {
    this.wake?.release().catch(() => {});
    this.wake = null;
  }
  async fullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        $("screen-status").textContent = "Windowed view.";
        return;
      }
      if (!document.documentElement.requestFullscreen) throw Error();
      await document.documentElement.requestFullscreen();
      try {
        await screen.orientation?.lock?.("landscape");
      } catch {}
      $("screen-status").textContent =
        "Fullscreen enabled. Rotate your phone if needed.";
    } catch {
      $("screen-status").textContent =
        "Fullscreen is unavailable in this browser. Rotate to landscape; on iPhone use Share → Add to Home Screen for a larger view.";
    }
  }
}
