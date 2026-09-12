import test from "node:test";
import assert from "node:assert/strict";
import { RaceClock, TIME_COURSE, formatRaceTime } from "../dist/race-timing.js";
import {
  newProfile,
  applyProgressAction,
  migrateProfile,
} from "../dist/progression.js";
import { handleApi, keyHash } from "../server/api.mjs";
import { openLocalDatabase } from "../server/local-db.mjs";
import { BRIDGE_DECKS, PEACE_DECK, BANK_CAPS } from "../dist/bridge-data.js";
import { ROAD_SURFACE } from "../dist/road-surface-data.js";
import { beginWater, unsupportedWater } from "../dist/water.js";
import { indexedPolygons, onIndexedSurface } from "../dist/surface-support.js";
import {
  vehicle,
  resolveCircleRect,
  ChaseSimulation,
} from "../dist/simulation.js";
import { BUILDINGS, ROADS, CLOCK_PARTS } from "../dist/city-map.js";
import { buildingContact } from "../dist/building-contact.js";
const metrics = (elapsedMs = 85000) => ({
  time: 80,
  score: 14000,
  checkpoints: 6,
  takedowns: 1,
  trafficWrecks: 0,
  distance: 2200,
  driftSeconds: 8,
  jumps: 0,
  topSpeed: 250,
  timing: { course: TIME_COURSE, elapsedMs, rewinds: 0 },
});

test("race clock counts active wall time including slow frames and rewind, excludes pause/loading", () => {
  const c = new RaceClock();
  c.reset(0);
  c.setActive(true, 100);
  c.sample(1100);
  assert.equal(c.elapsedMs, 1000);
  c.setActive(false, 1200);
  c.sample(9000);
  assert.equal(c.elapsedMs, 1100);
  c.setActive(true, 10000);
  c.sample(15000);
  assert.equal(c.elapsedMs, 6100, "A slow frame cannot create a faster time");
  const s = new ChaseSimulation();
  s.start();
  for (let i = 0; i < 90; i++) s.update(1 / 120, {});
  c.rewind(true);
  c.rewind(true);
  s.timeline.back(s, 0.1);
  c.sample(16000);
  assert.equal(c.rewinds, 1);
  assert.equal(c.elapsedMs, 7100);
  assert(s.time < 0.75);
  c.rewind(false);
  c.rewind(true);
  assert.equal(c.rewinds, 2);
  assert.equal(formatRaceTime(125439), "2:05.43");
  assert.equal(formatRaceTime(null), "—");
});

test("timed tickets freeze equipment and only successful validated clears get a record", () => {
  let p = newProfile();
  p.cars.gt.engine = 4;
  p = applyProgressAction(
    p,
    { type: "begin-run", car: "gt", course: TIME_COURSE },
    undefined,
    { runId: "timed-run-000", now: 1000 },
  );
  assert.equal(p.activeRun.buildPoints, 4);
  p.cars.gt.engine = 0;
  const action = {
    type: "settle",
    runId: p.activeRun.id,
    level: 1,
    result: "won",
    metrics: metrics(),
  };
  const won = applyProgressAction(p, action, undefined, { now: 100000 });
  assert.equal(won.community.lastTime.buildPoints, 4);
  assert.equal(won.community.lastTime.level, 1);
  assert.equal(won.level, 2);
  assert.equal(
    applyProgressAction(p, { ...action, metrics: metrics(85001) }, undefined, {
      now: 100000,
    }).community.lastTime.elapsedMs,
    85010,
    "The stored tie precision matches the hundredths shown on screen",
  );
  const failed = applyProgressAction(
    p,
    { ...action, result: "abandoned" },
    undefined,
    { now: 100000 },
  );
  assert.equal(failed.community.lastTime, null);
  for (const timing of [
    { course: "old", elapsedMs: 85000, rewinds: 0 },
    { course: TIME_COURSE, elapsedMs: 1, rewinds: 0 },
    { course: TIME_COURSE, elapsedMs: Infinity, rewinds: 0 },
    { course: TIME_COURSE, elapsedMs: 85000, rewinds: -1 },
  ])
    assert.throws(() =>
      applyProgressAction(
        p,
        { ...action, metrics: { ...metrics(), timing } },
        undefined,
        { now: 100000 },
      ),
    );
  const old = { ...metrics() };
  delete old.timing;
  assert.equal(
    applyProgressAction(p, { ...action, metrics: old }, undefined, {
      now: 100000,
    }).level,
    2,
    "Old clients still bank progress",
  );
  const oldProfile = newProfile();
  oldProfile.level = 17;
  oldProfile.credits = 4321;
  delete oldProfile.community.lastTime;
  const migrated = migrateProfile(oldProfile);
  assert.equal(migrated.credits, 4321);
  assert.equal(migrated.level, 17);
  assert.equal(migrated.community.lastTime, null);
});

