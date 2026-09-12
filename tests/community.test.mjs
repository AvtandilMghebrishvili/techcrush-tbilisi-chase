import test from "node:test";
import assert from "node:assert/strict";
import {
  newProfile,
  migrateProfile,
  applyProgressAction,
} from "../dist/progression.js";
import {
  levelRewards,
  creditAward,
  clearReward,
  normalizeName,
  weekKey,
  ACHIEVEMENTS,
} from "../dist/community-rules.js";
import { ChaseSimulation } from "../dist/simulation.js";
import { handleApi, keyHash } from "../server/api.mjs";
import { readLeaderboard } from "../server/leaderboard.mjs";
import { openLocalDatabase } from "../server/local-db.mjs";
const now = Date.UTC(2026, 8, 14, 12),
  metrics = (extra = {}) => ({
    time: 80,
    score: 18000,
    checkpoints: 6,
    takedowns: 1,
    trafficWrecks: 1,
    distance: 2500,
    driftSeconds: 12,
    jumps: 1,
    topSpeed: 250,
    ...extra,
  });
function begin(p, id = "test-run-00001", at = now - 100000) {
  return applyProgressAction(
    p,
    { type: "begin-run", car: "classic" },
    undefined,
    { runId: id, now: at },
  );
}
function settle(p, extra = {}, at = now) {
  return applyProgressAction(
    p,
    {
      type: "settle",
      runId: p.activeRun.id,
      level: p.level,
      result: "won",
      metrics: metrics(),
      ...extra,
    },
    undefined,
    { now: at },
  );
}
test("new and legacy drivers migrate privately without losing garage data", () => {
  const p = newProfile();
  delete p.community;
  delete p.driver;
  p.schema = 2;
  p.level = 7;
  p.credits = 9000;
  p.cars.gt.engine = 3;
  const next = migrateProfile(p);
  assert.equal(next.schema, 4);
  assert.equal(next.driver.listed, false);
  assert.equal(next.community.runs, 0);
  assert.equal(next.community.furthestLevel, 7);
  assert.equal(next.credits, 9000);
  assert.equal(next.cars.gt.engine, 3);
  assert.equal(p.schema, 2);
});
test("driver names accept Georgian, normalize spacing and reject markup/control characters", () => {
  assert.equal(normalizeName("  გიორგი   99 "), "გიორგი 99");
  for (const name of [
    "x",
    "<img src=x>",
    "a\u202eb",
    "a\u0000b",
    "a".repeat(21),
  ])
    assert.throws(() => normalizeName(name));
  const p = applyProgressAction(newProfile(), {
    type: "driver",
    name: "Tech Friend",
    avatar: "cyan",
    listed: true,
  });
  assert.equal(p.driver.name, "Tech Friend");
  assert(p.driver.listed);
  assert.throws(() =>
    applyProgressAction(p, {
      type: "driver",
      name: "valid",
      avatar: "url(x)",
      listed: true,
    }),
  );
});
test("level multipliers increase points and credits; cash is derived by server from counters", () => {
  assert.deepEqual(levelRewards(1), { score: 1, cash: 1 });
  assert.deepEqual(levelRewards(3), { score: 1.3, cash: 1.2 });
  let p = newProfile();
  p.level = 3;
  p = settle(begin(p));
  assert.equal(
    p.community.lastReward.runCash,
    6 * creditAward(150, 3) +
      creditAward(350, 3) +
      creditAward(120, 3) +
      creditAward(800, 3),
  );
  assert.equal(p.community.lastReward.clear, clearReward(3));
  assert.equal(p.level, 4);
  assert.equal(p.community.bestScore, 18000);
});
test("daily reward, streak box and achievements are awarded once and use UTC rollover", () => {
  let p = newProfile();
  for (let i = 0; i < 3; i++) {
    p = settle(begin(p, "streak-run-000" + i));
    assert.equal(p.community.lastReward.daily, i ? 0 : 500);
  }
  assert.equal(p.community.streak, 3);
  assert.equal(p.boxes, 5);
  assert(p.community.badges.includes("untouchable"));
  assert.equal(new Set(p.community.badges).size, p.community.badges.length);
  const before = p.credits;
  p = settle(begin(p, "streak-next-0000"), {}, now + 86400000);
  assert.equal(p.community.lastReward.daily, 500);
  assert(!p.community.lastReward.badges.includes("first-escape"));
  assert(p.credits > before);
  p = settle(
    begin(p, "abandon-run-0000", now + 86400000),
    {
      result: "abandoned",
      metrics: metrics({
        time: 1,
        score: 3,
        checkpoints: 0,
        distance: 1,
        driftSeconds: 0,
        jumps: 0,
        takedowns: 0,
        trafficWrecks: 0,
      }),
    },
    now + 86401000,
  );
  assert.equal(p.community.streak, 0);
  assert.equal(p.community.bestStreak, 4);
});
test("a ticket settles once, mismatched/replayed and implausible runs cannot be credited", () => {
  const p = begin(newProfile());
  const won = settle(p);
  assert.deepEqual(
    applyProgressAction(won, { type: "settle", runId: p.activeRun.id }),
    won,
  );
  for (const change of [
    { runId: "wrong-id-0000" },
    { metrics: metrics({ score: Infinity }) },
    { metrics: metrics({ time: 200 }) },
    { metrics: metrics({ checkpoints: 5 }) },
    { metrics: metrics({ score: 99999999 }) },
    { metrics: metrics({ distance: 999999 }) },
    { metrics: metrics({ jumps: 900 }) },
  ])
    assert.throws(() => settle(p, change));
  assert.throws(() =>
    applyProgressAction(p, {
      type: "settle",
      runId: p.activeRun.id,
      level: 1,
      cash: 800,
      result: "won",
    }),
  );
  assert.equal(p.credits, 1000);
});
test("week resets by Monday UTC; failed/abandoned runs contribute banked points", () => {
  assert.equal(weekKey(Date.UTC(2026, 8, 13, 23, 59)), "2026-09-07");
  assert.equal(weekKey(now), "2026-09-14");
  let p = settle(begin(newProfile()));
  p = settle(
    begin(p, "week-two-run-000", now + 7 * 86400000 - 100000),
    { result: "wrecked", metrics: metrics({ score: 1200, checkpoints: 2 }) },
    now + 7 * 86400000,
  );
  assert.equal(p.community.weekScore, 1200);
  assert.equal(p.community.weekWins, 0);
  assert.equal(p.community.totalScore, 19200);
  assert.equal(p.community.bestScore, 18000);
});
test("simulation earns scaled points/cash and rewind restores all community counters", () => {
  const a = new ChaseSimulation(),
    b = new ChaseSimulation();
  a.start("classic", { level: 1 });
  b.start("classic", { level: 3 });
  for (const s of [a, b]) {
    s.police = [];
    s.traffic = [];
    s.trees = [];
    s.nextWaveAt = Infinity;
  }
  for (let i = 0; i < 120; i++)
    for (const s of [a, b]) s.update(1 / 120, { throttle: 1 });
  assert(Math.abs(b.score / a.score - 1.3) < 0.001);
  assert(a.runDistance > 0 && a.runTopSpeed > 0);
  const saved = a.timeline.frames[0];
  a.runDistance = 900;
  a.runTopSpeed = 500;
  a.runDriftSeconds = 200;
  a.runJumps = 30;
  a.timeline.restore(a, 0);
  for (const k of ["runDistance", "runTopSpeed", "runDriftSeconds", "runJumps"])
    assert.equal(a[k], saved[k]);
  for (const s of [a, b]) {
    const c = s.makePolice(10, 10);
    while (!c.destroyed) {
      c.hitCooldown = 0;
      s.damagePolice(c, 30);
    }
  }
  assert.equal(a.runCash, 350);
  assert.equal(b.runCash, 420);
});
async function apiFixture() {
  const DB = openLocalDatabase(":memory:");
  return {
    DB,
    async req(token, path, method = "GET", body) {
      return handleApi(
        new Request("https://game.test" + path, {
          method,
          headers: token ? { Authorization: "Bearer " + token } : {},
          body: body ? JSON.stringify(body) : undefined,
        }),
        DB,
      );
    },
  };
}
test("two independent public drivers share standings; private rows and all keys stay private", async () => {
  const { DB, req } = await apiFixture();
  try {
    const tokens = ["4", "5", "6"].map((x) => x.repeat(64));
    const ids = [];
    for (const [i, t] of tokens.entries()) {
      await req(t, "/api/profile", "POST");
      await req(t, "/api/action", "POST", {
        id: "name-action-000" + i,
        version: 0,
        action: {
          type: "driver",
          name: i === 1 ? "გიორგი" : "Community Racer",
          avatar: "cyan",
          listed: i !== 2,
        },
      });
      let r = await (
        await req(t, "/api/action", "POST", {
          id: "begin-action-00" + i,
          version: 1,
          action: { type: "begin-run", car: "gt" },
        })
      ).json();
      r.profile.activeRun.startedAt = Date.now() - 100000;
      await DB.prepare("UPDATE garages SET profile=? WHERE key_hash=?")
        .bind(JSON.stringify(r.profile), await keyHash(t))
        .run();
      ids.push(r.publicId);
      const done = await req(t, "/api/action", "POST", {
        id: "settle-action-0" + i,
        version: 2,
        action: {
          type: "settle",
          runId: r.profile.activeRun.id,
          level: 1,
          result: i === 0 ? "won" : "abandoned",
          metrics: metrics({ score: i === 0 ? 14000 : 20000 }),
        },
      });
      assert.equal(done.status, 200, await done.text());
    }
    const board = await (await req(null, "/api/leaderboard")).json();
    assert.equal(board.total, 2);
    assert.equal(board.entries[0].name, "Community Racer");
    assert.equal(board.entries[0].level, 2);
    assert.equal(board.entries[1].name, "გიორგი");
    assert.equal(board.entries[0].id, ids[0]);
    const text = JSON.stringify(board);
    for (const k of [
      "key_hash",
      "operations",
      "inventory",
      "activeRun",
      "profile",
      "credits",
    ])
      assert(!text.includes('"' + k + '"'));
    for (const t of tokens) {
      assert(!text.includes(t));
      assert(!text.includes(await keyHash(t)));
    }
    const score = await (
      await req(tokens[0], "/api/leaderboard?mode=score")
    ).json();
    assert.equal(score.entries[0].name, "გიორგი");
    assert.equal(score.me.rank, 2);
    assert.equal((await req(null, "/api/leaderboard?mode=bad")).status, 400);
    assert.equal((await req(null, "/api/leaderboard?page=-1")).status, 400);
    assert.equal((await req(null, "/api/leaderboard", "POST")).status, 405);
    await req(tokens[0], "/api/action", "POST", {
      id: "hide-action-000",
      version: 3,
      action: {
        type: "driver",
        name: "Community Racer",
        avatar: "red",
        listed: false,
      },
    });
    assert.equal((await (await req(null, "/api/leaderboard")).json()).total, 1);
  } finally {
    DB.close();
  }
});
test("concurrent settlement is atomic and an older ticket cannot settle a newer chase", async () => {
  const { DB, req } = await apiFixture();
  const t = "7".repeat(64);
  try {
    await req(t, "/api/profile", "POST");
    const r = await (
      await req(t, "/api/action", "POST", {
        id: "begin-old-action",
        version: 0,
        action: { type: "begin-run", car: "classic" },
      })
    ).json();
    await req(t, "/api/action", "POST", {
      id: "begin-new-action",
      version: 1,
      action: { type: "begin-run", car: "classic" },
    });
    const old = await req(t, "/api/action", "POST", {
      id: "settle-old-0000",
      version: 2,
      action: {
        type: "settle",
        runId: r.profile.activeRun.id,
        level: 1,
        result: "abandoned",
        metrics: metrics({
          time: 0,
          score: 0,
          distance: 0,
          checkpoints: 0,
          takedowns: 0,
          trafficWrecks: 0,
          driftSeconds: 0,
          jumps: 0,
          topSpeed: 0,
        }),
      },
    });
    assert.equal(old.status, 400);
    const current = await (await req(t, "/api/profile")).json();
    const action = {
      type: "settle",
      runId: current.profile.activeRun.id,
      level: 1,
      result: "abandoned",
      metrics: metrics({
        time: 0,
        score: 0,
        distance: 0,
        checkpoints: 0,
        takedowns: 0,
        trafficWrecks: 0,
        driftSeconds: 0,
        jumps: 0,
        topSpeed: 0,
      }),
    };
    const responses = await Promise.all(
      [1, 2].map((i) =>
        req(t, "/api/action", "POST", {
          id: "concurrent-" + i,
          version: 2,
          action,
        }),
      ),
    );
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
    const end = await (await req(t, "/api/profile")).json();
    assert.equal(end.profile.community.runs, 1);
    assert.equal(end.profile.credits, 1000);
  } finally {
    DB.close();
  }
});
test("pagination stays bounded and personal rank is returned beyond the current page", async () => {
  const DB = openLocalDatabase(":memory:");
  try {
    for (let i = 0; i < 31; i++)
      await DB.prepare(
        "INSERT INTO garages(key_hash,profile,version,updated_at,public_id,display_name,listed,ranked_runs,rank_level,best_score,week_key,week_score) VALUES(?,?,0,0,?,?,1,1,1,?,?,?)",
      )
        .bind(
          "row-" + i,
          JSON.stringify(newProfile()),
          "public-" + String(i).padStart(3, "0"),
          "Racer " + i,
          3100 - i * 10,
          weekKey(now),
          3100 - i * 10,
        )
        .run();
    const first = await readLeaderboard(
      DB,
      new URL("https://game.test/api/leaderboard"),
      "row-30",
      now,
    );
    assert.equal(first.entries.length, 25);
    assert.equal(first.me.rank, 31);
    const next = await readLeaderboard(
      DB,
      new URL("https://game.test/api/leaderboard?page=1"),
      null,
      now,
    );
    assert.equal(next.entries.length, 6);
    assert.equal(next.entries[0].rank, 26);
    const weekly = await readLeaderboard(
      DB,
      new URL("https://game.test/api/leaderboard?mode=weekly"),
      null,
      now + 7 * 86400000,
    );
    assert.equal(weekly.total, 0);
  } finally {
    DB.close();
  }
});

