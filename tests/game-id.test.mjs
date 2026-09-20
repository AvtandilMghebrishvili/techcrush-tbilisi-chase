import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { handleApi, keyHash } from "../server/api.mjs";
import { openLocalDatabase } from "../server/local-db.mjs";
import { newProfile } from "../dist/progression.js";
import { EVENT_ID, EVENT_START } from "../dist/event-rules.js";
import { normalizeGameCode } from "../server/game-id.mjs";
import { ProfileClient } from "../dist/profile-client.js";

function fixture(t) {
  const DB = openLocalDatabase(":memory:");
  t.after(() => DB.close());
  let now = EVENT_START + 60000;
  const req = (
    token,
    path = "/api/profile",
    method = "GET",
    body,
    clientIP = "127.0.0.1",
  ) =>
    handleApi(
      new Request("https://game.test" + path, {
        method,
        headers: token ? { Authorization: "Bearer " + token } : {},
        body: body ? JSON.stringify(body) : undefined,
      }),
      DB,
      { now: () => now, clientIP },
    );
  return {
    DB,
    req,
    advance: () => {
      now += 600001;
    },
  };
}

test("legacy player gets a private Game ID and restores the exact identity, rankings and resources", async (t) => {
  const { DB, req } = fixture(t),
    oldToken = "1".repeat(64),
    hash = await keyHash(oldToken);
  const p = newProfile();
  p.driver = { name: "გიორგი", avatar: "cyan", listed: true };
  p.credits = 158934;
  p.level = 9;
  p.cars.suv.engine = 4;
  p.cars.suv.stars = { engine: 2 };
  p.inventory["spoiler:5"] = 2;
  p.specialBoxes = 3;
  Object.assign(p.community, {
    runs: 5,
    furthestLevel: 9,
    bestScore: 9123,
    totalScore: 30000,
  });
  p.events = {
    [EVENT_ID]: {
      handle: "GiorgiEvent",
      handleKey: "giorgievent",
      joinedAt: EVENT_START,
      artifacts: { tbilisi: [0, 3], kutaisi: [6], batumi: [9] },
      scores: { tbilisi: 9123 },
    },
  };
  await DB.prepare(
    "INSERT INTO garages(key_hash,profile,version,updated_at,public_id,display_name,listed,ranked_runs,best_score,rank_level,has_played) VALUES(?,?,7,123,?,'გიორგი',1,5,9123,9,1)",
  )
    .bind(hash, JSON.stringify(p), "stable-public-id")
    .run();
  await DB.prepare(
    "INSERT INTO event_entries(event_id,key_hash,handle,handle_key,joined_at) VALUES(?,?,'GiorgiEvent','giorgievent',?)",
  )
    .bind(EVENT_ID, hash, EVENT_START)
    .run();
  await DB.prepare(
    "INSERT INTO event_scores(event_id,key_hash,map,score,runs,level,rank_at) VALUES(?,?,'tbilisi',9123,5,9,123)",
  )
    .bind(EVENT_ID, hash)
    .run();
  const snapshot = await DB.prepare("SELECT * FROM garages").bind().first();
  const first = await (await req(oldToken)).json();
  assert.match(first.gameId, /^გიორგი-[0-9A-Z]{4}(?:-[0-9A-Z]{4}){3}$/iu);
  assert.equal(first.version, 7);
  assert.deepEqual(
    await DB.prepare("SELECT * FROM garages").bind().first(),
    snapshot,
  );
  assert.equal((await (await req(oldToken)).json()).gameId, first.gameId);
  const signIn = await req(null, "/api/game-id/restore", "POST", {
    gameId: first.gameId.toLowerCase(),
  });
  assert.equal(signIn.status, 200);
  assert.equal(signIn.headers.get("cache-control"), "no-store");
  const { token } = await signIn.json();
  assert.notEqual(token, oldToken);
  const restored = await (await req(token, "/api/profile", "POST")).json();
  assert.deepEqual(restored, first);
  assert.equal(
    (await DB.prepare("SELECT COUNT(*) n FROM garages").bind().first()).n,
    1,
  );
  const oldBoard = await (await req(oldToken, "/api/leaderboard")).json();
  const newBoard = await (await req(token, "/api/leaderboard")).json();
  assert.deepEqual(
    { ...newBoard, updatedAt: null },
    { ...oldBoard, updatedAt: null },
  );
  assert.equal(newBoard.me.id, "stable-public-id");
  const event = await (await req(token, "/api/event/leaderboard")).json();
  assert.equal(event.entries[0].you, true);
  assert.equal(event.mine.score, 9123);
  const publicText = JSON.stringify([newBoard, event]);
  for (const secret of [
    token,
    oldToken,
    hash,
    first.gameId,
    normalizeGameCode(first.gameId),
    "recovery_code",
    "credential_hash",
  ])
    assert(!publicText.includes(secret));
  const action = {
    id: randomUUID(),
    version: restored.version,
    action: { type: "driver", name: "NewNick", avatar: "gold", listed: true },
  };
  const rename = await (await req(token, "/api/action", "POST", action)).json();
  assert(rename.gameId.startsWith("NEWNICK-"));
  assert.equal(
    normalizeGameCode(rename.gameId),
    normalizeGameCode(first.gameId),
  );
  assert.equal(rename.profile.events[EVENT_ID].handle, "GiorgiEvent");
  assert.equal(rename.profile.credits, p.credits);
  assert.deepEqual(rename.profile.inventory, p.inventory);
  assert.equal(rename.publicId, first.publicId);
  const renamedBoard = await (await req(token, "/api/leaderboard")).json();
  assert.equal(renamedBoard.me.rank, newBoard.me.rank);
  assert.equal(renamedBoard.me.bestScore, newBoard.me.bestScore);
  assert.equal(renamedBoard.stats.uniquePlayers, 1);
  assert.equal(
    (await req(null, "/api/game-id/restore", "POST", { gameId: first.gameId }))
      .status,
    200,
    "old prefix still works",
  );
  assert.equal(
    (
      await req(oldToken, "/api/action", "POST", {
        ...action,
        id: randomUUID(),
      })
    ).status,
    409,
    "other browsers cannot overwrite with a stale version",
  );
  assert.deepEqual(
    (await (await req(oldToken)).json()).profile,
    rename.profile,
  );
});

