import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../dist/vendor/three.module.js";
import { levelCondition } from "../dist/level-conditions.js";
import { checkpointsForLevel } from "../dist/level-routes.js";
import { onAsphalt, roadClear } from "../dist/road-clearance.js";
import { TREES } from "../dist/world-props.js";
import { BRIDGE_BARRIERS } from "../dist/bridge-data.js";
import { START, ROADS } from "../dist/city-map.js";
import {
  registerBreakable,
  calibrateRoadsideProps,
  updateBreakables,
} from "../dist/breakable-props.js";
import { ChaseSimulation } from "../dist/simulation.js";
import { ChaseAudio } from "../dist/chase-audio.js";
import { handleApi, keyHash } from "../server/api.mjs";
import { resultPage } from "../server/result-page.mjs";
import worker from "../server/worker.mjs";
import { openLocalDatabase } from "../server/local-db.mjs";
import { TIME_COURSE } from "../dist/race-timing.js";

test("ranked levels use reproducible shuffled conditions and roomy road gates", () => {
  assert.deepEqual(
    [1, 2, 3].map((l) => levelCondition(l).mode),
    ["dusk", "night", "day"],
  );
  const fingerprints = new Set();
  for (let level = 1; level <= 300; level++) {
    assert.deepEqual(levelCondition(level), levelCondition(level));
    if (level % 3 === 1)
      assert.equal(
        new Set([0, 1, 2].map((d) => levelCondition(level + d).mode)).size,
        3,
      );
    const points = checkpointsForLevel(level);
    fingerprints.add(JSON.stringify(points));
    assert.equal(new Set(points.map((p) => `${p.x},${p.z}`)).size, 6);
    if (level === 1) continue;
    for (const p of points)
      for (const x of [-7, 0, 7])
        for (const z of [-2, 0, 2])
          assert(
            onAsphalt({
              x: p.x + Math.cos(p.angle) * x + Math.sin(p.angle) * z,
              z: p.z - Math.sin(p.angle) * x + Math.cos(p.angle) * z,
            }),
          );
  }
  assert.equal(fingerprints.size, 300, "No short periodic route cycle");
});

test("all planted trees and surviving bridge rail midpoints leave actual asphalt clear", () => {
  assert(TREES.length > 500);
  assert(TREES.every((p) => roadClear(p, 1.2)));
  assert(BRIDGE_BARRIERS.length > 10, "Keep safety rails at the deck edges");
  assert(BRIDGE_BARRIERS.every((p) => !onAsphalt(p)));
});

test("misplaced linked props move together once; contact and rewind retain calibrated positions", () => {
  const scene = new THREE.Group(),
    root = new THREE.Group(),
    r = ROADS[0];
  scene.add(root);
  root.position.set(r.start.x, 0, r.start.z);
  const view = { breakableProps: [] };
  registerBreakable(view, root, r.start.x, r.start.z, 2, 0.4);
  registerBreakable(view, root, r.start.x + 1, r.start.z, 2, 0.4);
  calibrateRoadsideProps(view);
  assert.equal(view.roadsideCalibration.moved, 1);
  const [a, b] = view.breakableProps;
  assert.equal(b.definition.x - a.definition.x, 1);
  assert(
    view.breakableProps.every((e) =>
      roadClear(e.definition, e.definition.radius + 0.4),
    ),
  );
  const pos = root.position.clone();
  updateBreakables(view, {
    time: 0,
    poles: [
      { broken: true, fallenAt: 0, fallAngle: 1 },
      { broken: true, fallenAt: 0, fallAngle: 1 },
    ],
  });
  assert(root.position.equals(pos));
  updateBreakables(view, { time: 0, poles: [] });
  assert(root.position.equals(pos));
});

test("a checkpoint and a completed escape emit one finite musical cue each", () => {
  const s = new ChaseSimulation();
  s.start();
  s.police = [];
  s.traffic = [];
  s.nextWaveAt = Infinity;
  Object.assign(s.player, s.checkpoints[0], { speed: 0, vx: 0, vz: 0 });
  s.update(1 / 120, {});
  assert.equal(s.soundEvents.filter((e) => e.kind === "checkpoint").length, 1);
  for (let i = 0; i < 20; i++) s.update(1 / 120, {});
  assert.equal(s.soundEvents.filter((e) => e.kind === "checkpoint").length, 1);
  s.checkpoint = 6;
  s.escape = 7.995;
  s.update(1 / 120, {});
  assert.equal(s.phase, "won");
  assert.equal(s.soundEvents.filter((e) => e.kind === "level-clear").length, 1);
  const a = new ChaseAudio();
  let buffers = 0,
    played = [];
  a.context = {
    sampleRate: 48000,
    createBuffer(ch, n, sr) {
      buffers++;
      const pcm = new Float32Array(n);
      return { duration: n / sr, getChannelData: () => pcm };
    },
  };
  a.play = (buffer) => played.push(buffer);
  a.cue();
  a.cue();
  a.cue(true);
  assert.equal(buffers, 2);
  assert.equal(played[0], played[1]);
  assert(played[2].duration <= 1.25);
  for (const b of played)
    assert(
      b.getChannelData(0).every((v) => Number.isFinite(v) && Math.abs(v) < 1),
    );
});

