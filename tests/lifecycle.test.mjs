import test from "node:test";
import assert from "node:assert/strict";
import { FrameLoop } from "../dist/frame-loop.js";
import { ChaseAudio } from "../dist/chase-audio.js";

function clock() {
  let id = 0;
  const callbacks = new Map();
  return {
    callbacks,
    request(fn) {
      callbacks.set(++id, fn);
      return id;
    },
    cancel(id) {
      callbacks.delete(id);
    },
    step(now) {
      const batch = [...callbacks.values()];
      callbacks.clear();
      batch.forEach((fn) => fn(now));
    },
  };
}
test("idle views render once, coalesce input, and cancel all pending work when hidden", () => {
  const c = clock(),
    steps = [];
  let moving = false;
  const loop = new FrameLoop((dt) => {
    steps.push(dt);
    return moving;
  }, c);
  loop.invalidate();
  assert.equal(c.callbacks.size, 0);
  loop.setEnabled(true);
  for (let i = 0; i < 100; i++) loop.invalidate();
  assert.equal(c.callbacks.size, 1);
  c.step(100);
  assert.equal(c.callbacks.size, 0);
  moving = true;
  loop.invalidate();
  c.step(200);
  assert.equal(c.callbacks.size, 1);
  loop.setEnabled(false);
  assert.equal(c.callbacks.size, 0);
  c.step(300);
  assert.equal(steps.length, 2);
  loop.setEnabled(true);
  loop.invalidate();
  c.step(60000);
  assert.equal(
    steps.at(-1),
    1 / 60,
    "resuming must not integrate hidden wall time",
  );
  c.step(61000);
  assert.equal(
    steps.at(-1),
    0.05,
    "a slow frame still has a bounded physics delta",
  );
  moving = false;
  c.step(62000);
  assert.equal(c.callbacks.size, 0);
});
test("finite terminal effects drain and leave no frame callback; a later rewind wakes normally", () => {
  const c = clock();
  let remaining = 3;
  const loop = new FrameLoop(() => --remaining > 0, c);
  loop.setEnabled(true);
  loop.invalidate();
  c.step(16);
  c.step(32);
  c.step(48);
  assert.equal(c.callbacks.size, 0);
  remaining = 2;
  loop.invalidate();
  c.step(60000);
  assert.equal(c.callbacks.size, 1);
});
function audioContext() {
  const calls = [],
    nodes = [];
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    setTargetAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  const node = () => {
    const n = {
      gain: param(),
      frequency: param(),
      playbackRate: param(),
      pan: param(),
      connect(to) {
        return to;
      },
      disconnect() {
        this.disconnected = true;
      },
      start() {},
      stop() {},
    };
    nodes.push(n);
    return n;
  };
  return {
    calls,
    nodes,
    state: "running",
    currentTime: 0,
    resume() {
      calls.push("running");
      this.state = "running";
      return Promise.resolve();
    },
    suspend() {
      calls.push("suspended");
      this.state = "suspended";
      return Promise.resolve();
    },
    createBufferSource: node,
    createOscillator: node,
    createGain: node,
    createStereoPanner: node,
    createBiquadFilter: node,
  };
}
test("muting, menus and background suspend audio DSP; terminal audio stops after its final voice", () => {
  const a = new ChaseAudio(),
    c = audioContext();
  a.context = c;
  a.syncContext();
  assert.equal(c.state, "suspended");
  a.muted = false;
  a.phase = "running";
  a.syncContext();
  assert.equal(c.state, "running");
  for (let i = 0; i < 120; i++) a.syncContext();
  assert.equal(
    c.calls.length,
    2,
    "no repeated context state promises per frame",
  );
  a.setForeground(false);
  assert.equal(c.state, "suspended");
  a.setForeground(true);
  assert.equal(c.state, "running");
  a.phase = "paused";
  a.syncContext();
  assert.equal(c.state, "suspended");
  a.phase = "wrecked";
  a.master = {};
  a.play({ duration: 0.5 });
  a.syncContext();
  assert.equal(c.state, "running");
  const voice = [...a.voices][0];
  voice.source.onended();
  assert.equal(c.state, "suspended");
  assert.equal(a.voices.size, 0);
  assert(c.nodes.every((n) => n.disconnected));
});
test("interrupting collision samples and thumps disconnects their entire audio graph immediately", () => {
  const a = new ChaseAudio(),
    c = audioContext();
  a.context = c;
  a.muted = false;
  a.phase = "running";
  a.play({ duration: 1 });
  a.thump(80, 0.1, 0, 0.4);
  assert.equal(a.voices.size, 2);
  a.setMuted(true);
  assert.equal(a.voices.size, 0);
  assert(c.nodes.every((n) => n.disconnected));
  assert.equal(c.state, "suspended");
});