async function fixture() {
  const DB = openLocalDatabase(":memory:");
  let serial = 0;
  async function req(token, path, method = "GET", body) {
    return handleApi(
      new Request("https://game.test" + path, {
        method,
        headers: token ? { Authorization: "Bearer " + token } : {},
        body: body ? JSON.stringify(body) : undefined,
      }),
      DB,
    );
  }
  async function action(token, data, version) {
    const current =
      version == null
        ? await (await req(token, "/api/profile")).json()
        : { version };
    const r = await req(token, "/api/action", "POST", {
      id: "time-test-action-" + serial++,
      version: current.version,
      action: data,
    });
    const body = await r.json();
    assert.equal(r.status, 200, JSON.stringify(body));
    return body;
  }
  async function driver(token, name, car = "gt", tuned = false) {
    await req(token, "/api/profile", "POST");
    await action(token, { type: "driver", name, avatar: "cyan", listed: true });
    if (tuned) await action(token, { type: "upgrade", car, part: "engine" });
  }
  async function begin(token, car = "gt") {
    const r = await action(token, {
      type: "begin-run",
      car,
      course: TIME_COURSE,
    });
    r.profile.activeRun.startedAt = Date.now() - 120000;
    await DB.prepare("UPDATE garages SET profile=? WHERE key_hash=?")
      .bind(JSON.stringify(r.profile), await keyHash(token))
      .run();
    return r;
  }
  async function clear(token, ms = 85000, car = "gt") {
    const r = await begin(token, car);
    return action(token, {
      type: "settle",
      runId: r.profile.activeRun.id,
      level: r.profile.level,
      result: "won",
      metrics: metrics(ms),
    });
  }
  return { DB, req, action, driver, begin, clear };
}
test("shared level times rank independent drivers fairly by level, car and stock; privacy stays live", async () => {
  const f = await fixture(),
    tokens = ["a", "b", "c"].map((x) => x.repeat(64));
  try {
    for (let i = 0; i < 3; i++) {
      await f.driver(
        tokens[i],
        "Driver " + i,
        i === 2 ? "classic" : "gt",
        i === 1,
      );
      await f.clear(
        tokens[i],
        i === 1 ? 82000 : 85000,
        i === 2 ? "classic" : "gt",
      );
    }
    const board = await (
      await f.req(tokens[2], "/api/leaderboard?mode=times&level=1")
    ).json();
    assert.deepEqual(
      board.entries.map((r) => r.durationMs),
      [82000, 85000, 85000],
    );
    assert.deepEqual(
      board.entries.map((r) => r.rank),
      [1, 2, 2],
    );
    assert.equal(board.me.rank, 2);
    assert.equal(board.entries[0].buildPoints, 1);
    const stock = await (
      await f.req(
        null,
        "/api/leaderboard?mode=times&level=1&build=stock&car=gt",
      )
    ).json();
    assert.equal(stock.total, 1);
    assert.equal(stock.entries[0].name, "Driver 0");
    await f.clear(tokens[0], 91000);
    const level2 = await (
      await f.req(null, "/api/leaderboard?mode=times&level=2")
    ).json();
    assert.equal(level2.total, 1);
    assert.equal(level2.entries[0].durationMs, 91000);
    assert.equal(
      (await (await f.req(null, "/api/leaderboard?mode=times&level=1")).json())
        .total,
      3,
    );
    await f.action(tokens[1], {
      type: "driver",
      name: "Driver 1",
      avatar: "red",
      listed: false,
    });
    assert.equal(
      (await (await f.req(null, "/api/leaderboard?mode=times&level=1")).json())
        .total,
      2,
    );
    const text = JSON.stringify(board);
    for (const token of tokens) {
      assert(!text.includes(token));
      assert(!text.includes(await keyHash(token)));
    }
    assert(!text.includes("key_hash"));
    assert(!text.includes("profile"));
    for (const q of [
      "level=-1",
      "level=1.2",
      "car=__proto__",
      "build=other",
      "page=-1",
    ])
      assert.equal(
        (await f.req(null, "/api/leaderboard?mode=times&" + q)).status,
        400,
      );
  } finally {
    f.DB.close();
  }
});
test("timing insert and garage settlement are atomic, including competing reports for one ticket", async () => {
  const f = await fixture(),
    t = "d".repeat(64);
  try {
    await f.driver(t, "Atomic timer");
    const r = await f.begin(t);
    const base = {
      type: "settle",
      runId: r.profile.activeRun.id,
      level: 1,
      result: "won",
    };
    const responses = await Promise.all(
      [85000, 82000].map((ms, i) =>
        f.req(t, "/api/action", "POST", {
          id: "competing-time-" + i,
          version: r.version,
          action: { ...base, metrics: metrics(ms) },
        }),
      ),
    );
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
    const success = await responses.find((r) => r.status === 200).json();
    const record = await f.DB.prepare(
      "SELECT duration_ms FROM level_records WHERE key_hash=?",
    )
      .bind(await keyHash(t))
      .first();
    assert.equal(
      record.duration_ms,
      success.profile.community.lastTime.elapsedMs,
    );
    const shared = await f.DB.prepare(
      "SELECT duration_ms FROM race_results WHERE id=?",
    )
      .bind(base.runId)
      .first();
    assert.equal(shared.duration_ms, record.duration_ms);
    assert.equal(success.profile.level, 2);
    assert.equal(success.profile.boxes, 2);
    await f.action(t, { ...base, metrics: metrics(80000) });
    const unchanged = await f.DB.prepare(
      "SELECT duration_ms FROM level_records WHERE key_hash=?",
    )
      .bind(await keyHash(t))
      .first();
    assert.equal(unchanged.duration_ms, record.duration_ms);
  } finally {
    f.DB.close();
  }
});

