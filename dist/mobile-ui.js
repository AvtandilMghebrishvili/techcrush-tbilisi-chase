import {
  TiltSteering,
  PointerLedger,
  mergeMobileInput,
  NitroBurst,
  ThumbSteering,
} from "./mobile-input.js";
const $ = (id) => document.getElementById(id);
export class MobileControls {
  constructor({
    pause,
    clearKeys,
    recover,
    quality,
    phase,
    player,
    invalidate = () => {},
  }) {
    this.actions = {
      pause,
      clearKeys,
      recover,
      quality,
      phase,
      player,
      invalidate,
    };
    this.touch = new PointerLedger();
    this.burst = new NitroBurst();
    this.thumb = new ThumbSteering();
    this.tilt = new TiltSteering();
    this.mode = "buttons";
    this.requestId = 0;
    this.coarse = matchMedia("(any-pointer: coarse)");
    this.mobile = this.coarse.matches || navigator.maxTouchPoints > 0;
    this.settings = {
      range: 24,
      invert: false,
      autoGas: true,
      touchSteering: "pad",
      controlVersion: 2,
      quality: "auto",
      controls: "auto",
    };
    try {
      const saved = JSON.parse(
        localStorage.getItem("techcrush-mobile") || "{}",
      );
      Object.assign(this.settings, saved);
      if (!saved.controlVersion && this.mobile) this.settings.autoGas = true;
      this.settings.controlVersion = 2;
    } catch {}
    this.settings.range = Math.max(
      12,
      Math.min(40, Number(this.settings.range) || 24),
    );
    if (!["auto", "battery", "high"].includes(this.settings.quality))
      this.settings.quality = "auto";
    if (!["auto", "on"].includes(this.settings.controls))
      this.settings.controls = "auto";
    if (!["pad", "buttons"].includes(this.settings.touchSteering))
      this.settings.touchSteering = "pad";
    this.tilt.range = this.settings.range;
    this.tilt.invert = !!this.settings.invert;
    $("tilt-range").value = this.settings.range;
    $("tilt-invert").checked = !!this.settings.invert;
    $("auto-gas").checked = !!this.settings.autoGas;
    $("touch-steering-mode").value = this.settings.touchSteering;
    $("graphics-quality").value = this.settings.quality;
    $("touch-visibility").value = this.settings.controls;
    $("control-settings").onclick = () => this.open();
    $("mobile-setup").onclick = () => this.open();
    $("controls-close").onclick = () => $("controls-dialog").close();
    $("controls-dialog").addEventListener("close", () => this.clear());
    $("tilt-enable").onclick = () => {
      $("gyro-options").open = true;
      this.enableTilt();
    };
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
      this.clear();
      this.syncLayout();
      this.save();
    };
    $("touch-steering-mode").onchange = (e) => {
      this.settings.touchSteering = e.target.value;
      this.clear();
      this.syncLayout();
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
        this.status(
          "Gyro ready. Tilt to steer. Auto accelerator frees your thumbs for DRIFT and NITRO.",
        );
      }
      if ($("controls-dialog").open) {
        this.tilt.update(1 / 60, performance.now());
        $("tilt-meter").style.setProperty("--steer", this.tilt.value);
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
        this.actions.invalidate();
      });
      for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
        button.addEventListener(name, (e) => {
          this.touch.up(e.pointerId);
          this.paintHeld();
          this.actions.invalidate();
        });
    }
    const pad = $("steering-pad");
    pad.addEventListener("contextmenu", (e) => e.preventDefault());
    pad.addEventListener("pointerdown", (e) => {
      if (!this.active || this.actions.phase() !== "running") return;
      e.preventDefault();
      if (
        this.thumb.down(
          e.pointerId,
          e.clientX,
          e.clientY,
          pad.getBoundingClientRect(),
        )
      ) {
        pad.setPointerCapture(e.pointerId);
        this.paintThumb();
        this.actions.invalidate();
      }
    });
    pad.addEventListener("pointermove", (e) => {
      if (this.thumb.pointer !== e.pointerId) return;
      this.thumb.move(e.pointerId, e.clientX, e.clientY);
      this.paintThumb();
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      pad.addEventListener(type, (e) => {
        this.thumb.up(e.pointerId);
        this.paintThumb();
      });
    const nitro = $("touch-nitro");
    const activateNitro = () => {
      if (!this.active) return;
      this.burst.start(this.actions.player(), this.actions.phase());
      this.paintNitro();
      this.actions.invalidate();
    };
    nitro.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      activateNitro();
    });
    nitro.addEventListener("click", (e) => {
      if (e.detail === 0) activateNitro();
    });
    this.syncLayout();
    this.save();
    this.status(
      "Slide the steering pad left / right. Pull into its lower strip to drift while steering. Or enable gyro.",
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
    document.body.classList.toggle("auto-accelerator", !!this.settings.autoGas);
    document.body.dataset.touchSteering = this.settings.touchSteering;
    $("mobile-setup").hidden = !this.visible;
    $("touch-controls").hidden =
      !this.visible || !document.body.classList.contains("playing");
    $("turbo-key-label").textContent = this.visible ? "TURBO" : "SHIFT / TURBO";
    this.paintMode();
  }
  paintHeld() {
    for (const b of document.querySelectorAll("[data-key]"))
      b.classList.toggle("pressed", this.touch.has(b.dataset.key));
  }
  clear() {
    this.touch.clear();
    this.thumb.clear();
    this.burst.clear();
    this.paintThumb();
    this.paintNitro();
    this.paintHeld();
    this.tilt.value = 0;
    this.actions.clearKeys();
  }
  reset() {
    this.clear();
    this.tilt.calibrate();
  }
  paintThumb() {
    const pad = $("steering-pad");
    pad.style.setProperty("--steer", this.thumb.steer);
    pad.classList.toggle("pressed", this.thumb.pointer !== null);
    pad.classList.toggle("drifting", this.thumb.drift);
  }
  paintNitro() {
    const p = this.actions.player(),
      button = $("touch-nitro");
    const charge = Math.ceil(p.nitro);
    const active = this.burst.read(p, this.actions.phase());
    const label = active
      ? "BURNING"
      : p.nitroLocked
        ? "RECHARGING"
        : "TAP TO BURN";
    const signature = `${charge}:${label}`;
    if (signature === this.nitroSignature) return;
    this.nitroSignature = signature;
    button.style.setProperty("--charge", charge + "%");
    button.classList.toggle("burst-active", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-disabled", String(p.nitroLocked || charge <= 0));
    $("touch-nitro-state").textContent = label;
    $("touch-nitro-charge").textContent = charge + "%";
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
    this.paintMode();
  }
  paintMode() {
    const mode =
      this.mode === "gyro"
        ? this.waiting
          ? "GYRO · WAITING"
          : "GYRO"
        : this.settings.touchSteering === "pad"
          ? "THUMB"
          : "BUTTONS";
    $("touch-mode").textContent =
      (this.settings.autoGas ? "AUTO · " : "MANUAL · ") + mode;
  }
  disableTilt(
    message = "Touch steering active. Slide to turn, pull down to drift, tap NITRO once. Auto accelerator drives for you.",
  ) {
    ++this.requestId;
    clearTimeout(this.sensorTimer);
    this.mode = "buttons";
    this.waiting = false;
    removeEventListener("deviceorientation", this.onOrientation);
    this.sensorAttached = false;
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
      removeEventListener("deviceorientation", this.onOrientation);
      this.sensorAttached = false;
      this.mode = "gyro";
      this.waiting = true;
      this.tilt.reset();
      this.settings.controls = "on";
      this.syncLayout();
      this.save();
      document.body.classList.add("gyro-active");
      $("tilt-enable").setAttribute("aria-pressed", "true");
      $("buttons-enable").setAttribute("aria-pressed", "false");
      this.status(
        "Hold your phone in a comfortable driving position. Waiting for the motion sensor…",
      );
      this.syncActivity();
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
    this.nitroPaintTime = (this.nitroPaintTime || 0) + dt;
    if (this.nitroPaintTime >= 0.1) {
      this.paintNitro();
      this.nitroPaintTime = 0;
    }
    this.tilt.update(dt, performance.now());
    if ($("controls-dialog").open)
      $("tilt-meter").style.setProperty("--steer", this.tilt.value);
    if (
      this.mode === "gyro" &&
      this.sensorAttached &&
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
  syncActivity(allowed = true) {
    const playing = ["running", "rewinding"].includes(this.actions.phase());
    const sensing =
      allowed &&
      !document.hidden &&
      this.mode === "gyro" &&
      ((playing && this.active) || $("controls-dialog").open);
    if (sensing && !this.sensorAttached) {
      this.sensorAttached = true;
      this.tilt.reset();
      this.waiting = true;
      addEventListener("deviceorientation", this.onOrientation);
      clearTimeout(this.sensorTimer);
      this.sensorTimer = setTimeout(() => {
        if (this.waiting)
          this.disableTilt(
            "No motion data received. Use buttons or open the game directly in Safari / Chrome.",
          );
      }, 5000);
    } else if (!sensing && this.sensorAttached) {
      removeEventListener("deviceorientation", this.onOrientation);
      this.sensorAttached = false;
      clearTimeout(this.sensorTimer);
      this.waiting = false;
      this.tilt.reset();
    }
    if (!allowed || document.hidden || !playing || !this.active)
      this.releaseWake();
  }
  read(keyboard, keys, phase) {
    return mergeMobileInput(
      keyboard,
      keys,
      this.touch,
      this.mode === "gyro" ? this.tilt.value : 0,
      this.visible && this.settings.autoGas,
      this.active && ["running", "rewinding"].includes(phase),
      {
        steer: this.thumb.pointer !== null ? this.thumb.steer : null,
        drift: this.thumb.drift,
        burst: this.burst.read(this.actions.player(), phase),
      },
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
