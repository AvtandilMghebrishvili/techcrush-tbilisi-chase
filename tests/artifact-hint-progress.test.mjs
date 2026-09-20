import test from "node:test";
import assert from "node:assert/strict";
import { newProfile, applyProgressAction } from "../dist/progression.js";
import {
  EVENT_ID,
  EVENT_START,
  EVENT_END,
  ARTIFACT_BANNERS,
  activeArtifactHints,
  collectedArtifacts,
  settleEvent,
} from "../dist/event-rules.js";
import { openLocalDatabase } from "../server/local-db.mjs";
import { handleApi, keyHash } from "../server/api.mjs";
const now = EVENT_START + 60000;
function profile() {
  const p = newProfile();
  p.credits = 100000000;
  p.events = {
    [EVENT_ID]: {
      artifacts: { tbilisi: [], kutaisi: [], batumi: [] },
      artifactHints: {},
      scores: {},
    },
  };
  return p;
}
test("all 32 collected combinations in all cities only reveal missing artifact IDs, including legacy numeric strings", () => {
  for (const map of ["tbilisi", "kutaisi", "batumi"])
    for (let mask = 0; mask < 32; mask++) {
      const p = profile(),
        found = ARTIFACT_BANNERS.filter((_, i) => mask & (1 << i));
      p.events[EVENT_ID].artifacts[map] = found.map(String);
      p.events[EVENT_ID].artifactHints[map] = found;
      const missing = ARTIFACT_BANNERS.filter((id) => !found.includes(id));
      if (!missing.length) {
        assert.throws(
          () =>
            applyProgressAction(p, { type: "buy-artifact", map }, Math.random, {
              now,
            }),
          /every artifact/,
        );
        continue;
      }
      const next = applyProgressAction(
        p,
        { type: "buy-artifact", map },
        Math.random,
        { now },
      );
      assert.equal(next.lastPurchase.artifact, missing[0]);
      assert.deepEqual(activeArtifactHints(next, map), [missing[0]]);
      assert.equal(next.credits, p.credits - 1000000);
    }
});
test("collecting saves a stable numbered find before settlement; it survives a replaced run and cannot be resold as a hint", () => {
  let p = profile();
  p.events[EVENT_ID].artifactHints.tbilisi = [0];
  p = applyProgressAction(
    p,
    { type: "begin-run", car: "gt", map: "tbilisi" },
    Math.random,
    { now, runId: "artifact-run" },
  );
  const scores = structuredClone(p.events[EVENT_ID].scores),
    community = structuredClone(p.community);
  const action = {
    type: "artifact-progress",
    runId: "artifact-run",
    artifacts: [0],
    time: 10,
    distance: 200,
  };
  p = applyProgressAction(p, action, Math.random, { now: now + 12000 });
  assert.deepEqual(p.events[EVENT_ID].artifacts.tbilisi, [0]);
  assert.deepEqual(activeArtifactHints(p, "tbilisi"), []);
  assert.deepEqual(p.events[EVENT_ID].scores, scores);
  assert.deepEqual(p.community, community);
  assert.equal(p.credits, 100000000);
  assert.equal(p.activeRun.id, "artifact-run");
  p = applyProgressAction(p, action, Math.random, { now: now + 13000 });
  assert.deepEqual(collectedArtifacts(p, "tbilisi"), [0]);
  const ticket = structuredClone(p.activeRun);
  settleEvent(
    p,
    ticket,
    { artifacts: [0], time: 20, distance: 400, score: 100 },
    "abandoned",
    now + 20000,
  );
  assert.deepEqual(p.events[EVENT_ID].artifacts.tbilisi, [0]);
  p = applyProgressAction(
    p,
    { type: "begin-run", car: "gt", map: "batumi" },
    Math.random,
    { now: now + 21000, runId: "new-run" },
  );
  p = applyProgressAction(
    p,
    { type: "buy-artifact", map: "tbilisi" },
    Math.random,
    { now: now + 22000 },
  );
  assert.equal(p.lastPurchase.artifact, 3);
  assert.deepEqual(collectedArtifacts(p, "batumi"), []);
});
test("artifact autosave rejects invalid IDs, wrong tickets, impossible travel and expired event", () => {
  let p = profile();
  p = applyProgressAction(
    p,
    { type: "begin-run", car: "gt", map: "tbilisi" },
    Math.random,
    { now, runId: "artifact-run" },
  );
  const action = {
    type: "artifact-progress",
    runId: "artifact-run",
    artifacts: [0],
    time: 10,
    distance: 200,
  };
  for (const patch of [
    { artifacts: [1] },
    { artifacts: [0, 0] },
    { runId: "another" },
    { distance: 0 },
    { time: 10000 },
    { distance: 50000 },
  ])
    assert.throws(
      () =>
        applyProgressAction(p, { ...action, ...patch }, Math.random, {
          now: now + 12000,
        }),
      /could not be verified/,
    );
  assert.throws(
    () =>
      applyProgressAction(p, action, Math.random, { now: EVENT_END + 30001 }),
    /could not be verified/,
  );
  assert.deepEqual(p.events[EVENT_ID].artifacts.tbilisi, []);
});