test("same nicknames get distinct IDs; invalid IDs and rate limits cannot create or change profiles", async (t) => {
  const { DB, req, advance } = fixture(t);
  const ids = [];
  for (const char of ["a", "b"]) {
    const token = char.repeat(64);
    await req(token, "/api/profile", "POST");
    const data = await (
      await req(token, "/api/action", "POST", {
        id: randomUUID(),
        version: 0,
        action: {
          type: "driver",
          name: "SameName",
          avatar: "red",
          listed: false,
        },
      })
    ).json();
    ids.push(data.gameId);
  }
  assert.notEqual(ids[0], ids[1]);
  const before = (
    await DB.prepare("SELECT * FROM garages ORDER BY key_hash").bind().all()
  ).results;
  for (let i = 0; i < 20; i++)
    assert.equal(
      (await req(null, "/api/game-id/restore", "POST", { gameId: "incorrect" }))
        .status,
      404,
    );
  assert.equal(
    (await req(null, "/api/game-id/restore", "POST", { gameId: ids[0] }))
      .status,
    429,
  );
  assert.equal(
    (
      await req(
        null,
        "/api/game-id/restore",
        "POST",
        { gameId: ids[0] },
        "another-client",
      )
    ).status,
    200,
  );
  advance();
  assert.equal(
    (await req(null, "/api/game-id/restore", "POST", { gameId: ids[0] }))
      .status,
    200,
  );
  assert.equal((await req(null, "/api/game-id/restore")).status, 405);
  assert.deepEqual(
    (await DB.prepare("SELECT * FROM garages ORDER BY key_hash").bind().all())
      .results,
    before,
  );
});

test("client switches only after destination verification; saves stay scoped to the correct profile", async (t) => {
  const { req } = fixture(t);
  const values = new Map(),
    originalStorage = globalThis.localStorage,
    originalFetch = globalThis.fetch;
  globalThis.localStorage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, String(v)),
    removeItem: (k) => values.delete(k),
  };
  globalThis.fetch = (path, options = {}) =>
    req(
      options.headers.Authorization?.replace(/^Bearer /, ""),
      path,
      options.method,
      options.body ? JSON.parse(options.body) : undefined,
    );
  t.after(() => {
    globalThis.localStorage = originalStorage;
    globalThis.fetch = originalFetch;
  });
  const key = "techcrush-garage-key-v1",
    client = new ProfileClient();
  await client.init();
  const originalToken = client.token,
    originalId = client.gameId;
  let banked = false;
  await assert.rejects(
    client.restoreGameId("invalid", () => {
      banked = true;
    }),
    /not found/,
  );
  assert.equal(banked, false, "invalid IDs never bank/end the current run");
  assert.equal(client.token, originalToken);
  assert.equal(values.get(key), originalToken);
  client.pending = { id: "pending-run" };
  await assert.rejects(client.restoreGameId(originalId), /pending save/);
  client.pending = null;
  const otherToken = "d".repeat(64),
    other = await (await req(otherToken, "/api/profile", "POST")).json();
  await client.restoreGameId(other.gameId, async () => {
    banked = true;
    await client.mutate({
      type: "driver",
      name: "OriginalDriver",
      avatar: "red",
      listed: false,
    });
  });
  assert.equal(banked, true);
  assert.equal(
    (await (await req(originalToken)).json()).profile.driver.name,
    "OriginalDriver",
  );
  assert.equal(client.gameId, other.gameId);
  assert.notEqual(client.token, originalToken);
  await client.mutate({ type: "upgrade", car: "gt", part: "engine" });
  assert.equal((await (await req(otherToken)).json()).profile.credits, 400);
  assert.equal((await (await req(originalToken)).json()).profile.credits, 1000);
  const legacyOutbox = "techcrush-garage-outbox-v1";
  values.set(
    legacyOutbox,
    JSON.stringify({
      id: randomUUID(),
      version: 1,
      action: { type: "upgrade", car: "gt", part: "engine" },
    }),
  );
  const reloaded = new ProfileClient();
  await reloaded.init();
  assert.equal(
    reloaded.profile.credits,
    400,
    "an old tab's pending save never applies to the new profile",
  );
  assert(values.has(legacyOutbox + ":" + originalToken));
  values.set(key, originalToken);
  await assert.rejects(
    client.mutate({ type: "upgrade", car: "gt", part: "engine" }),
    /another tab/,
  );
  assert.equal(client.pending, null);
  const originalReload = new ProfileClient();
  await originalReload.init();
  assert.equal(
    originalReload.profile.credits,
    400,
    "the old pending save survives for its original owner",
  );
  assert(!values.has(legacyOutbox + ":" + originalToken));
});
