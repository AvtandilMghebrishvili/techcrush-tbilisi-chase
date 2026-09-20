import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { newProfile } from "../dist/progression.js";
import { EVENT_ID } from "../dist/event-rules.js";

const ani = "7f5f815e14ce4183a3e6ea4f455dcf1f30d97945d2c54c896811dcf78710322c";
const migration = readFileSync("drizzle/0011_minor_marrow.sql", "utf8");
function fixture() {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync("drizzle")
    .filter((f) => f.endsWith(".sql") && f < "0011")
    .sort())
    db.exec(readFileSync("drizzle/" + file, "utf8"));
  return db;
}
function seed(db, key, name, handle, hidden = false) {
  const p = newProfile();
  p.credits = 12345;
  p.creatorBoxes = 7;
  p.driver = { name, avatar: "red", listed: !hidden };
  p.activeRun = { id: "keep-running", map: "batumi", level: 12 };
  p.operations = ["keep-operation"];
  p.events = {
    [EVENT_ID]: {
      handle,
      handleKey: handle.toLowerCase(),
      artifacts: { tbilisi: [0], kutaisi: [], batumi: [] },
      artifactHints: { tbilisi: [0], kutaisi: [], batumi: [0] },
      artifactPurchases: { tbilisi: 1, kutaisi: 0, batumi: 1 },
      scores: { tbilisi: { score: 100000, level: 16, runs: 20 } },
    },
  };
  p.lastPurchase = {
    kind: "artifact-hint",
    map: "batumi",
    artifact: 0,
    price: 1000000,
  };
  db.prepare(
    "INSERT INTO garages(key_hash,profile,version,updated_at,display_name,listed,private_mode,total_score,rank_level) VALUES(?,?,7,9,?,?,?,100000,16)",
  ).run(key, JSON.stringify(p), name, Number(!hidden), Number(hidden));
  db.prepare(
    "INSERT INTO event_entries(event_id,key_hash,handle,handle_key,joined_at) VALUES(?,?,?,?,1)",
  ).run(EVENT_ID, key, handle, handle.toLowerCase());
  return p;
}

test("compensation changes exactly the two authorized garages once, preserving rankings and live runs", () => {
  const db = fixture();
  try {
    const a = seed(db, ani, "Ani", "Ani");
    const owner = seed(db, "owner-key", "TECHcrush-Mac", "CITIARS", true);
    seed(db, "another-key", "Another", "Another");
    const other = db
      .prepare("SELECT * FROM garages WHERE key_hash='another-key'")
      .get();
    db.exec(migration);
    for (const [key, before, refund] of [
      [ani, a, 0],
      ["owner-key", owner, 1000000],
    ]) {
      const row = db.prepare("SELECT * FROM garages WHERE key_hash=?").get(key),
        p = JSON.parse(row.profile);
      assert.equal(p.credits, before.credits + 10000000 + refund);
      assert.equal(p.creatorBoxes, 107);
      assert.equal(row.version, 8);
      assert.equal(row.total_score, 100000);
      assert.equal(row.rank_level, 16);
      assert.deepEqual(p.activeRun, before.activeRun);
      assert.deepEqual(p.operations, before.operations);
      assert.deepEqual(p.driver, before.driver);
      assert.deepEqual(p.inventory, before.inventory);
      assert.deepEqual(
        p.events[EVENT_ID].scores,
        before.events[EVENT_ID].scores,
      );
      assert.deepEqual(
        p.events[EVENT_ID].artifacts,
        before.events[EVENT_ID].artifacts,
      );
      assert.equal(p.events[EVENT_ID].artifactPurchases.batumi, refund ? 0 : 1);
      const receipt = p.supportAdjustments.artifactSearch20260921;
      assert.equal(receipt.grantedHints.length, 3);
      assert.equal(new Set(receipt.grantedHints.map((h) => h.map)).size, 3);
      for (const h of receipt.grantedHints) {
        assert(p.events[EVENT_ID].artifactHints[h.map].includes(h.artifact));
        assert(!before.events[EVENT_ID].artifacts[h.map].includes(h.artifact));
        assert(
          !before.events[EVENT_ID].artifactHints[h.map].includes(h.artifact),
        );
      }
    }
    assert.deepEqual(
      db.prepare("SELECT * FROM garages WHERE key_hash='another-key'").get(),
      other,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM support_adjustments").get().n,
      2,
    );
    const all = db.prepare("SELECT * FROM garages ORDER BY key_hash").all();
    db.exec(migration);
    assert.deepEqual(
      db.prepare("SELECT * FROM garages ORDER BY key_hash").all(),
      all,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM support_adjustments").get().n,
      2,
    );
  } finally {
    db.close();
  }
});

test("ambiguous owner names are skipped and additional hints use only unfinished artifacts", () => {
  const db = fixture();
  try {
    const p = seed(db, ani, "Ani", "Ani");
    seed(db, "owner-one", "techcrush-mac", "HiddenOne", true);
    seed(db, "owner-two", "techcrush-mac", "HiddenTwo", true);
    p.events[EVENT_ID].artifacts.tbilisi = [0, 3, 6, 9, 12];
    db.prepare("UPDATE garages SET profile=? WHERE key_hash=?").run(
      JSON.stringify(p),
      ani,
    );
    db.exec(migration);
    const granted = JSON.parse(
      db.prepare("SELECT receipt FROM support_adjustments").get().receipt,
    ).grantedHints;
    assert.equal(granted.length, 3);
    assert(granted.every((h) => h.map !== "tbilisi"));
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM support_adjustments").get().n,
      1,
    );
    assert.equal(
      db.prepare("SELECT version FROM garages WHERE key_hash='owner-one'").get()
        .version,
      7,
    );
    assert.equal(
      db.prepare("SELECT version FROM garages WHERE key_hash='owner-two'").get()
        .version,
      7,
    );
  } finally {
    db.close();
  }
});
