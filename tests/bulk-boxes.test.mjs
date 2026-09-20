import test from "node:test";
import assert from "node:assert/strict";
import {
  newProfile,
  applyProgressAction,
  BOX_SHOP,
  PARTS,
  TIERS,
  boxOpenCount,
} from "../dist/progression.js";
import { handleApi, keyHash } from "../server/api.mjs";
import { openLocalDatabase } from "../server/local-db.mjs";

const seeded = () => {
  let seed = 1729;
  return () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
};
const units = (items) =>
  items.reduce((sum, item) => sum + (item.quantity || 1), 0);
for (const [kind, box] of Object.entries(BOX_SHOP)) {
  test(`${kind}: batch openings preserve the exact independent single-box drops and wallet`, () => {
    for (const requested of [1, 3, 10, "all"]) {
      const profile = newProfile();
      profile[box.field] = 23;
      const count = requested === "all" ? 23 : requested;
      const batch = applyProgressAction(
        profile,
        { type: "open-boxes", kind, count: requested, id: "batch-test" },
        seeded(),
      );
      let singles = profile;
      const rng = seeded();
      for (let i = 0; i < count; i++)
        singles = applyProgressAction(
          singles,
          {
            type: kind === "street" ? "open-box" : `open-${kind}-box`,
            id: `single-${i}`,
          },
          rng,
        );
      assert.equal(batch[box.field], 23 - count);
      assert.equal(batch.credits, singles.credits);
      assert.deepEqual(batch.inventory, singles.inventory);
      assert.equal(units(batch.lastBox.items), count * 3);
      assert.equal(batch.lastBox.count || 1, count);
      assert.equal(profile[box.field], 23, "input profile is immutable");
      for (const field of ["cars", "community", "maps", "quests", "settled"])
        assert.deepEqual(batch[field], singles[field], field);
    }
  });
}

test("invalid quantities and insufficient inventory reject the whole batch without spending", () => {
  const p = newProfile();
  p.boxes = 4;
  const before = structuredClone(p);
  for (const count of [0, -1, 1.5, 11, "3", null, undefined, 5])
    assert.throws(() =>
      applyProgressAction(p, { type: "open-boxes", kind: "street", count }),
    );
  for (const kind of ["unknown", "constructor", "__proto__", null])
    assert.throws(() =>
      applyProgressAction(p, { type: "open-boxes", kind, count: 1 }),
    );
  assert.throws(() =>
    applyProgressAction(p, {
      type: "open-boxes",
      kind: "special",
      count: "all",
    }),
  );
  assert.deepEqual(p, before);
  assert.equal(boxOpenCount("10", 4), 4);
  assert.equal(boxOpenCount("all", 23), 23);
});

test("ALL groups a large collection into a bounded summary and retains every duplicate for the garage", () => {
  const p = newProfile();
  p.creatorBoxes = 1200;
  const opened = applyProgressAction(
    p,
    { type: "open-boxes", kind: "creator", count: "all", id: "large-batch" },
    seeded(),
  );
  assert.equal(opened.creatorBoxes, 0);
  assert.equal(units(opened.lastBox.items), 3600);
  assert.equal(
    Object.values(opened.inventory).reduce((a, b) => a + b, 0),
    3600,
  );
  assert(opened.lastBox.items.length <= PARTS.length * (TIERS.length - 1));
  const item = opened.lastBox.items[0];
  assert.throws(
    () =>
      applyProgressAction(opened, {
        type: "claim-loot",
        boxId: "large-batch",
        index: 0,
        choice: "sell",
      }),
    /garage/,
  );
  const sold = applyProgressAction(opened, {
    type: "sell",
    part: item.part,
    tier: item.tier,
  });
  assert.equal(
    Object.values(sold.inventory).reduce((a, b) => a + b, 0),
    3599,
  );
});

test("API batches survive retry/reload and competing tabs cannot spend the same boxes twice", async () => {
  const db = openLocalDatabase(":memory:"),
    token = "b".repeat(64),
    other = "c".repeat(64);
  try {
    const original = newProfile();
    original.specialBoxes = 13;
    await db
      .prepare(
        "INSERT INTO garages(key_hash,profile,version,updated_at) VALUES(?,?,0,0)",
      )
      .bind(await keyHash(token), JSON.stringify(original))
      .run();
    const req = async (who, path, body, method = body ? "POST" : "GET") => {
      const response = await handleApi(
        new Request("https://game.test" + path, {
          method,
          headers: { Authorization: "Bearer " + who },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
        db,
      );
      return { status: response.status, ...(await response.json()) };
    };
    await req(other, "/api/profile", null, "POST");
    const body = {
      id: "bulk-open-retry-0001",
      version: 0,
      action: { type: "open-boxes", kind: "special", count: 10 },
    };
    const opened = await req(token, "/api/action", body);
    assert.equal(opened.status, 200);
    assert.equal(opened.profile.specialBoxes, 3);
    assert.equal(units(opened.profile.lastBox.items), 30);
    const retry = await req(token, "/api/action", body);
    assert.equal(retry.status, 200);
    assert.equal(retry.version, opened.version);
    assert.deepEqual(retry.profile, opened.profile);
    const competing = await Promise.all(
      [1, 2].map((n) =>
        req(token, "/api/action", {
          id: `bulk-competing-000${n}`,
          version: opened.version,
          action: { type: "open-boxes", kind: "special", count: "all" },
        }),
      ),
    );
    assert.deepEqual(competing.map((r) => r.status).sort(), [200, 409]);
    const reload = await req(token, "/api/profile");
    assert.equal(reload.profile.specialBoxes, 0);
    assert.equal(
      Object.values(reload.profile.inventory).reduce((a, b) => a + b, 0),
      39,
    );
    assert.equal(reload.version, 2);
    for (const field of ["community", "maps", "cars", "quests", "settled"])
      assert.deepEqual(reload.profile[field], original[field], field);
    const untouched = await req(other, "/api/profile");
    assert.equal(untouched.profile.boxes, 1);
    assert.deepEqual(untouched.profile.inventory, {});
  } finally {
    db.close();
  }
});
