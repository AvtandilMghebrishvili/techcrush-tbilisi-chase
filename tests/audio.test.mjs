import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  ENGINE_VOICES,
  engineTelemetry,
  spatialSound,
  PassByTracker,
} from "../dist/audio-model.js";
import { ChaseAudio } from "../dist/chase-audio.js";
import { ChaseSimulation, vehicle } from "../dist/simulation.js";

test("eight engine voices respond to throttle, settle at idle and stay below their own redline", () => {
  const signatures = new Set();
  for (const [carId, voice] of Object.entries(ENGINE_VOICES)) {
    const p = { carId, speed: 0, performance: { topSpeed: 64 } },
      original = structuredClone(p);
    let state = {};
    for (let i = 0; i < 120; i++)
      state = engineTelemetry(p, { throttle: 1 }, state, 1 / 60);
    assert(state.rpm > voice.idle + 1500);
    for (let i = 0; i < 150; i++) state = engineTelemetry(p, {}, state, 1 / 60);
    assert(Math.abs(state.rpm - voice.idle) < 1);
    assert.deepEqual(
      p,
      original,
      "Audio telemetry must not alter driving physics",
    );
    p.speed = 150;
    p.airborne = true;
    for (let i = 0; i < 120; i++)
      state = engineTelemetry(p, { throttle: 1 }, state, 1 / 60);
    assert(state.rpm <= voice.redline && state.rpm > voice.redline * 0.95);
    signatures.add(
      JSON.stringify([voice.harmonics, voice.pitch, voice.redline]),
    );
  }
  assert.equal(signatures.size, 8);
});
test("upshifts drop RPM, use hysteresis at a gear boundary, and reverse has its own label", () => {
  const p = { carId: "gt", speed: 15.7, performance: { topSpeed: 64 } };
  let s = {};
  for (let i = 0; i < 120; i++)
    s = engineTelemetry(p, { throttle: 1 }, s, 1 / 60);
  const rpm = s.rpm;
  p.speed = 16;
  s = engineTelemetry(p, { throttle: 1 }, s, 1 / 60);
  assert.equal(s.shift, 1);
  assert.equal(s.gear, 2);
  assert(s.rpm < rpm - 300);
  assert(s.shiftCut < 1);
  for (let i = 0; i < 120; i++) {
    p.speed = 15.7 + Math.sin(i) * 0.35;
    s = engineTelemetry(p, { throttle: 1 }, s, 1 / 60);
    assert.equal(s.gear, 2);
  }
  p.speed = -8;
  s = engineTelemetry(p, { throttle: -1 }, s, 1 / 60);
  assert.equal(s.gearLabel, "R");
  p.carId = "rally";
  p.speed = 0;
  s = engineTelemetry(p, {}, s, 1 / 60);
  assert.equal(s.gear, 1);
  assert(Number.isFinite(s.rpm));
});
test("stereo sides follow the driver at rotated headings and distant sources fade out", () => {
  const p = { x: 0, z: 0, angle: 0 };
  assert(spatialSound(p, { x: -8, z: 2 }).pan > 0.9);
  assert(spatialSound(p, { x: 8, z: 2 }).pan < -0.9);
  p.angle = Math.PI / 2;
  assert(spatialSound(p, { x: 0, z: 8 }).pan > 0.9);
  assert.equal(spatialSound(p, { x: 0, z: 65 }).gain, 0);
  assert.equal(spatialSound(p, { x: 0, z: 0 }).gain, 1);
});
test("a close moving pass sounds once; following, wrecks and recovery teleports do not whoosh", () => {
  const tracker = new PassByTracker(),
    p = { x: 0, z: 0, angle: 0, vx: 0, vz: 30 };
  const car = { id: 9, x: 4, z: 3, vx: 0, vz: -12 };
  assert.equal(tracker.sample(p, [car], 0).length, 0);
  car.z = -1;
  const events = tracker.sample(p, [car], 0.1);
  assert.equal(events.length, 1);
  assert(events[0].pan < 0);
  car.z = 1;
  assert.equal(
    tracker.sample(p, [car], 0.2).length,
    0,
    "contact jitter must not repeat",
  );
  tracker.reset();
  car.z = 3;
  car.vz = 30;
  tracker.sample(p, [car], 2);
  car.z = -3;
  assert.equal(tracker.sample(p, [car], 2.2).length, 0);
  tracker.reset();
  car.vz = -12;
  car.z = 3;
  tracker.sample(p, [car], 3);
  p.z = 100;
  car.z = 97;
  assert.equal(tracker.sample(p, [car], 3.2).length, 0);
  car.destroyed = true;
  assert.equal(tracker.sample(p, [car], 4).length, 0);
  assert.equal(tracker.previous.size, 0);
});
function emptySim() {
  const s = new ChaseSimulation();
  s.start();
  s.police = [];
  s.traffic = [];
  s.trees = [];
  s.poles = [];
  s.ramps = [];
  s.obstacles = [];
  s.nextWaveAt = Infinity;
  // Keep the fixture on the actual start road, away from river recovery.
  s.player.angle = 0;
  return s;
}
test("wood, metal and stone contact cues are emitted in the same physics step as breakage", () => {
  for (const material of ["wood", "metal", "stone"]) {
    const s = emptySim(),
      p = s.player;
    const prop = {
      id: 0,
      x: p.x,
      z: p.z + p.length / 2 + 0.1,
      radius: 0.4,
      breakSpeed: 4,
      soundMaterial: material,
    };
    s.poles = [prop];
    p.vz = 15;
    p.speed = 15;
    s.update(1 / 120, {});
    assert(prop.broken, material);
    const cues = s.soundEvents.filter((e) => e.kind === material);
    assert.equal(cues.length, 1);
    assert(cues[0].broken);
    assert.equal(cues[0].time, prop.fallenAt);
    assert.equal(cues[0].time, s.time);
  }
  const s = emptySim(),
    p = s.player;
  s.trees = [{ id: 0, x: p.x, z: p.z + p.length / 2 + 0.1, radius: 0.4 }];
  p.vz = 2;
  p.speed = 2;
  s.update(1 / 120, {});
  assert(!s.trees[0].broken);
  assert.equal(
    s.soundEvents[0].kind,
    "wood",
    "gentle contact must sound before the damage threshold",
  );
});
test("vehicle contacts and wall impacts produce cues; police destruction produces one explosion", () => {
  const s = emptySim(),
    p = s.player,
    cop = s.makePolice(p.x, p.z + 4);
  s.police = [cop];
  s.checkpoint = 1;
  p.vz = 22;
  p.speed = 22;
  s.update(1 / 120, {});
  assert(s.soundEvents.some((e) => e.kind === "metal"));
  cop.health = 1;
  cop.hitCooldown = 0;
  s.damagePolice(cop, 25);
  s.damagePolice(cop, 25);
  assert.equal(s.soundEvents.filter((e) => e.kind === "explosion").length, 1);
  const wall = emptySim(),
    w = wall.player;
  wall.obstacles = [{ x: w.x, z: w.z + 2.2, w: 10, d: 0.3, h: 10, angle: 0 }];
  w.vz = 30;
  w.speed = 30;
  wall.update(1 / 120, {});
  assert(wall.soundEvents.some((e) => e.kind === "stone"));
});
test("audio cues are bounded and deduplicated; rewind clears them and permits a new impact", () => {
  const s = emptySim();
  s.emitSound("wood", s.player, 20, "tree");
  s.emitSound("wood", s.player, 20, "tree");
  assert.equal(s.soundEvents.length, 1);
  s.emitSound("wood", { x: s.player.x + 200, z: s.player.z }, 20, "far");
  assert.equal(s.soundEvents.length, 1);
  for (let i = 0; i < 100; i++) s.emitSound("metal", s.player, 20, "pole" + i);
  assert(s.soundEvents.length <= 48);
  s.timeline.restore(s, 0);
  assert.equal(s.soundEvents.length, 0);
  assert.equal(s.soundCooldowns.size, 0);
  s.emitSound("wood", s.player, 20, "tree");
  assert.equal(s.soundEvents.length, 1);
});
test("muted and paused audio consume events instead of accumulating stale collisions", () => {
  const s = emptySim(),
    a = new ChaseAudio();
  s.emitSound("wood", s.player, 20, "tree");
  a.update(s, {}, 1 / 60);
  assert.equal(s.soundEvents.length, 0);
  s.phase = "paused";
  s.time = 1;
  s.emitSound("metal", s.player, 20, "pole");
  a.update(s, {}, 1 / 60);
  assert.equal(s.soundEvents.length, 0);
  assert.equal(a.passBy.previous.size, 0);
  assert.equal(a.stats.played, 0);
});
test("runtime audio matches provenance, has fast attacks and a continuous engine loop", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../data/audio-sources.json", import.meta.url)),
  );
  for (const file of manifest.files) {
    const bytes = await readFile(
      new URL("../dist/assets/audio/" + file.file, import.meta.url),
    );
    assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256);
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.readUInt32LE(24), 24000);
    const samples = [];
    for (let i = 44; i < bytes.length; i += 2)
      samples.push(bytes.readInt16LE(i) / 32768);
    assert(Math.max(...samples.map(Math.abs)) < 0.9);
    if (file.file === "engine-bed.wav") {
      assert(Math.abs(samples[0] - samples.at(-1)) < 0.07);
      assert(
        Math.abs(samples.reduce((a, b) => a + b, 0) / samples.length) < 0.001,
      );
    } else
      assert(
        samples.slice(0, 480).some((x) => Math.abs(x) > 0.01),
        "contact attack delayed more than 20 ms",
      );
  }
});
