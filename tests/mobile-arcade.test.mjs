import test from "node:test";
import assert from "node:assert/strict";
import {
  NitroBurst,
  ThumbSteering,
  PointerLedger,
  mergeMobileInput,
} from "../dist/mobile-input.js";
import { drivingInput } from "../dist/controls.js";
import {
  vehicle,
  stepVehicle,
  ChaseSimulation,
  routeBetween,
} from "../dist/simulation.js";
import { playerRoute } from "../dist/navigation-cache.js";
import worker from "../server/worker.mjs";

test("one nitro tap burns to empty, repeated taps do not refill, and recharge cannot restart it", () => {
  const p = vehicle(0, 0, 0, "gt"),
    burst = new NitroBurst();
  p.vz = p.speed = 25;
  assert(burst.start(p, "running"));
  const start = p.nitro;
  let ticks = 0;
  while (burst.read(p, "running") && ticks++ < 2400) {
    const held = burst.read(p, "running");
    stepVehicle(
      p,
      { throttle: 1, steer: 0, boost: held, boostLatched: held },
      1 / 120,
      [],
    );
    if (ticks === 40) {
      const remaining = p.nitro;
      assert(burst.start(p, "running"));
      assert.equal(p.nitro, remaining);
    }
  }
  assert(ticks < 2400);
  assert.equal(p.nitro, 0);
  assert(p.nitroLocked);
  assert(!burst.active);
  assert(!burst.start(p, "running"));
  assert(start > p.nitro);
  for (let i = 0; i < 1000; i++)
    stepVehicle(p, { throttle: 1, steer: 0 }, 1 / 120, []);
  assert(p.nitro > 22);
  assert(!burst.read(p, "running"));
  assert(burst.start(p, "running"));
});
test("thumb steering and handbrake combine with automatic gas and latched nitro in actual physics", () => {
  const p = vehicle(0, 0, 0, "gt"),
    pad = new ThumbSteering(),
    burst = new NitroBurst(),
    touch = new PointerLedger(),
    keys = new Set();
  p.vz = p.speed = 28;
  pad.down(1, 180, 96, { left: 0, top: 0, width: 200, height: 120 });
  burst.start(p, "running");
  let drifted = false;
  for (let i = 0; i < 90; i++) {
    const input = mergeMobileInput(
      drivingInput(keys),
      keys,
      touch,
      0,
      true,
      true,
      { steer: pad.steer, drift: pad.drift, burst: burst.read(p, "running") },
    );
    assert.equal(input.throttle, 1);
    assert(input.brake && input.boost && input.steer > 0);
    stepVehicle(p, input, 1 / 120, []);
    drifted ||= p.isDrifting;
  }
  assert(drifted);
  assert(p.boosting);
  assert(p.nitro < 100);
  assert(p.angle < 0);
  touch.down(2, "s");
  const input = mergeMobileInput(
    drivingInput(keys),
    keys,
    touch,
    0,
    true,
    true,
    { burst: true },
  );
  assert.equal(input.throttle, -1);
  const before = p.nitro;
  stepVehicle(p, input, 1 / 120, []);
  assert(!p.boosting, "nitro must not fight a brake/reverse pedal");
  assert(p.nitro < before, "the committed burst still consumes its fuel");
});
test("thumb ownership, drift-strip hysteresis, independent release and keyboard overrides remain predictable", () => {
  const pad = new ThumbSteering(),
    touch = new PointerLedger(),
    keys = new Set();
  const rect = { left: 0, top: 0, width: 200, height: 120 };
  assert(pad.down(1, 100, 45, rect));
  assert.equal(pad.steer, 0);
  assert(!pad.down(2, 10, 119, rect));
  pad.move(1, 20, 90);
  assert(pad.steer < 0 && pad.drift);
  pad.move(1, 20, 76);
  assert(pad.drift);
  pad.move(1, 20, 60);
  assert(!pad.drift);
  touch.down(2, " ");
  keys.add("d");
  const read = () =>
    mergeMobileInput(drivingInput(keys), keys, touch, 0, true, true, {
      steer: pad.steer,
      drift: pad.drift,
    });
  assert.equal(read().steer, 1);
  assert(read().brake);
  pad.up(2);
  assert.equal(pad.pointer, 1);
  pad.up(1);
  assert.equal(pad.pointer, null);
  assert(touch.has(" "));
  keys.clear();
  touch.clear();
  assert.equal(pad.steer, 0);
  assert(!pad.drift);
});
test("pause, rewind, wreck, recovery clearing and empty tanks cannot leave nitro latched", () => {
  for (const phase of [
    "paused",
    "rewinding",
    "ready",
    "won",
    "wrecked",
    "busted",
  ]) {
    const p = vehicle(0, 0, 0, "gt"),
      burst = new NitroBurst();
    burst.start(p, "running");
    assert(!burst.read(p, phase));
    assert(!burst.read(p, "running"));
    assert(!burst.start(p, phase));
  }
  const b = new NitroBurst(),
    p = vehicle(0, 0, 0, "gt");
  b.start(p, "running");
  b.clear();
  assert(!b.read(p, "running"));
});
test("HUD and arrows share an exact route without stale positions across movement, checkpoint changes or rewind", () => {
  const s = new ChaseSimulation();
  s.start("gt");
  const first = playerRoute(s);
  assert.equal(playerRoute(s), first);
  assert.deepEqual(first, routeBetween(s.player, s.checkpoints[0]));
  const x = s.player.x;
  s.player.x += 0.001;
  assert.notEqual(playerRoute(s), first);
  s.player.x = x;
  assert.deepEqual(playerRoute(s), first);
  s.checkpoint = 1;
  assert.deepEqual(playerRoute(s), routeBetween(s.player, s.checkpoints[1]));
  s.start("gt", { level: 2 });
  assert.deepEqual(playerRoute(s), routeBetween(s.player, s.checkpoints[0]));
});
test("only content-hashed runtime files receive immutable caching, leaving HTML and saves fresh", async () => {
  const env = {
    ASSETS: {
      fetch: async () =>
        new Response("test", { headers: { "Cache-Control": "no-cache" } }),
    },
  };
  assert.match(
    (
      await worker.fetch(new Request("https://game.test/app-AB12CD.js"), env)
    ).headers.get("Cache-Control"),
    /immutable/,
  );
  assert.equal(
    (await worker.fetch(new Request("https://game.test/"), env)).headers.get(
      "Cache-Control",
    ),
    "no-cache",
  );
  for (const asset of ["road-day.png", "audio/engine-bed.wav", "tree-near.glb"])
    assert.match(
      (
        await worker.fetch(
          new Request("https://game.test/assets/v-1234567890abcdef/" + asset),
          env,
        )
      ).headers.get("Cache-Control"),
      /immutable/,
    );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://game.test/assets/v-invalid/road-day.png"),
        env,
      )
    ).headers.get("Cache-Control"),
    "no-cache",
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://game.test/assets/road-day.png"),
        env,
      )
    ).headers.get("Cache-Control"),
    "no-cache",
  );
});