const pointOn = (b, side, along) => ({
  x: b.x + Math.cos(b.angle) * side + Math.sin(b.angle) * along,
  z: b.z - Math.sin(b.angle) * side + Math.cos(b.angle) * along,
});
test("every visible bridge deck and bank cap supports tires right up to its edge", () => {
  for (const b of [...BRIDGE_DECKS, PEACE_DECK, ...BANK_CAPS])
    for (const side of [-1, 0, 1])
      for (const t of [-0.45, 0, 0.45]) {
        const p = pointOn(b, side * (b.width / 2 - 0.01), b.length * t);
        assert(
          !unsupportedWater(p),
          `Visible surface is unsupported: ${JSON.stringify({ b, p })}`,
        );
        assert(!beginWater(Object.assign(vehicle(), p), 0));
      }
});
test("an overhanging bumper stays on the bank; a fully unsupported car falls and rewinds", () => {
  const b = BANK_CAPS[4];
  let found = false;
  for (const direction of [-1, 1]) {
    const rim = pointOn(b, direction * (b.width / 2 + 0.25), 0);
    const car = Object.assign(vehicle(), rim, { angle: b.angle + Math.PI / 2 });
    if (!unsupportedWater(car)) continue;
    assert(!beginWater(car, 1), "Rear tires still supported");
    Object.assign(car, pointOn(b, direction * (b.width / 2 + 5), 0));
    if (unsupportedWater(car)) {
      assert(beginWater(car, 2));
      found = true;
    }
  }
  assert(found);
});
test("road/sidewalk polygon interiors never act like open water, including bridge junction flares", () => {
  const asphalt = indexedPolygons(ROAD_SURFACE.asphalt),
    sidewalk = indexedPolygons(ROAD_SURFACE.sidewalk);
  for (const r of ROADS)
    for (let t = 0; t <= 1; t += 0.1)
      for (const side of [-1, 1]) {
        const width = r.width / 2 + 3.9,
          p = {
            x:
              r.start.x +
              (r.end.x - r.start.x) * t +
              Math.cos(r.angle) * side * width,
            z:
              r.start.z +
              (r.end.z - r.start.z) * t -
              Math.sin(r.angle) * side * width,
          };
        if (onIndexedSurface(asphalt, p) || onIndexedSurface(sidewalk, p))
          assert(!unsupportedWater(p), r.name);
      }
});
test("wall contact matches chassis width, rotated faces and real cornices rather than an oversized circle", () => {
  for (const angle of [0, 0.3, Math.PI / 2, -2.3]) {
    const b = { x: 0, z: 0, w: 20, d: 30, h: 20, angle };
    const p = pointOn({ x: 0, z: 0, angle }, 11.05, 0),
      c = Object.assign(vehicle(), p, { angle });
    assert(!buildingContact(c, b), "5 cm clearance must be driveable");
    Object.assign(c, pointOn({ x: 0, z: 0, angle }, 10.8, 0), {
      vx: -Math.cos(angle) * 20,
      vz: Math.sin(angle) * 20,
    });
    assert(buildingContact(c, b));
    assert(c.impact > 19);
    const pos = { x: c.x, z: c.z };
    assert(!buildingContact(c, b));
    assert.deepEqual({ x: c.x, z: c.z }, pos);
  }
  const normal = BUILDINGS.find((b) => b.cornices),
    c = Object.assign(
      vehicle(),
      pointOn({ ...normal }, normal.w / 2 + 1.2, 0),
      { angle: normal.angle },
    );
  assert(buildingContact(c, normal), "Visible ground cornice is solid");
  assert(
    CLOCK_PARTS.some((b) => b.w === 25 && b.d === 46),
    "Clock wing uses the rendered body dimensions",
  );
  const tube = BUILDINGS.find((b) => b.tubeSection);
  const under = Object.assign(vehicle(), { x: tube.x, z: tube.z });
  assert(
    !resolveCircleRect(under, 2.3, tube),
    "Elevated shells leave real clearance",
  );
  const dome = {
    x: 0,
    z: 0,
    w: 14,
    d: 14,
    base: 2.2,
    h: 6.4,
    angle: 0,
    dome: { radius: 7, height: 4.2 },
  };
  assert(
    !buildingContact(Object.assign(vehicle(6.5, 6.5), { y: 4 }), dome),
    "A dome's empty square corner is not solid",
  );
});
