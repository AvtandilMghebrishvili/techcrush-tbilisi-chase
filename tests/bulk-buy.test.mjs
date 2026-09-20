import test from "node:test";
import assert from "node:assert/strict";
import {
  newProfile,
  applyProgressAction,
  BOX_SHOP,
} from "../dist/progression.js";
import { handleApi, keyHash } from "../server/api.mjs";
import { openLocalDatabase } from "../server/local-db.mjs";

test("bulk purchases charge exactly the selected quantity for every box type", () => {
  for (const [kind, box] of Object.entries(BOX_SHOP)) {
    for (const count of [1, 3, 5, 10]) {
      const before = newProfile();
      before.credits = 1_000_000;
      const after = applyProgressAction(before, {
        type: "buy-box",
        kind,
        count,
      });
      assert.equal(after.credits, before.credits - count * box.price);
      assert.equal(after[box.field], before[box.field] + count);
      assert.deepEqual(
        after.inventory,
        before.inventory,
        "Buying must not open the boxes",
      );
      assert.deepEqual(after.lastPurchase, {
        kind,
        count,
        price: count * box.price,
      });
    }
  }
});

test("invalid or unaffordable bulk purchases cannot partially charge a wallet", () => {
  const profile = newProfile();
  profile.credits = 9999;
  const original = structuredClone(profile);
  for (const count of [0, -1, 11, 1.5, "3", "all", null])
    assert.throws(
      () =>
        applyProgressAction(profile, {
          type: "buy-box",
          kind: "street",
          count,
        }),
      /between/,
    );
  assert.throws(
    () =>
      applyProgressAction(profile, {
        type: "buy-box",
        kind: "street",
        count: 3,
      }),
    /12,000 CR/,
  );
  assert.throws(
    () =>
      applyProgressAction(profile, {
        type: "buy-box",
        kind: "__proto__",
        count: 1,
      }),
    /valid supply/,
  );
  assert.deepEqual(profile, original);
});

test("bulk purchase retries are idempotent and stale tabs cannot spend twice", async () => {
  const db = openLocalDatabase(":memory:"),
    token = "a".repeat(64),
    profile = newProfile();
  profile.credits = 100_000;
  await db
    .prepare(
      "INSERT INTO garages(key_hash,profile,version,updated_at) VALUES(?,?,0,0)",
    )
    .bind(await keyHash(token), JSON.stringify(profile))
    .run();
  const buy = (id, version) =>
    handleApi(
      new Request("https://game.test/api/action", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          version,
          action: { type: "buy-box", kind: "street", count: 10 },
        }),
      }),
      db,
    );
  try {
    const first = await buy("bulk-buy-one", 0);
    assert.equal(first.status, 200);
    const result = await first.json();
    assert.equal(result.profile.credits, 60000);
    assert.equal(result.profile.boxes, profile.boxes + 10);
    const retry = await buy("bulk-buy-one", 0);
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).profile.credits, 60000);
    const stale = await buy("bulk-buy-two", 0);
    assert.equal(stale.status, 409);
    assert.equal((await stale.json()).profile.credits, 60000);
  } finally {
    db.close();
  }
});
