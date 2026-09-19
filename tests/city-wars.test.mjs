import test from "node:test";
import assert from "node:assert/strict";
import { handleApi, keyHash } from "../server/api.mjs";
import { openLocalDatabase } from "../server/local-db.mjs";
import {
  newProfile,
  migrateProfile,
  applyProgressAction,
} from "../dist/progression.js";
import { mapUnlocked } from "../dist/map-selection.js";
import {
  EVENT_ID,
  EVENT_START,
  EVENT_END,
  ARTIFACT_BANNERS,
  eventProgress,
  normalizeEventHandle,
} from "../dist/event-rules.js";
import { breakReward } from "../dist/banner-rules.js";
const metrics = (score = 1000, artifacts = []) => ({
  time: 30,
  score,
  artifacts,
  checkpoints: 0,
  takedowns: 0,
  trafficWrecks: 0,
  distance: 800,
  driftSeconds: 0,
  jumps: 0,
  topSpeed: 180,
});

test("joined profiles cannot bypass event enrollment by omitting the mode on any city run", () => {
  let p = applyProgressAction(
    newProfile(),
    {
      type: "join-event",
      handle: "AlwaysEvent",
      acceptRules: true,
      subscribeAcknowledged: true,
    },
    undefined,
    { now: EVENT_START },
  );
  let now = EVENT_START + 1000;
  for (const map of ["tbilisi", "kutaisi", "batumi", "rustavi"]) {
    const options = { now, runId: "enrolled-" + map, preview: true };
    p = applyProgressAction(
      p,
      { type: "begin-run", map, car: "classic" },
      undefined,
      options,
    );
    assert.equal(p.activeRun.event, EVENT_ID);
    now += 31000;
    p = applyProgressAction(
      p,
      {
        type: "settle",
        runId: p.activeRun.id,
        level: 1,
        result: "abandoned",
        metrics: metrics(500),
      },
      undefined,
      { now },
    );
    assert.equal(eventProgress(p).scores[map].score, 500);
  }
  assert.throws(
    () =>
      applyProgressAction(
        p,
        {
          type: "begin-run",
          map: "tbilisi",
          car: "classic",
        },
        undefined,
        { now: EVENT_START - 1, runId: "clock-before-start" },
      ),
    /not started/,
  );
  const archived = structuredClone(eventProgress(p));
  const after = applyProgressAction(
    p,
    {
      type: "begin-run",
      map: "tbilisi",
      car: "classic",
    },
    undefined,
    { now: EVENT_END, runId: "regular-after-event" },
  );
  assert.equal(after.activeRun.event, undefined);
  assert.deepEqual(eventProgress(after), archived);
  const nonMember = applyProgressAction(
    newProfile(),
    {
      type: "begin-run",
      map: "tbilisi",
      car: "classic",
    },
    undefined,
    { now: EVENT_START, runId: "non-member-regular" },
  );
  assert.equal(nonMember.activeRun.event, undefined);
});
test("event dates, server-only eligibility and legacy garages preserve all existing upgrades", () => {
  assert.equal(EVENT_START, Date.parse("2026-09-20T15:00:00+04:00"));
  assert.equal(EVENT_END, Date.parse("2026-09-24T21:00:00+04:00"));
  let p = newProfile();
  p.credits = 123456;
  p.cars.gt = { engine: 4, paint: "#ffaa00" };
  delete p.maps.rustavi;
  p = migrateProfile(p);
  assert.equal(p.credits, 123456);
  assert.equal(p.cars.gt.engine, 4);
  assert.equal(p.maps.rustavi.level, 1);
  assert(!mapUnlocked(p, "rustavi", EVENT_START));
  assert(mapUnlocked(p, "rustavi", EVENT_END));
  assert.throws(
    () =>
      applyProgressAction(
        { ...p, previewAccess: true },
        { type: "begin-run", car: "gt", map: "rustavi" },
        undefined,
        { now: EVENT_START, runId: "locked-run" },
      ),
    /valid city/,
  );
  p = applyProgressAction(
    p,
    {
      type: "join-event",
      handle: "Racer_1",
      acceptRules: true,
      subscribeAcknowledged: true,
    },
    undefined,
    { now: EVENT_START },
  );
  for (const now of [EVENT_START - 1, EVENT_END])
    assert.throws(
      () =>
        applyProgressAction(
          p,
          { type: "begin-run", car: "gt", map: "tbilisi", event: EVENT_ID },
          undefined,
          { now, runId: "bad-event-run" },
        ),
      /not started|ended/,
    );
  assert.equal(normalizeEventHandle("Ｒacer_1").normalized, "racer_1");
});
test("five different artifacts persist over several banked runs, duplicates cannot unlock the mission", () => {
  let p = applyProgressAction(
    newProfile(),
    {
      type: "join-event",
      handle: "ArtifactHunter",
      acceptRules: true,
      subscribeAcknowledged: true,
    },
    undefined,
    { now: EVENT_START },
  );
  let now = EVENT_START + 1000;
  for (const map of ["tbilisi", "kutaisi", "batumi"]) {
    for (const ids of [
      ARTIFACT_BANNERS.slice(0, 2),
      ARTIFACT_BANNERS.slice(1),
    ]) {
      p = applyProgressAction(
        p,
        { type: "begin-run", map, car: "classic", event: EVENT_ID },
        undefined,
        { now, runId: `hunt-${map}-${now}` },
      );
      const action = {
        type: "settle",
        runId: p.activeRun.id,
        level: 1,
        result: "abandoned",
        metrics: metrics(1000, ids),
      };
      now += 31000;
      p = applyProgressAction(p, action, undefined, { now });
      assert.deepEqual(applyProgressAction(p, action, undefined, { now }), p);
    }
    assert.equal(eventProgress(p).artifacts[map].length, 5);
    assert.equal(eventProgress(p).scores[map].score, 2000);
    if (map !== "batumi") assert(!mapUnlocked(p, "rustavi", now));
  }
  assert(mapUnlocked(p, "rustavi", now));
  assert(eventProgress(p).lastReceipt.unlocked);
  p = applyProgressAction(
    p,
    { type: "begin-run", map: "rustavi", car: "classic", event: EVENT_ID },
    undefined,
    { now, runId: "secret-final-run" },
  );
  assert.equal(p.activeRun.event, EVENT_ID);
  assert.throws(
    () =>
      applyProgressAction(
        p,
        {
          type: "settle",
          runId: p.activeRun.id,
          level: 1,
          result: "abandoned",
          metrics: metrics(1000, [0]),
        },
        undefined,
        { now: now + 31000 },
      ),
    /Invalid event artifacts/,
  );
});
test("artifact impact is immediate, each ID is unique, career runs do not collect event items", () => {
  const sim = {
    player: { carId: "classic" },
    cashBannerIds: [],
    cashBanners: [],
    decorWrecks: 0,
    runCash: 0,
    runArtifacts: [],
    events: [],
    scoreFeedback() {},
    runOptions: { event: EVENT_ID, collectedArtifacts: [0] },
  };
  breakReward(sim, { bannerId: 0 });
  breakReward(sim, { bannerId: 3 });
  breakReward(sim, { bannerId: 3 });
  assert.deepEqual(sim.runArtifacts, [3]);
  assert.equal(sim.events.length, 1);
  delete sim.runOptions.event;
  breakReward(sim, { bannerId: 6 });
  assert.deepEqual(sim.runArtifacts, [3]);
});
test("deadline grace accepts only an on-time run and never grants extra driving time", () => {
  const begin = () => {
    const p = applyProgressAction(
      newProfile(),
      {
        type: "join-event",
        handle: "LastLap",
        acceptRules: true,
        subscribeAcknowledged: true,
      },
      undefined,
      { now: EVENT_END - 60000 },
    );
    return applyProgressAction(
      p,
      { type: "begin-run", map: "tbilisi", car: "classic", event: EVENT_ID },
      undefined,
      { now: EVENT_END - 30000, runId: "deadline-last-lap" },
    );
  };
  const settle = (p, time, now) =>
    applyProgressAction(
      p,
      {
        type: "settle",
        runId: p.activeRun.id,
        level: 1,
        result: "abandoned",
        metrics: { ...metrics(7000), time },
      },
      undefined,
      { now },
    );
  const ontime = settle(begin(), 30, EVENT_END + 1000);
  assert.equal(eventProgress(ontime).scores.tbilisi.score, 7000);
  const lateDriving = settle(begin(), 31, EVENT_END + 2000);
  assert.equal(eventProgress(lateDriving).scores.tbilisi, undefined);
  const lateTransport = settle(begin(), 30, EVENT_END + 30000);
  assert.equal(eventProgress(lateTransport).scores.tbilisi, undefined);
  assert(
    lateTransport.settled.includes("deadline-last-lap"),
    "ordinary garage progress can still bank after contest closure",
  );
});
test("API unique names, transactional totals, ranking isolation, secret gate, deadline and archived standings", async () => {
  const DB = openLocalDatabase(":memory:");
  let now = EVENT_START + 1000,
    serial = 0;
  const call = async (token, path, method = "GET", body, preview = false) => {
    const response = await handleApi(
      new Request("http://test" + path, {
        method,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
      DB,
      { now: () => now, preview },
    );
    return { status: response.status, ...(await response.json()) };
  };
  const a = "a".repeat(64),
    b = "b".repeat(64);
  let pa = await call(a, "/api/profile", "POST"),
    pb = await call(b, "/api/profile", "POST");
  const join = (handle) => ({
    type: "join-event",
    handle,
    acceptRules: true,
    subscribeAcknowledged: true,
  });
  const act = (token, p, action) =>
    call(token, "/api/action", "POST", {
      id: "event-op-" + ++serial,
      version: p.version,
      action,
    });
  try {
    now = EVENT_START - 1;
    const early = await act(a, pa, join("RaceStar"));
    assert.equal(early.status, 400);
    assert.match(early.error, /not started/);
    const unchanged = await call(a, "/api/profile");
    assert.equal(unchanged.version, pa.version);
    assert(!eventProgress(unchanged.profile));
    assert.equal((await call(a, "/api/event/leaderboard")).participants, 0);
    now = EVENT_START;
    pa = await act(a, pa, join("RaceStar"));
    assert.equal(pa.status, 200);
    const duplicate = await act(b, pb, join("RACESTAR"));
    assert.equal(duplicate.status, 400);
    pb = await call(b, "/api/profile");
    assert.equal(pb.version, 0);
    assert(!eventProgress(pb.profile));
    pb = await act(b, pb, join("OtherRacer"));
    assert.equal(pb.status, 200);
    const ordinary = await act(a, pa, {
      type: "begin-run",
      map: "rustavi",
      car: "classic",
    });
    assert.equal(ordinary.status, 400);
    const hidden = await call(a, "/api/event/leaderboard?map=challenge");
    assert.equal(hidden.status, 200);
    assert.equal(hidden.map, "challenge");
    assert.equal(hidden.challengeRevealed, false);
    for (const [token, who, score] of [
      [a, "a", 1000],
      [b, "b", 1500],
      [a, "a", 900],
    ]) {
      let p = who === "a" ? pa : pb;
      p = await act(token, p, {
        type: "begin-run",
        map: "tbilisi",
        car: "classic",
      });
      assert.equal(p.status, 200);
      assert.equal(
        p.profile.activeRun.event,
        EVENT_ID,
        "API forces the registered profile's event even without a client mode",
      );
      now += 31000;
      const body = {
        id: "settlement-" + ++serial,
        version: p.version,
        action: {
          type: "settle",
          runId: p.profile.activeRun.id,
          level: 1,
          result: "abandoned",
          metrics: metrics(score, [0]),
        },
      };
      p = await call(token, "/api/action", "POST", body);
      assert.equal(p.status, 200);
      const repeat = await call(token, "/api/action", "POST", body);
      assert.equal(repeat.version, p.version);
      const newIdReplay = await act(token, p, body.action);
      assert.equal(newIdReplay.status, 200);
      p = newIdReplay;
      if (who === "a") pa = p;
      else pb = p;
    }
    const board = await call(a, "/api/event/leaderboard");
    assert.equal(board.entries[0].name, "RaceStar");
    assert.equal(board.entries[0].score, 1900);
    assert.equal(board.mine.rank, 1);
    assert.equal(board.total, 2);
    assert(!JSON.stringify(board).includes(await keyHash(a)));
    assert.equal(
      (await call(a, "/api/event/leaderboard?map=kutaisi")).total,
      0,
    );
    pa = await act(a, pa, {
      type: "begin-run",
      map: "tbilisi",
      car: "classic",
      event: EVENT_ID,
    });
    now = EVENT_END + 31000;
    pa = await act(a, pa, {
      type: "settle",
      runId: pa.profile.activeRun.id,
      level: 1,
      result: "abandoned",
      metrics: metrics(7000),
    });
    assert.equal(pa.status, 200);
    assert.equal(
      (await call(a, "/api/event/leaderboard")).entries[0].score,
      1900,
      "late totals excluded, career save retained",
    );
    const open = await act(a, pa, {
      type: "begin-run",
      map: "rustavi",
      car: "classic",
    });
    assert.equal(open.status, 200);
    assert.equal((await call(a, "/api/event/leaderboard")).phase, "ended");
    assert.equal((await act(b, pb, join("OtherRacer"))).status, 400);
  } finally {
    DB.close();
  }
});

test("first saved hunt reveals the challenge globally without unlocking it for other racers; notice follows profile", async () => {
  const DB = openLocalDatabase(":memory:");
  let now = EVENT_START + 1000,
    serial = 0;
  const tokens = ["c".repeat(64), "d".repeat(64)];
  const call = async (token, path, method = "GET", body, preview = false) => {
    const res = await handleApi(
      new Request("http://test" + path, {
        method,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
      DB,
      { now: () => now, preview },
    );
    return { status: res.status, ...(await res.json()) };
  };
  const act = (token, p, action) =>
    call(token, "/api/action", "POST", {
      id: "reveal-op-" + ++serial,
      version: p.version,
      action,
    });
  try {
    let hunter = await call(tokens[0], "/api/profile", "POST");
    const viewer = await call(tokens[1], "/api/profile", "POST");
    hunter = await act(tokens[0], hunter, {
      type: "event-notice-seen",
      event: EVENT_ID,
    });
    const seenAt = hunter.profile.eventNotices[EVENT_ID];
    now += 1000;
    hunter = await act(tokens[0], hunter, {
      type: "event-notice-seen",
      event: EVENT_ID,
    });
    assert.equal(hunter.profile.eventNotices[EVENT_ID], seenAt);
    assert.equal(
      (await call(tokens[0], "/api/profile")).profile.eventNotices[EVENT_ID],
      seenAt,
    );
    assert(!viewer.profile.eventNotices);
    assert.equal(
      (
        await call(
          tokens[1],
          "/api/event/leaderboard?map=challenge",
          "GET",
          undefined,
          true,
        )
      ).challengeRevealed,
      false,
      "preview access must not spoil the public identity",
    );
    hunter = await act(tokens[0], hunter, {
      type: "join-event",
      handle: "FirstHunter",
      acceptRules: true,
      subscribeAcknowledged: true,
    });
    for (const map of ["tbilisi", "kutaisi", "batumi"]) {
      hunter = await act(tokens[0], hunter, {
        type: "begin-run",
        map,
        car: "classic",
        event: EVENT_ID,
      });
      now += 31000;
      hunter = await act(tokens[0], hunter, {
        type: "settle",
        runId: hunter.profile.activeRun.id,
        level: 1,
        result: "abandoned",
        metrics: metrics(1000, ARTIFACT_BANNERS),
      });
      assert.equal(hunter.status, 200);
      const board = await call(
        tokens[1],
        "/api/event/leaderboard?map=challenge",
      );
      assert.equal(board.challengeRevealed, map === "batumi");
      assert.equal(board.map, map === "batumi" ? "rustavi" : "challenge");
    }
    assert(mapUnlocked(hunter.profile, "rustavi", now));
    assert(!mapUnlocked(viewer.profile, "rustavi", now));
    const locked = await act(tokens[1], viewer, {
      type: "begin-run",
      map: "rustavi",
      car: "classic",
    });
    assert.equal(locked.status, 400);
    assert.equal(
      (await call(tokens[1], "/api/event/leaderboard?map=tbilisi"))
        .challengeRevealed,
      true,
    );
  } finally {
    DB.close();
  }
});