test("additive database migration preserves an old garage and exposes it privately", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const { randomUUID } = await import("node:crypto");
  const { unlinkSync, mkdirSync } = await import("node:fs");
  mkdirSync(".sites-runtime", { recursive: true });
  const path = ".sites-runtime/community-migration-" + randomUUID() + ".sqlite",
    token = "8".repeat(64),
    old = newProfile();
  delete old.community;
  delete old.driver;
  delete old.activeRun;
  old.schema = 2;
  old.level = 6;
  old.credits = 8450;
  old.cars.gt.engine = 4;
  const sql = new DatabaseSync(path);
  sql.exec(
    "CREATE TABLE garages(key_hash TEXT PRIMARY KEY NOT NULL,profile TEXT NOT NULL,version INTEGER DEFAULT 0 NOT NULL,updated_at INTEGER NOT NULL);CREATE TABLE local_migrations(name TEXT PRIMARY KEY)",
  );
  sql
    .prepare("INSERT INTO garages VALUES(?,?,7,0)")
    .run(await keyHash(token), JSON.stringify(old));
  sql
    .prepare("INSERT INTO local_migrations VALUES(?)")
    .run("0000_cheerful_reavers.sql");
  sql.close();
  const DB = openLocalDatabase(path);
  try {
    const r = await handleApi(
      new Request("https://game.test/api/profile", {
        headers: { Authorization: "Bearer " + token },
      }),
      DB,
    );
    const data = await r.json();
    assert.equal(data.profile.credits, 8450);
    assert.equal(data.profile.level, 6);
    assert.equal(data.profile.cars.gt.engine, 4);
    assert.equal(data.version, 7);
    assert.equal(data.profile.community.runs, 0);
    assert.equal(data.profile.driver.listed, false);
    const board = await readLeaderboard(
      DB,
      new URL("https://game.test/api/leaderboard"),
      null,
    );
    assert.equal(board.total, 0);
  } finally {
    DB.close();
    unlinkSync(path);
  }
});