test("saved result links expose only a listed driver's immutable validated finish; old clients retain progress", async () => {
  const DB = openLocalDatabase(":memory:"),
    token = "d".repeat(64),
    hash = await keyHash(token);
  let n = 0;
  const req = (path, method = "GET", body) =>
    handleApi(
      new Request("https://game.test" + path, {
        method,
        headers: { Authorization: "Bearer " + token },
        body: body ? JSON.stringify(body) : undefined,
      }),
      DB,
    );
  const act = async (action) => {
    const profile = await (await req("/api/profile")).json();
    const body = {
      id: "result-operation-" + n++,
      version: profile.version,
      action,
    };
    const r = await req("/api/action", "POST", body);
    assert.equal(r.status, 200, await r.clone().text());
    return { data: await r.json(), body };
  };
  try {
    await req("/api/profile", "POST");
    await act({ type: "driver", name: "Nika Co", avatar: "red", listed: true });
    const finish = async (course) => {
      const { data } = await act({ type: "begin-run", car: "gt", course });
      data.profile.activeRun.startedAt = Date.now() - 120000;
      await DB.prepare("UPDATE garages SET profile=? WHERE key_hash=?")
        .bind(JSON.stringify(data.profile), hash)
        .run();
      return act({
        type: "settle",
        runId: data.profile.activeRun.id,
        level: data.profile.level,
        result: "won",
        metrics: {
          time: 80,
          score: 14000,
          checkpoints: 6,
          takedowns: 1,
          trafficWrecks: 0,
          distance: 2200,
          driftSeconds: 8,
          jumps: 0,
          topSpeed: 250,
          timing: { course, elapsedMs: 85000, rewinds: 2 },
        },
      });
    };
    const first = await finish(TIME_COURSE),
      id = first.data.profile.community.lastTime.runId,
      url = "https://game.test/result/" + id;
    const response = await worker.fetch(new Request(url), {
      DB,
      ASSETS: {
        fetch() {
          throw Error("Must not launch the game for a result URL");
        },
      },
    });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert(html.includes("Nika Co"));
    assert(html.includes("Level 1 in 1:25.00"));
    assert(html.includes("14,000 points"));
    assert(html.includes('property="og:description"'));
    assert(!html.includes(token));
    assert(!html.includes(hash));
    assert(!html.includes("<script"));
    await req("/api/action", "POST", first.body);
    assert.equal(
      (
        await DB.prepare("SELECT COUNT(*) AS n FROM race_results")
          .bind()
          .first()
      ).n,
      1,
    );
    await finish("tbilisi-1.13");
    assert.equal((await (await req("/api/profile")).json()).profile.level, 3);
    assert.equal(
      await (await resultPage(new Request(url), DB)).text(),
      html,
      "Later races do not rewrite a shared finish",
    );
    const board = await (
      await req("/api/leaderboard?mode=times&level=2")
    ).json();
    assert.equal(
      board.total,
      0,
      "Old courses cannot pollute current time ranks",
    );
    const archive = await (
      await req("/api/leaderboard?mode=times&level=2&course=tbilisi-1.13")
    ).json();
    assert.equal(archive.total, 1);
    assert.equal(archive.courseLabel, "TBILISI · COURSE 1.13");
    await DB.prepare("UPDATE garages SET display_name=? WHERE key_hash=?")
      .bind("Nika & <test>", hash)
      .run();
    assert(
      (await (await resultPage(new Request(url), DB)).text()).includes(
        "Nika &amp; &lt;test&gt;",
      ),
    );
    await act({
      type: "driver",
      name: "Nika Co",
      avatar: "red",
      listed: false,
    });
    assert.equal((await resultPage(new Request(url), DB)).status, 404);
    assert.equal(
      (await resultPage(new Request("https://game.test/result/<script>"), DB))
        .status,
      404,
    );
  } finally {
    DB.close();
  }
});

test("brief showers reuse one small GPU buffer, respect manual lighting and never schedule idle work", async () => {
  const { CityWeather, showerAt, RAIN_STREAKS } = await import(
    "../dist/city-weather.js"
  );
  const scene = new THREE.Scene(),
    rain = new CityWeather(scene),
    geo = rain.mesh.geometry;
  const wet = Array.from({ length: 20 }, (_, i) => i + 1).find((l) =>
    Array.from({ length: 100 }, (_, t) => t).some((t) => showerAt(t, l) > 0),
  );
  const t = Array.from({ length: 100 }, (_, t) => t).find(
    (t) => showerAt(t, wet) === 1,
  );
  assert(wet && t);
  assert.equal(showerAt(t, wet, "day"), 0);
  const sim = {
    phase: "running",
    time: t,
    level: wet,
    player: { x: 5, y: 0, z: 10 },
  };
  rain.update(sim);
  assert(rain.mesh.visible);
  assert.equal(geo.attributes.position.count, RAIN_STREAKS * 2);
  for (let i = 0; i < 200; i++) {
    sim.time = t + i / 60;
    rain.update(sim);
  }
  assert.equal(rain.mesh.geometry, geo);
  assert.equal(scene.children.length, 1);
  sim.time = 200;
  rain.update(sim);
  assert(!rain.mesh.visible);
  sim.time = t;
  sim.phase = "won";
  rain.update(sim);
  assert(!rain.mesh.visible);
});
