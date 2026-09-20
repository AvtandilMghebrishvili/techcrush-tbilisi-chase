import test from "node:test";
import assert from "node:assert/strict";
import {
  newProfile,
  applyProgressAction,
  BOX_SHOP,
  ARTIFACT_PRICE,
} from "../dist/progression.js";
import { PRIVATE_DRIVER_NAME } from "../dist/private-driver.js";
import { handleApi, keyHash } from "../server/api.mjs";
import { openLocalDatabase } from "../server/local-db.mjs";
import { EVENT_ID, EVENT_START } from "../dist/event-rules.js";

test("credit shop prices every box above its maximum resale return", () => {
  let profile = newProfile();
  profile.credits = 100000;
  const fields = {
    street: "boxes",
    mystery: "mysteryBoxes",
    special: "specialBoxes",
    platinum: "platinumBoxes",
    creator: "creatorBoxes",
  };
  for (const [kind, box] of Object.entries(BOX_SHOP)) {
    const beforeCredits = profile.credits,
      beforeBoxes = profile[fields[kind]];
    profile = applyProgressAction(profile, { type: "buy-box", kind });
    assert.equal(profile.credits, beforeCredits - box.price);
    assert.equal(profile[fields[kind]], beforeBoxes + 1);
  }
  profile.credits = 0;
  assert.throws(
    () => applyProgressAction(profile, { type: "buy-box", kind: "street" }),
    /4,000 CR/,
  );
});

test("the separate shop sells the next missing city artifact for one million credits", () => {
  const now = EVENT_START + 1000;
  let profile = applyProgressAction(
    newProfile(),
    {
      type: "join-event",
      handle: "SHOP_TESTER",
      acceptRules: true,
      subscribeAcknowledged: true,
    },
    Math.random,
    { now },
  );
  profile.credits = ARTIFACT_PRICE * 2;
  profile = applyProgressAction(
    profile,
    { type: "buy-artifact", map: "tbilisi" },
    Math.random,
    { now },
  );
  assert.equal(profile.credits, ARTIFACT_PRICE);
  assert.deepEqual(profile.events[EVENT_ID].artifacts.tbilisi, [0]);
});

test("reserved owner name is always private even when public is requested", () => {
  const profile = applyProgressAction(newProfile(), {
    type: "driver",
    name: PRIVATE_DRIVER_NAME,
    avatar: "cyan",
    listed: true,
  });
  assert.equal(profile.driver.name, PRIVATE_DRIVER_NAME);
  assert.equal(profile.driver.listed, false);
});

test("ghost presence returns a nickname label without exposing private names", async () => {
  const db = openLocalDatabase(":memory:"),
    one = "c".repeat(64),
    two = "d".repeat(64),
    oneHash = await keyHash(one);
  for (const token of [one, two])
    await handleApi(
      new Request("https://game.test/api/profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }),
      db,
    );
  await db
    .prepare(
      "UPDATE garages SET display_name='GHOST_ONE',private_mode=0 WHERE key_hash=?",
    )
    .bind(oneHash)
    .run();
  const pose = (session, x) => ({
    session,
    map: "tbilisi",
    car: "gt",
    x,
    y: 0,
    z: 0,
    angle: 0,
    pitch: 0,
    roll: 0,
  });
  await handleApi(
    new Request("https://game.test/api/ghosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${one}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pose("11111111-1111-4111-8111-111111111111", 0)),
    }),
    db,
  );
  const response = await (
    await handleApi(
      new Request("https://game.test/api/ghosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${two}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pose("22222222-2222-4222-8222-222222222222", 2)),
      }),
      db,
    )
  ).json();
  assert.equal(response.ghosts[0].name, "GHOST_ONE");
  db.close();
});

test("private driver sees their event score while public standings and totals exclude it", async () => {
  const db = openLocalDatabase(":memory:"),
    publicToken = "a".repeat(64),
    privateToken = "b".repeat(64),
    publicHash = await keyHash(publicToken),
    privateHash = await keyHash(privateToken);
  for (const token of [publicToken, privateToken])
    await handleApi(
      new Request("https://game.test/api/profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }),
      db,
    );
  await db
    .prepare(
      "UPDATE garages SET display_name=?,listed=1,private_mode=?,ranked_runs=1,best_score=?,rank_level=2 WHERE key_hash=?",
    )
    .bind("PUBLIC", 0, 1000, publicHash)
    .run();
  await db
    .prepare(
      "UPDATE garages SET display_name=?,listed=0,private_mode=1,ranked_runs=1,best_score=?,rank_level=9 WHERE key_hash=?",
    )
    .bind(PRIVATE_DRIVER_NAME, 999999, privateHash)
    .run();
  for (const [hash, handle, score] of [
    [publicHash, "PUBLIC", 1000],
    [privateHash, PRIVATE_DRIVER_NAME, 999999],
  ]) {
    await db
      .prepare(
        "INSERT INTO event_entries(event_id,key_hash,handle,handle_key,joined_at) VALUES(?,?,?,?,1)",
      )
      .bind(EVENT_ID, hash, handle, handle.toLowerCase())
      .run();
    await db
      .prepare(
        "INSERT INTO event_scores(event_id,key_hash,map,score,runs,level,rank_at) VALUES(?,?,?,?,1,2,1)",
      )
      .bind(EVENT_ID, hash, "tbilisi", score)
      .run();
  }
  const auth = { Authorization: `Bearer ${privateToken}` };
  const regular = await (
    await handleApi(
      new Request("https://game.test/api/leaderboard?map=tbilisi&mode=score", {
        headers: auth,
      }),
      db,
    )
  ).json();
  assert.deepEqual(
    regular.entries.map((r) => r.name),
    ["PUBLIC"],
  );
  assert.equal(regular.me.name, PRIVATE_DRIVER_NAME);
  assert.equal(regular.me.private, true);
  assert.equal(regular.me.rank, null);

  const event = await (
    await handleApi(
      new Request("https://game.test/api/event/leaderboard?map=tbilisi", {
        headers: auth,
      }),
      db,
      { now: () => Date.parse("2026-09-21T12:00:00+04:00") },
    )
  ).json();
  assert.deepEqual(
    event.entries.map((r) => r.name),
    ["PUBLIC"],
  );
  assert.equal(event.total, 1);
  assert.equal(event.mine.name, PRIVATE_DRIVER_NAME);
  assert.equal(event.mine.private, true);
  assert.equal(event.mine.rank, null);
  db.close();
});