test("API autosave is idempotent, survives reload, excludes the find from purchases and unlocks the completed hunt without scoring a run", async () => {
  const db = openLocalDatabase(":memory:"),
    token = "e".repeat(64),
    hash = await keyHash(token);
  let p = profile();
  p.events[EVENT_ID].handle = "ArtifactDriver";
  p.events[EVENT_ID].handleKey = "artifactdriver";
  p.events[EVENT_ID].artifacts = {
    tbilisi: [0, 3, 6, 9],
    kutaisi: [...ARTIFACT_BANNERS],
    batumi: [...ARTIFACT_BANNERS],
  };
  p = applyProgressAction(
    p,
    { type: "begin-run", car: "gt", map: "tbilisi" },
    Math.random,
    { now, runId: "api-artifacts" },
  );
  await db
    .prepare(
      "INSERT INTO garages(key_hash,profile,version,updated_at) VALUES(?,?,0,0)",
    )
    .bind(hash, JSON.stringify(p))
    .run();
  await db
    .prepare(
      "INSERT INTO event_entries(event_id,key_hash,handle,handle_key,joined_at) VALUES(?,?,?,?,?)",
    )
    .bind(EVENT_ID, hash, "ArtifactDriver", "artifactdriver", now)
    .run();
  const call = async (path, body) => {
    const r = await handleApi(
      new Request("http://test" + path, {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
      db,
      { now: () => now + 12000 },
    );
    return { status: r.status, ...(await r.json()) };
  };
  try {
    const body = {
      id: "artifact-autosave-operation",
      version: 0,
      action: {
        type: "artifact-progress",
        runId: "api-artifacts",
        artifacts: [12],
        time: 10,
        distance: 200,
      },
    };
    const first = await call("/api/action", body);
    assert.equal(first.status, 200);
    assert.equal(first.profile.events[EVENT_ID].artifacts.tbilisi.length, 5);
    const retry = await call("/api/action", body);
    assert.equal(retry.status, 200);
    assert.equal(retry.version, first.version);
    const loaded = await call("/api/profile");
    assert.deepEqual(
      loaded.profile.events[EVENT_ID].artifacts.tbilisi,
      [0, 3, 6, 9, 12],
    );
    const rejected = await call("/api/action", {
      id: "artifact-no-repurchase",
      version: loaded.version,
      action: { type: "buy-artifact", map: "tbilisi" },
    });
    assert.equal(rejected.status, 400);
    const entry = await db
      .prepare("SELECT unlocked_at FROM event_entries WHERE key_hash=?")
      .bind(hash)
      .first();
    assert.equal(entry.unlocked_at, now + 12000);
    assert.equal(
      (
        await db
          .prepare("SELECT COUNT(*) n FROM event_scores WHERE key_hash=?")
          .bind(hash)
          .first()
      ).n,
      0,
    );
    assert.equal(
      (
        await db
          .prepare("SELECT COUNT(*) n FROM event_runs WHERE key_hash=?")
          .bind(hash)
          .first()
      ).n,
      0,
    );
  } finally {
    db.close();
  }
});
