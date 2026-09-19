import {
  ENGINE_VOICES,
  engineTelemetry,
  spatialSound,
  PassByTracker,
} from "./audio-model.js";
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ASSETS = {
  engine: "engine-bed.wav",
  metal: "metal-hit.wav",
  metal2: "metal-hit-2.wav",
  wood: "wood-hit.wav",
  wood2: "wood-hit-2.wav",
  snap: "wood-snap.wav",
  stone: "stone-hit.wav",
  glass: "glass-hit.wav",
};
export class ChaseAudio {
  constructor() {
    this.requests = new AbortController();
    this.muted = true;
    this.foreground = true;
    this.telemetry = {};
    this.passBy = new PassByTracker();
    this.voices = new Set();
    this.buffers = {};
    this.lastTime = -1;
    this.phase = "ready";
    this.stats = { played: 0, dropped: 0, passes: 0 };
  }
  async unlock() {
    if (this.disposed) return false;
    if (!this.context) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) return false;
      this.context = new Context({ latencyHint: "interactive" });
      this.build();
      this.loading = this.load().catch(() => {});
    }
    const context = this.context;
    await context.resume();
    if (this.disposed) return false;
    this.requestedState = null;
    this.syncContext();
    return true;
  }
  setForeground(value) {
    this.foreground = value;
    if (!value) this.stopEffects();
    this.syncContext();
  }
  syncContext() {
    if (this.disposed) return;
    const c = this.context;
    if (!c || c.state === "closed") return;
    const wanted =
      this.foreground &&
      !this.muted &&
      (this.phase === "running" || this.voices.size > 0)
        ? "running"
        : "suspended";
    if (this.requestedState === wanted) return;
    this.requestedState = wanted;
    // Silence at the gain is not enough: suspend the oscillator/filter graph.
    const operation = wanted === "running" ? c.resume() : c.suspend();
    void operation.catch(() => {
      if (this.requestedState === wanted) this.requestedState = null;
    });
  }
  build() {
    const c = this.context;
    this.master = c.createGain();
    this.master.gain.value = 0;
    this.compressor = c.createDynamicsCompressor();
    Object.assign(this.compressor.threshold, { value: -12 });
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.18;
    this.master.connect(this.compressor).connect(c.destination);
    this.loops = c.createGain();
    this.loops.gain.value = 0;
    this.loops.connect(this.master);
    this.cabin = c.createBiquadFilter();
    this.cabin.type = "lowpass";
    this.cabin.frequency.value = 6500;
    this.cabin.connect(this.loops);
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const samples = this.noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < samples.length; i++) {
      last = 0.25 * last + 0.75 * (Math.random() * 2 - 1);
      samples[i] = last;
    }
    this.engineTone = this.tone("sine", this.cabin);
    this.engineSub = this.tone("sine", this.cabin);
    this.engineTone.filter = c.createBiquadFilter();
    this.engineTone.filter.type = "lowpass";
    this.engineTone.filter.Q.value = 0.65;
    this.engineTone.source.disconnect();
    this.engineTone.source
      .connect(this.engineTone.filter)
      .connect(this.engineTone.gain);
    this.intake = this.noiseLoop("bandpass", 900, 0.8, this.cabin);
    this.wind = this.noiseLoop("lowpass", 1300, 0.3, this.cabin);
    this.tires = this.noiseLoop("bandpass", 1050, 0.7, this.cabin);
    this.skid = this.noiseLoop("bandpass", 1550, 2.2, this.cabin);
    this.turbo = this.noiseLoop("bandpass", 2800, 0.8, this.cabin);
    this.turboTone = this.tone("sine", this.cabin);
    this.sirens = Array.from({ length: 2 }, () =>
      this.tone("sine", this.cabin, true),
    );
    this.chopper = this.noiseLoop("lowpass", 260, 0.7, this.cabin, true);
    this.chopperPulse = c.createOscillator();
    this.chopperPulse.frequency.value = 19;
    const pulse = c.createGain();
    pulse.gain.value = 0;
    this.chopperMod = pulse;
    this.chopperPulse.connect(pulse).connect(this.chopper.gain.gain);
    this.chopperPulse.start();
  }
  tone(type, out, pan = false) {
    const c = this.context,
      source = c.createOscillator(),
      gain = c.createGain();
    source.type = type;
    gain.gain.value = 0;
    source.connect(gain);
    let panner = null;
    if (pan) {
      panner = c.createStereoPanner();
      gain.connect(panner).connect(out);
    } else gain.connect(out);
    source.start();
    return { source, gain, panner };
  }
  noiseLoop(type, hz, q, out, pan = false) {
    const c = this.context,
      source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain();
    source.buffer = this.noise;
    source.loop = true;
    filter.type = type;
    filter.frequency.value = hz;
    filter.Q.value = q;
    gain.gain.value = 0;
    source.connect(filter).connect(gain);
    let panner = null;
    if (pan) {
      panner = c.createStereoPanner();
      gain.connect(panner).connect(out);
    } else gain.connect(out);
    source.start();
    return { source, filter, gain, panner };
  }
  async load() {
    const c = this.context;
    await Promise.all(
      Object.entries(ASSETS).map(async ([key, name]) => {
        try {
          const r = await fetch("./assets/audio/" + name, {
            signal: this.requests.signal,
          });
          if (!r.ok) throw Error("Audio unavailable");
          const bytes = await r.arrayBuffer();
          if (this.disposed) return;
          const buffer = await c.decodeAudioData(bytes);
          if (!this.disposed) this.buffers[key] = buffer;
        } catch {
          this.stats.dropped++;
        }
      }),
    );
    if (!this.disposed && this.buffers.engine) {
      const source = c.createBufferSource(),
        gain = c.createGain(),
        filter = c.createBiquadFilter();
      source.buffer = this.buffers.engine;
      source.loop = true;
      gain.gain.value = 0;
      filter.type = "lowpass";
      filter.Q.value = 0.4;
      source.connect(filter).connect(gain).connect(this.cabin);
      source.start();
      this.recording = { source, gain, filter };
    }
  }
  setMuted(value) {
    if (this.disposed) return;
    this.muted = value;
    if (value) this.stopEffects();
    if (this.master)
      this.master.gain.setTargetAtTime(
        value ? 0 : 0.72,
        this.context.currentTime,
        0.02,
      );
    this.syncContext();
  }
  stopEffects() {
    for (const voice of this.voices) {
      try {
        voice.source.stop();
      } catch {}
      voice.dispose();
    }
    this.voices.clear();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.requests.abort();
    this.stopEffects();
    for (const key of [
      "engineTone",
      "engineSub",
      "intake",
      "wind",
      "tires",
      "skid",
      "turbo",
      "turboTone",
      "chopper",
      "recording",
      "sirens",
    ]) {
      const voices = Array.isArray(this[key]) ? this[key] : [this[key]];
      for (const voice of voices)
        if (voice) {
          try {
            voice.source?.stop();
          } catch {}
          for (const node of Object.values(voice)) node?.disconnect?.();
        }
      this[key] = null;
    }
    try {
      this.chopperPulse?.stop();
    } catch {}
    for (const key of [
      "chopperPulse",
      "chopperMod",
      "cabin",
      "loops",
      "master",
      "compressor",
    ]) {
      this[key]?.disconnect();
      this[key] = null;
    }
    if (this.context && this.context.state !== "closed")
      void this.context.close().catch(() => {});
    this.context = null;
    this.buffers = {};
    this.noise = null;
  }
  set(param, value, time, constant = 0.035) {
    param.setTargetAtTime(value, time, constant);
  }
  update(sim, input = {}, dt = 1 / 60, camera = "chase") {
    const p = sim.player,
      changed = sim.time < this.lastTime || p.carId !== this.telemetry.car;
    const running = sim.phase === "running",
      terminal = ["won", "wrecked", "busted"].includes(sim.phase);
    if (changed || !running) {
      this.passBy.reset();
      if (!terminal) this.stopEffects();
    }
    if (changed) this.telemetry = {};
    if (running || sim.phase === "ready")
      this.telemetry = engineTelemetry(p, input, this.telemetry, dt);
    const events = (sim.soundEvents || []).splice(0);
    const passes = running
      ? this.passBy.sample(p, [...sim.traffic, ...sim.police], sim.time)
      : [];
    this.lastTime = sim.time;
    this.phase = sim.phase;
    if (this.muted || !this.foreground || (!running && !terminal)) {
      this.stopEffects();
      if (this.loops)
        this.loops.gain.setValueAtTime(0, this.context.currentTime);
      this.syncContext();
      return;
    }
    if (!this.context) return;
    const c = this.context,
      t = c.currentTime,
      a = this.telemetry,
      voice = a.voice || ENGINE_VOICES.gt;
    const active = running && !this.muted,
      inside = camera === "cockpit";
    this.set(this.master.gain, this.muted ? 0 : 0.72, t, 0.02);
    this.set(this.loops.gain, active ? 1 : 0, t, 0.025);
    this.set(this.cabin.frequency, inside ? 3000 : 6800, t, 0.1);
    if (this.currentCar !== a.car) {
      const real = new Float32Array(voice.harmonics.length + 1),
        imag = new Float32Array(real.length);
      imag.set(voice.harmonics, 1);
      this.engineTone.source.setPeriodicWave(c.createPeriodicWave(real, imag));
      this.currentCar = a.car;
    }
    this.set(
      this.engineTone.source.frequency,
      voice.electric ? 200 + (a.rev || 0) * 1450 : (a.rpm || 900) / 120,
      t,
      0.025,
    );
    this.set(
      this.engineSub.source.frequency,
      ((a.rpm || 900) / 120) * 2,
      t,
      0.03,
    );
    const load = a.load || 0,
      rev = a.rev || 0,
      cut = a.shiftCut || 1,
      speed = a.speed || 0;
    this.set(
      this.engineTone.filter.frequency,
      voice.brightness * (0.35 + 0.65 * load) + rev * 650,
      t,
      0.04,
    );
    this.set(
      this.engineTone.gain.gain,
      voice.electric
        ? load * 0.01 + rev * 0.016
        : (0.036 + 0.065 * load + rev * 0.016) * cut,
      t,
      0.03,
    );
    this.set(
      this.engineSub.gain.gain,
      voice.electric
        ? 0
        : (0.035 + 0.025 * load) *
            (1 - rev * 0.35) *
            (a.car === "suv" ? 1.5 : 1),
      t,
      0.04,
    );
    if (this.recording) {
      this.set(
        this.recording.source.playbackRate,
        voice.pitch * (0.65 + rev * 1.65),
        t,
        0.03,
      );
      this.set(
        this.recording.filter.frequency,
        voice.brightness * (0.35 + 0.65 * load),
        t,
        0.04,
      );
      this.set(
        this.recording.gain.gain,
        voice.electric ? 0 : (0.08 + load * 0.12) * cut,
        t,
        0.04,
      );
    }
    this.set(
      this.intake.gain.gain,
      voice.electric ? 0 : load * (0.006 + rev * 0.013),
      t,
      0.04,
    );
    this.set(this.intake.filter.frequency, voice.body + rev * 1300, t);
    this.set(
      this.wind.gain.gain,
      Math.pow(clamp(speed / 85, 0, 1), 1.7) * (inside ? 0.028 : 0.062),
      t,
      0.1,
    );
    this.set(this.wind.filter.frequency, 550 + speed * 20, t, 0.1);
    this.set(
      this.tires.gain.gain,
      p.airborne ? 0 : clamp(speed / 55, 0, 1) * 0.022,
      t,
      0.06,
    );
    this.set(
      this.skid.gain.gain,
      p.isDrifting && !p.airborne
        ? clamp(Math.abs(p.slip) * 0.15, 0, 0.065)
        : 0,
      t,
      0.04,
    );
    this.set(
      this.skid.filter.frequency,
      1000 + Math.abs(p.slip || 0) * 1500,
      t,
      0.04,
    );
    const boost = p.boostStrength || 0;
    this.set(this.turbo.gain.gain, boost * 0.045, t, 0.025);
    this.set(this.turboTone.source.frequency, 1700 + boost * 2100, t, 0.08);
    this.set(this.turboTone.gain.gain, boost * 0.003, t, 0.04);
    if (
      active &&
      !voice.electric &&
      this.lastBoost > 0.35 &&
      !p.boosting &&
      this.wasBoosting
    )
      this.effect({ kind: "release", impact: 20 }, p);
    if (active && a.shift > 0) this.effect({ kind: "shift", impact: 10 }, p);
    this.lastBoost = boost;
    this.wasBoosting = p.boosting;
    const nearby = sim.police
      .filter((x) => !x.destroyed && x.waterAt == null && x.kind !== "tank")
      .map((car) => ({ car, ...spatialSound(p, car, 110) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);
    this.sirens.forEach((s, i) => {
      const n = nearby[i];
      this.set(s.gain.gain, n ? n.gain * 0.014 : 0, t, 0.12);
      this.set(
        s.source.frequency,
        760 + Math.sin(sim.time * (i ? 7 : 4.2) + i) * 200,
        t,
        0.025,
      );
      if (n) this.set(s.panner.pan, n.pan, t, 0.06);
    });
    const air =
      sim.helicopter && !sim.helicopter.destroyed
        ? spatialSound(p, sim.helicopter, 230)
        : null;
    this.set(this.chopper.gain.gain, air ? air.gain * 0.022 : 0, t, 0.1);
    if (air) this.set(this.chopper.panner.pan, air.pan, t, 0.1);
    this.set(this.chopperMod.gain, air ? air.gain * 0.018 : 0, t, 0.1);
    // Muting, pausing and rewinding consume transient events without replaying them later.
    if (!this.muted && (running || terminal)) {
      for (const event of events.slice(0, 12)) this.effect(event, p);
      for (const event of passes.slice(0, 3)) {
        this.stats.passes++;
        this.effect(event, p);
      }
    }
    this.syncContext();
  }
  play(
    buffer,
    {
      volume = 0.2,
      rate = 1,
      pan = 0,
      filter = 7000,
      duration,
      attack = 0.003,
      fade = 0.06,
      delay = 0,
      filterEnd,
    } = {},
  ) {
    if (!buffer || this.voices.size >= 28) {
      this.stats.dropped++;
      return;
    }
    const c = this.context,
      t = c.currentTime + delay,
      source = c.createBufferSource(),
      gain = c.createGain(),
      panner = c.createStereoPanner(),
      low = c.createBiquadFilter();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    panner.pan.value = pan;
    low.type = "lowpass";
    low.frequency.value = filter;
    const length = duration || Math.min(2.5, buffer.duration / rate),
      end = t + length;
    if (filterEnd) {
      low.frequency.setValueAtTime(filter, t);
      low.frequency.exponentialRampToValueAtTime(filterEnd, end);
    }
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(
      volume,
      t + Math.min(attack, length * 0.2),
    );
    gain.gain.setTargetAtTime(
      0.0001,
      t + Math.max(attack, length - fade * 3),
      fade,
    );
    source.connect(low).connect(gain).connect(panner).connect(this.master);
    const item = { source, gain };
    this.voices.add(item);
    item.dispose = () => {
      source.onended = null;
      source.disconnect();
      low.disconnect();
      gain.disconnect();
      panner.disconnect();
      this.voices.delete(item);
    };
    source.onended = () => {
      item.dispose();
      this.syncContext();
    };
    source.start(t);
    source.stop(end);
    this.stats.played++;
    return source;
  }
  effect(event, player) {
    const pos = Number.isFinite(event.x)
      ? spatialSound(player, event, event.kind === "explosion" ? 120 : 65)
      : { gain: 1, pan: 0 };
    if (pos.gain < 0.01) return;
    const strength = clamp((event.impact || 12) / 35, 0.18, 1),
      pan = event.pan ?? pos.pan;
    const v = pos.gain * (0.14 + 0.28 * strength),
      rate = 0.82 + Math.random() * 0.2;
    const opt = { volume: v, pan, rate };
    if (event.kind === "checkpoint" || event.kind === "level-clear") {
      this.cue(event.kind === "level-clear");
      return;
    }
    if (event.kind === "reward") {
      this.thump(660, 0.1, pan, 0.18);
      this.play(this.buffers.glass, {
        volume: 0.08,
        pan,
        rate: 1.8,
        duration: 0.25,
        filter: 5000,
      });
      return;
    }
    if (event.kind === "collision" || event.kind === "landing") {
      this.thump(76, v * 0.55, pan, 0.22);
      this.play(this.buffers.stone, {
        ...opt,
        volume: v * 0.42,
        filter: 1300,
        rate: 0.68,
        duration: 0.22,
      });
      return;
    }
    if (event.kind === "water") {
      this.play(this.noise, {
        volume: v * 1.6,
        pan,
        rate: 0.65,
        filter: 900,
        duration: 1.1,
        attack: 0.012,
        fade: 0.75,
      });
      this.play(this.noise, {
        volume: v * 0.65,
        pan,
        rate: 1.1,
        filter: 3200,
        duration: 0.55,
        attack: 0.03,
        fade: 0.4,
      });
      return;
    }
    if (event.kind === "pass") {
      const s = this.play(this.noise, {
        volume: clamp(event.impact / 75, 0.15, 1) * 0.27,
        pan,
        rate: 1.25,
        filter: 2200,
        duration: 0.5,
        attack: 0.055,
        fade: 0.09,
      });
      if (s)
        s.playbackRate.exponentialRampToValueAtTime(
          0.68,
          this.context.currentTime + 0.46,
        );
      return;
    }
    if (event.kind === "release") {
      this.play(this.noise, {
        volume: 0.09,
        pan: 0,
        filter: 3400,
        duration: 0.25,
        fade: 0.05,
      });
      return;
    }
    if (event.kind === "shift") {
      this.play(this.buffers.metal, {
        volume: 0.035,
        rate: 1.7,
        filter: 800,
        duration: 0.06,
        fade: 0.012,
      });
      return;
    }
    if (event.kind === "wood") {
      this.play(this.buffers[Math.random() > 0.5 ? "wood" : "wood2"], {
        ...opt,
        filter: 3500,
        rate: 0.95 + strength * 0.18,
      });
      if (event.broken) {
        this.play(this.buffers.snap, {
          ...opt,
          volume: v * 0.8,
          rate: 0.7,
          delay: 0.018,
        });
        this.play(this.noise, {
          volume: v * 0.12,
          pan,
          filter: 1800,
          duration: 0.42,
          fade: 0.08,
        });
      }
      return;
    }
    if (event.kind === "stone") {
      this.play(this.buffers.stone, { ...opt, rate: 0.78, filter: 2800 });
      this.thump(58, v * 0.25, pan, 0.16);
      if (event.broken)
        this.play(this.buffers.glass, { ...opt, volume: v * 0.32, rate: 0.6 });
      return;
    }
    if (event.kind === "explosion") {
      this.play(this.buffers.metal2, {
        ...opt,
        volume: v * 0.95,
        rate: 0.62,
        filter: 2600,
      });
      this.thump(115, v * 0.95, pan, 0.8);
      this.play(this.noise, {
        volume: v * 0.85,
        pan,
        filter: 2100,
        filterEnd: 180,
        duration: 1.65,
        fade: 0.3,
      });
      this.play(this.buffers.glass, {
        ...opt,
        volume: v * 0.35,
        rate: 0.72,
        delay: 0.09,
      });
      this.play(this.buffers.stone, {
        ...opt,
        volume: v * 0.38,
        rate: 0.65,
        delay: 0.19,
        filter: 1500,
      });
      return;
    }
    this.play(this.buffers[Math.random() > 0.5 ? "metal" : "metal2"], opt);
    this.thump(85, v * 0.65, pan, 0.23);
    if (event.impact > 16)
      this.play(this.buffers.metal2, {
        ...opt,
        volume: v * 0.6,
        rate: 0.63,
        delay: 0.027,
        filter: 2400,
      });
    if (event.impact > 22)
      this.play(this.buffers.glass, { ...opt, volume: v * 0.18, rate: 0.8 });
  }
  cue(clear = false) {
    // Short, tuned marimba-like notes. Cached PCM; no new media downloads,
    // oscillators, timers or frame loop after the finite victory tail ends.
    const key = clear ? "clearCue" : "gateCue";
    if (!this.buffers[key]) {
      const c = this.context,
        duration = clear ? 1.25 : 0.48;
      const buffer = c.createBuffer(
        1,
        Math.ceil(c.sampleRate * duration),
        c.sampleRate,
      );
      const out = buffer.getChannelData(0);
      const notes = clear ? [523.25, 659.25, 783.99, 1046.5] : [783.99, 1046.5];
      notes.forEach((hz, j) => {
        const start = (clear ? 0.16 : 0.095) * j;
        for (let i = Math.ceil(start * c.sampleRate); i < out.length; i++) {
          const t = i / c.sampleRate - start;
          const env = Math.min(1, t / 0.006) * Math.exp(-t * (clear ? 7 : 13));
          out[i] +=
            env *
            (Math.sin(t * hz * Math.PI * 2) * 0.58 +
              Math.sin(t * hz * Math.PI * 4) * 0.15 * Math.exp(-t * 12));
        }
      });
      this.buffers[key] = buffer;
    }
    this.play(this.buffers[key], {
      volume: clear ? 0.35 : 0.3,
      filter: 6000,
      fade: 0.025,
    });
  }
  thump(frequency, volume, pan, duration) {
    if (this.voices.size >= 28) return;
    const c = this.context,
      t = c.currentTime,
      source = c.createOscillator(),
      gain = c.createGain(),
      panner = c.createStereoPanner();
    panner.pan.value = pan;
    source.frequency.setValueAtTime(frequency, t);
    source.frequency.exponentialRampToValueAtTime(28, t + duration);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    source.connect(gain).connect(panner).connect(this.master);
    const item = { source, gain };
    this.voices.add(item);
    item.dispose = () => {
      source.onended = null;
      source.disconnect();
      gain.disconnect();
      panner.disconnect();
      this.voices.delete(item);
    };
    source.onended = () => {
      item.dispose();
      this.syncContext();
    };
    source.start();
    source.stop(t + duration + 0.02);
  }
}
