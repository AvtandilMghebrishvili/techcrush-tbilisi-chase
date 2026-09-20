import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { newProfile } from "../dist/progression.js";
import { TIME_COURSE } from "../dist/race-timing.js";
import { handleApi, keyHash } from "../server/api.mjs";
import { openLocalDatabase } from "../server/local-db.mjs";

function fixture(t) {
  const DB = openLocalDatabase(":memory:");
  t.after(() => DB.close());
  let serial = 0;
  const req = (token, path, method = "GET", body) =>
    handleApi(
      new Request("https://game.test" + path, {
        method,
        headers: token ? { Authorization: "Bearer " + token } : {},
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      DB,
      { eventExclusive: false },
    );
  const board = async (token = null, query = "") =>
    (await req(token, "/api/leaderboard" + query)).json();
  const action = async (token, action) => {
    const current = await (await req(token, "/api/profile")).json();
    const r = await req(token, "/api/action", "POST", {
      id: "stats-action-" + ++serial,
      version: current.version,
      action,
    });
    const value = await r.json();
    assert.equal(r.status, 200, JSON.stringify(value));
    return value;
  };
  const clear = async (token, car = "classic") => {
    const r = await action(token, {
      type: "begin-run",
      car,
      course: TIME_COURSE,
    });
    r.profile.activeRun.startedAt = Date.now() - 30000;
    await DB.prepare("UPDATE garages SET profile=? WHERE key_hash=?")
      .bind(JSON.stringify(r.profile), await keyHash(token))
      .run();
    return action(token, {
      type: "settle",
      runId: r.profile.activeRun.id,
      level: 1,
      result: "won",
      metrics: {
        time: 12,
        score: 4000,
        checkpoints: 6,
        takedowns: 0,
        trafficWrecks: 0,
        distance: 900,
        driftSeconds: 0,
        jumps: 0,
        topSpeed: 180,
        timing: { course: TIME_COURSE, elapsedMs: 20000, rewinds: 0 },
      },
    });
  };
  return { DB, req, board, action, clear };
}

test("unique player profiles count first started chase, not visitors or names; restoring and replaying do not double count", async (t) => {
  const { req, board, action } = fixture(t),
    a = "a".repeat(64),
    b = "b".repeat(64);
  assert.equal((await board()).stats.uniquePlayers, 0);
  for (const token of [a, b]) {
    await req(token, "/api/profile", "POST");
    await action(token, {
      type: "driver",
      name: "Same Driver",
      avatar: "cyan",
      listed: true,
    });
  }
  assert.equal((await board()).stats.uniquePlayers, 0);
  const start = {
    id: "idempotent-stats-start",
    version: 1,
    action: { type: "begin-run", car: "classic" },
  };
  for (let i = 0; i < 3; i++)
    assert.equal((await req(a, "/api/action", "POST", start)).status, 200);
  await req(a, "/api/profile", "POST"); // A restored key is the same identity.
  await action(a, { type: "begin-run", car: "gt" });
  await action(a, {
    type: "driver",
    name: "Renamed Driver",
    avatar: "red",
    listed: false,
  });
  assert.equal((await board()).stats.uniquePlayers, 1);
  await action(b, { type: "begin-run", car: "classic" });
  const data = await board(a);
  assert.equal(data.stats.uniquePlayers, 2);
  assert.equal(data.total, 0, "Unbanked players do not get a public position");
  assert.equal(data.me, null);
});

test("rejected and conflicting starts never add a player", async (t) => {
  const { req, board } = fixture(t),
    token = "c".repeat(64);
  await req(token, "/api/profile", "POST");
  assert.equal(
    (
      await req(token, "/api/action", "POST", {
        id: "invalid-stats-start",
        version: 0,
        action: { type: "begin-run", car: "missing" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await req(token, "/api/action", "POST", {
        id: "conflict-stats-start",
        version: 3,
        action: { type: "begin-run", car: "classic" },
      })
    ).status,
    409,
  );
  assert.equal((await board()).stats.uniquePlayers, 0);
});

test("unique count includes guests while each filtered denominator only counts matching public drivers", async (t) => {
  const { req, board, action, clear } = fixture(t);
  const tokens = ["1", "2", "3", "4"].map((x) => x.repeat(64));
  for (const token of tokens) await req(token, "/api/profile", "POST");
  for (const token of tokens.slice(0, 2))
    await action(token, {
      type: "driver",
      name: "Public Driver",
      avatar: "cyan",
      listed: true,
    });
  await clear(tokens[0]);
  await clear(tokens[1], "gt");
  await action(tokens[2], { type: "begin-run", car: "classic" }); // Private guest, plus an unused fourth profile.
  for (const query of [
    "",
    "?mode=score",
    "?mode=weekly",
    "?mode=times&level=1",
  ]) {
    const data = await board(tokens[0], query);
    assert.equal(data.stats.uniquePlayers, 3);
    assert.equal(data.total, 2);
    assert(data.me.rank >= 1 && data.me.rank <= data.total);
    const text = JSON.stringify(data);
    for (const token of tokens) {
      assert(!text.includes(token));
      assert(!text.includes(await keyHash(token)));
    }
    assert.deepEqual(Object.keys(data.stats), ["uniquePlayers"]);
  }
  const filtered = await board(
    tokens[0],
    "?mode=times&level=1&car=classic&build=stock",
  );
  assert.equal(filtered.stats.uniquePlayers, 3);
  assert.equal(filtered.total, 1);
  assert.equal(filtered.me.rank, 1);
  const empty = await board(tokens[0], "?mode=times&level=2");
  assert.equal(empty.total, 0);
  assert.equal(empty.me, null);
  assert.equal(empty.stats.uniquePlayers, 3);
  await action(tokens[0], {
    type: "driver",
    name: "Public Driver",
    avatar: "cyan",
    listed: false,
  });
  for (const query of ["", "?mode=times&level=1"]) {
    const hidden = await board(tokens[0], query);
    assert.equal(hidden.stats.uniquePlayers, 3);
    assert.equal(hidden.total, 1);
    assert.equal(hidden.me, null);
  }
});

test("personal position denominator covers all pages, not just the visible 25 rows", async (t) => {
  const { DB, board } = fixture(t),
    token = "f".repeat(64);
  for (let i = 0; i < 31; i++)
    await DB.prepare(
      "INSERT INTO garages(key_hash,profile,version,updated_at,public_id,display_name,listed,ranked_runs,best_score,has_played) VALUES(?,?,0,0,?,?,1,1,?,1)",
    )
      .bind(
        i === 30 ? await keyHash(token) : "fixture-" + i,
        JSON.stringify(newProfile()),
        "public-" + i,
        "Player " + i,
        3100 - i,
      )
      .run();
  const data = await board(token);
  assert.equal(data.entries.length, 25);
  assert.equal(data.me.rank, 31);
  assert.equal(data.total, 31);
  assert.equal(data.stats.uniquePlayers, 31);
});

test("additive player count migration backfills historical players and keeps profile bytes and versions intact", () => {
  const sql = new DatabaseSync(":memory:");
  try {
    for (const file of readdirSync("drizzle")
      .filter((x) => /^000[0-3].*\.sql$/.test(x))
      .sort())
      sql.exec(readFileSync("drizzle/" + file, "utf8"));
    const profiles = [newProfile(), newProfile(), newProfile(), newProfile()];
    profiles[1].activeRun = { id: "old-active-run" };
    profiles[2].settled = ["old-legacy-finish"];
    profiles[2].credits = 9841;
    profiles[2].cars.gt.engine = 4;
    for (let i = 0; i < profiles.length; i++)
      sql
        .prepare(
          "INSERT INTO garages(key_hash,profile,version,updated_at,ranked_runs) VALUES(?,?,7,10,?)",
        )
        .run("old-" + i, JSON.stringify(profiles[i]), i === 0 ? 1 : 0);
    sql.exec(readFileSync("drizzle/0004_acoustic_korg.sql", "utf8"));
    const rows = sql
      .prepare(
        "SELECT profile,version,has_played FROM garages ORDER BY key_hash",
      )
      .all();
    assert.deepEqual(
      rows.map((x) => x.has_played),
      [1, 1, 1, 0],
    );
    rows.forEach((row, i) => {
      assert.equal(row.profile, JSON.stringify(profiles[i]));
      assert.equal(row.version, 7);
    });
    assert.match(
      sql
        .prepare(
          "EXPLAIN QUERY PLAN SELECT COUNT(*) FROM garages WHERE has_played=1",
        )
        .get().detail,
      /COVERING INDEX leaderboard_player_count/,
    );
  } finally {
    sql.close();
  }
});
