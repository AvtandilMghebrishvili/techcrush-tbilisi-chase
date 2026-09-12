import test from "node:test";
import assert from "node:assert/strict";
import { handleApi, keyHash } from "../server/api.mjs";
import { openLocalDatabase } from "../server/local-db.mjs";
import { newProfile } from "../dist/progression.js";
test("online fusion and drop actions are atomic, retry-safe and cannot spend the same reward twice", async () => {
  const db = openLocalDatabase(":memory:"),
    token = "7".repeat(64),
    p = newProfile();
  p.cars.gt.engine = 2;
  p.inventory["engine:2"] = 15;
  p.lastBox = {
    id: "fixture-loot-box",
    items: [
      { part: "engine", tier: 2 },
      { part: "engine", tier: 2 },
      { part: "engine", tier: 2 },
    ],
  };
  const req = (body) =>
    handleApi(
      new Request("https://game.test/api/action", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }),
      db,
    );
  try {
    await db
      .prepare(
        "INSERT INTO garages(key_hash,profile,version,updated_at) VALUES(?,?,0,0)",
      )
      .bind(await keyHash(token), JSON.stringify(p))
      .run();
    const action = {
      id: "fuse-operation-0001",
      version: 0,
      action: { type: "fuse", car: "gt", part: "engine" },
    };
    const first = await req(action);
    assert.equal(first.status, 200);
    const one = await first.json();
    assert.equal(one.profile.cars.gt.stars.engine, 1);
    assert.equal(one.profile.inventory["engine:2"], 10);
    const replay = await req(action);
    assert.equal(replay.status, 200);
    assert.deepEqual((await replay.json()).profile, one.profile);
    const stale = await req({ ...action, id: "fuse-operation-0002" });
    assert.equal(stale.status, 409);
    const claims = await Promise.all(
      [0, 1].map((n) =>
        req({
          id: "claim-operation-000" + n,
          version: one.version,
          action: {
            type: "claim-loot",
            boxId: p.lastBox.id,
            index: 0,
            choice: "sell",
            car: "gt",
          },
        }),
      ),
    );
    assert.deepEqual(claims.map((r) => r.status).sort(), [200, 409]);
    const won = await claims.find((r) => r.status === 200).json();
    assert.equal(won.profile.credits, 1180);
    assert.equal(won.profile.inventory["engine:2"], 9);
    assert.equal(
      (
        await req({
          id: "claim-operation-0003",
          version: won.version,
          action: {
            type: "claim-loot",
            boxId: p.lastBox.id,
            index: 0,
            choice: "sell",
            car: "gt",
          },
        })
      ).status,
      400,
    );
  } finally {
    db.close();
  }
});
