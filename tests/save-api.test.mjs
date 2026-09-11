import test from "node:test";
import assert from "node:assert/strict";
import { handleApi } from "../server/api.mjs";
import { openLocalDatabase } from "../server/local-db.mjs";
import { unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";

test("saved garages are isolated, durable and reject conflicting or repeated charges", async () => {
  const DB = openLocalDatabase(":memory:");
  const a = "1".repeat(64),
    b = "2".repeat(64);
  const request = (token, path, method = "GET", body) =>
    handleApi(
      new Request("https://game.test" + path, {
        method,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
      DB,
    );
  try {
    assert.equal(
      (await handleApi(new Request("https://game.test/api/profile"), DB))
        .status,
      401,
    );
    assert.equal((await request(a, "/api/action")).status, 405);
    const first = await (await request(a, "/api/profile", "POST")).json();
    await request(b, "/api/profile", "POST");
    assert.equal(first.profile.credits, 1000);
    const body = {
      id: "upgrade-0001",
      version: 0,
      action: { type: "upgrade", car: "gt", part: "engine" },
    };
    const upgraded = await (
      await request(a, "/api/action", "POST", body)
    ).json();
    assert.equal(upgraded.profile.credits, 400);
    const repeated = await (
      await request(a, "/api/action", "POST", body)
    ).json();
    assert.equal(repeated.profile.credits, 400);
    assert.equal(repeated.version, 1);
    const other = await (await request(b, "/api/profile")).json();
    assert.equal(other.profile.credits, 1000);
    assert.equal(other.profile.cars.gt.engine, undefined);
    assert.equal(
      (
        await request(a, "/api/action", "POST", {
          ...body,
          id: "conflict-0002",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request(a, "/api/action", "POST", {
          id: "expensive-0003",
          version: 1,
          action: { type: "upgrade", car: "gt", part: "engine" },
        })
      ).status,
      400,
    );
    const reopened = await (await request(a, "/api/profile", "POST")).json();
    assert.equal(reopened.profile.cars.gt.engine, 1);
    assert.equal(reopened.profile.credits, 400);
    const drop = {
      id: "drop-0000004",
      version: 1,
      action: { type: "open-box" },
    };
    const result = await (await request(a, "/api/action", "POST", drop)).json();
    assert.equal(result.profile.lastBox.items.length, 3);
    assert.equal(result.profile.boxes, 0);
    const retried = await (
      await request(a, "/api/action", "POST", drop)
    ).json();
    assert.deepEqual(retried.profile.lastBox, result.profile.lastBox);
    const finish = {
      id: "level-complete-0005",
      version: 2,
      action: {
        type: "settle",
        runId: "winning-run-0001",
        level: 1,
        cash: 1700,
        result: "won",
      },
    };
    const level = await (
      await request(a, "/api/action", "POST", finish)
    ).json();
    assert.equal(level.profile.level, 2);
    assert.equal(level.profile.boxes, 1);
    assert.equal(level.profile.credits, 4150);
    const again = await (
      await request(a, "/api/action", "POST", finish)
    ).json();
    assert.deepEqual(again.profile, level.profile);
  } finally {
    DB.close();
  }
});

test("saved progress survives closing and reopening the SQLite database", async () => {
  const file = ".sites-runtime/save-test-" + randomUUID() + ".sqlite";
  let DB = openLocalDatabase(file);
  const token = "3".repeat(64);
  const req = (path, method = "GET", body) =>
    handleApi(
      new Request("https://game.test" + path, {
        method,
        headers: { Authorization: "Bearer " + token },
        body: body ? JSON.stringify(body) : undefined,
      }),
      DB,
    );
  try {
    await req("/api/profile", "POST");
    await req("/api/action", "POST", {
      id: "durable-upgrade-01",
      version: 0,
      action: { type: "upgrade", car: "suv", part: "turbo" },
    });
    DB.close();
    DB = openLocalDatabase(file);
    const data = await (await req("/api/profile")).json();
    assert.equal(data.profile.credits, 400);
    assert.equal(data.profile.cars.suv.turbo, 1);
    assert.equal(data.version, 1);
  } finally {
    DB.close();
    unlinkSync(file);
  }
});
