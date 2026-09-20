import test from "node:test";
import assert from "node:assert/strict";
import { handleApi } from "../server/api.mjs";
import { openLocalDatabase } from "../server/local-db.mjs";

const token = (digit) => digit.repeat(64);
const session = (digit) =>
  `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;
const request = (path, bearer, method = "GET", body) =>
  new Request(`https://game.test${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const pose = (id, map, x = 0) => ({
  session: session(id),
  map,
  car: "gt",
  x,
  y: 0.7,
  z: 10,
  angle: 0.5,
  pitch: 0,
  roll: 0,
  score: 999999,
  police: [{ x: 1, z: 2 }],
});

test("ghost presence shares only nearby same-city car poses", async () => {
  const db = openLocalDatabase(":memory:");
  let now = 1_800_000_000_000;
  const call = (req) => handleApi(req, db, { now: () => now });
  for (const id of ["a", "b", "c"])
    assert.equal(
      (await call(request("/api/profile", token(id), "POST"))).status,
      200,
    );

  await call(
    request("/api/ghosts", token("a"), "POST", pose("1", "tbilisi", 20)),
  );
  await call(
    request("/api/ghosts", token("c"), "POST", pose("3", "batumi", 20)),
  );
  const response = await call(
    request("/api/ghosts", token("b"), "POST", pose("2", "tbilisi", 25)),
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ghosts.length, 1);
  assert.deepEqual(Object.keys(data.ghosts[0]).sort(), [
    "angle",
    "car",
    "id",
    "pitch",
    "roll",
    "x",
    "y",
    "z",
  ]);
  assert.equal(data.ghosts[0].id, session("1"));
  assert.equal("score" in data.ghosts[0], false);
  assert.equal("police" in data.ghosts[0], false);

  now += 8000;
  const stale = await call(
    request("/api/ghosts", token("b"), "POST", pose("2", "tbilisi", 25)),
  );
  assert.deepEqual((await stale.json()).ghosts, []);
  db.close();
});

test("ghost API rejects unsupported payloads and never creates a garage", async () => {
  const db = openLocalDatabase(":memory:");
  const missing = await handleApi(
    request("/api/ghosts", token("d"), "POST", pose("4", "tbilisi")),
    db,
  );
  assert.equal(missing.status, 404);
  await handleApi(request("/api/profile", token("d"), "POST"), db);
  const invalid = await handleApi(
    request("/api/ghosts", token("d"), "POST", {
      ...pose("4", "tbilisi"),
      car: "police",
    }),
    db,
  );
  assert.equal(invalid.status, 400);
  db.close();
});
