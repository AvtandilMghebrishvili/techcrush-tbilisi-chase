import test from "node:test";
import assert from "node:assert/strict";
import {
  screenTilt,
  TiltSteering,
  PointerLedger,
  mergeMobileInput,
  renderBudget,
  deviceProfile,
  nextAdaptiveScale,
  wrapDegrees,
  portraitFov,
} from "../dist/mobile-input.js";
import { drivingInput } from "../dist/controls.js";
import { ChaseSimulation } from "../dist/simulation.js";

test("tilt follows screen-relative left and right in portrait and both landscape orientations", () => {
  for (const [orientation, left, right] of [
    [0, [30, -15], [30, 15]],
    [90, [-15, -30], [15, -30]],
    [270, [15, 30], [-15, 30]],
    [180, [-30, 15], [-30, -15]],
  ]) {
    assert(screenTilt(...left, orientation) < 0, `${orientation} left`);
    assert(screenTilt(...right, orientation) > 0, `${orientation} right`);
  }
  assert.equal(screenTilt(null, 0), null);
  assert.equal(screenTilt(0, NaN), null);
  assert.equal(
    screenTilt(90, 0, 0),
    null,
    "upright singular orientation must not generate a turn",
  );
  assert.equal(wrapDegrees(-358), 2);
  assert.equal(wrapDegrees(358), -2);
});
test("gyro calibrates, damps noise, saturates, reverses, recenters and fails neutral on stale data", () => {
  const t = new TiltSteering();
  t.sample(0, 15, 0, 0);
  assert.equal(t.update(0.1, 0), 0);
  t.sample(0, 16, 0, 10);
  assert.equal(t.update(0.1, 10), 0, "dead zone");
  t.sample(0, 45, 0, 20);
  const smooth = t.update(0.016, 20);
  assert(smooth > 0 && smooth < 0.4);
  for (let i = 0; i < 20; i++) t.update(0.05, 30);
  assert(t.value > 0.99);
  t.invert = true;
  for (let i = 0; i < 20; i++) t.update(0.05, 30);
  assert(t.value < -0.99);
  t.calibrate();
  assert.equal(t.update(0.1, 30), 0);
  t.sample(0, 65, 0, 50);
  assert(t.update(0.1, 50) < 0);
  assert.equal(t.update(0.1, 1100), 0);
  t.reset();
  assert.equal(t.update(0.1, 1101), 0);
  t.sample(179, 0, 90, 1200);
  t.sample(-179, 0, 90, 1210);
  assert(
    Math.abs(t.update(0.05, 1210)) < 0.05,
    "Euler seam does not turn full lock",
  );
});
test("simultaneous fingers are independently owned and cannot release keyboard input", () => {
  const p = new PointerLedger();
  p.down(1, "w");
  p.down(2, "d");
  p.down(3, "Shift");
  p.down(4, "w");
  let keys = new Set(),
    read = () =>
      mergeMobileInput(drivingInput(keys), keys, p, -0.4, false, true);
  assert.deepEqual(read(), {
    throttle: 1,
    steer: 1,
    boost: true,
    brake: false,
    rewind: false,
  });
  p.up(1);
  assert.equal(read().throttle, 1);
  p.up(4);
  assert.equal(read().throttle, 0);
  p.up(2);
  assert.equal(read().steer, -0.4);
  keys.add("a");
  assert.equal(read().steer, -1);
  p.clear();
  assert.equal(read().boost, false);
  assert.equal(read().steer, -1);
});
test("brake overrides auto accelerator, paused input is neutral, and rewind remains reachable after a crash", () => {
  const p = new PointerLedger(),
    keys = new Set();
  const read = (active = true) =>
    mergeMobileInput(drivingInput(keys), keys, p, 0.2, true, active);
  assert.equal(read().throttle, 1);
  p.down(1, "s");
  assert.equal(read().throttle, -1);
  p.down(2, "w");
  assert.equal(read().throttle, 0);
  p.down(3, "q");
  assert.deepEqual(read(false), {
    throttle: 0,
    steer: 0,
    boost: false,
    brake: false,
    rewind: true,
  });
  p.clear();
  keys.add("s");
  assert.equal(read().throttle, -1);
});
test("mobile steering drives the same simulation as keyboard steering and rewinds actual motion", () => {
  const a = new ChaseSimulation(),
    b = new ChaseSimulation();
  a.start("gt");
  b.start("gt");
  a.police = [];
  b.police = [];
  a.traffic = [];
  b.traffic = [];
  const keys = new Set(["w", "d"]),
    p = new PointerLedger();
  p.down(1, "w");
  p.down(2, "d");
  for (let i = 0; i < 160; i++) {
    a.update(1 / 120, drivingInput(keys));
    b.update(
      1 / 120,
      mergeMobileInput(drivingInput(new Set()), new Set(), p, 0, false, true),
    );
  }
  assert.equal(b.player.x, a.player.x);
  assert.equal(b.player.z, a.player.z);
  assert.equal(b.player.angle, a.player.angle);
  const time = b.time;
  p.clear();
  p.down(3, "q");
  b.update(
    0.05,
    mergeMobileInput(drivingInput(new Set()), new Set(), p, 0, false, true),
  );
  assert.equal(b.phase, "rewinding");
  assert(b.time < time);
});
test("phone quality bounds GPU pixels without changing desktop physics or high-detail selection", () => {
  for (const [w, h] of [
    [390, 844],
    [844, 390],
    [2048, 1536],
    [3440, 1440],
  ]) {
    const budget = renderBudget("auto", true, w, h, 3);
    assert(w * h * budget.pixelRatio ** 2 <= 800001);
    assert.equal(budget.shadows, false);
    assert.equal(budget.treeNear, 0);
    assert.equal(budget.treeFar, 230);
  }
  assert.equal(renderBudget("high", true, 844, 390, 3).shadows, true);
  assert.equal(renderBudget("auto", false, 1920, 1080, 1).treeNear, 105);
});
test("automatic hardware tiers protect 4 GB devices while explicit high mode remains available", () => {
  const constrained = deviceProfile({
      deviceMemory: 4,
      hardwareConcurrency: 8,
    }),
    balanced = deviceProfile({ deviceMemory: 8, hardwareConcurrency: 6 }),
    fast = deviceProfile({ deviceMemory: 16, hardwareConcurrency: 12 });
  assert.equal(constrained.tier, "constrained");
  assert.equal(constrained.lowAssets, true);
  assert.equal(balanced.tier, "balanced");
  assert.equal(fast.tier, "high");
  assert.equal(
    renderBudget("auto", false, 1920, 1080, 2, constrained).shadows,
    false,
  );
  assert.equal(
    renderBudget("auto", false, 1920, 1080, 2, balanced).cameraFar,
    3400,
  );
  assert.equal(
    renderBudget("high", false, 1920, 1080, 2, constrained).tier,
    "high",
  );
});
test("automatic rendering sheds sustained frame pressure and recovers gradually", () => {
  assert.equal(nextAdaptiveScale(1, 1 / 30), 0.9);
  assert.equal(nextAdaptiveScale(0.75, 1 / 30), 0.72);
  assert(Math.abs(nextAdaptiveScale(0.8, 1 / 60) - 0.84) < 1e-9);
  assert.equal(nextAdaptiveScale(0.8, 1 / 30, "high"), 1);
});
test("portrait cameras widen the visible road without affecting landscape cameras", () => {
  assert.equal(portraitFov(56, 16 / 9), 56);
  assert(portraitFov(56, 390 / 844) > 80);
  assert(portraitFov(76, 390 / 844) <= 100);
  assert(portraitFov(64, 390 / 844) > portraitFov(56, 390 / 844));
});
