import test from "node:test";
import assert from "node:assert/strict";
import { EventUI } from "../dist/event-ui.js";
import { EVENT_START, EVENT_END, EVENT_ID } from "../dist/event-rules.js";

test("PLAY closes the event panel before entering gameplay and ignores unavailable or duplicate entry", async () => {
  const previousDocument = globalThis.document;
  const calls = [];
  let now = EVENT_START - 1,
    finish;
  const ui = Object.assign(Object.create(EventUI.prototype), {
    store: {
      profile: { events: { [EVENT_ID]: { handle: "Racer" } } },
      busy: false,
      serverNow: () => now,
    },
    actions: {
      play: () => {
        calls.push("play");
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    },
  });
  globalThis.document = {
    getElementById: () => ({ close: () => calls.push("close") }),
  };
  try {
    await ui.play();
    assert.deepEqual(calls, []);
    now = EVENT_START;
    ui.store.busy = true;
    await ui.play();
    assert.deepEqual(calls, []);
    ui.store.busy = false;
    const first = ui.play();
    await ui.play();
    assert.deepEqual(calls, ["close", "play"]);
    finish();
    await first;
    assert.equal(ui.starting, false);
    ui.store.profile = {};
    await ui.play();
    assert.deepEqual(calls, ["close", "play"]);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("an open event panel enables entry when countdown expires, without reload or polling requests", () => {
  const previousDocument = globalThis.document;
  const previousLocation = globalThis.location;
  const previousHistory = globalThis.history;
  globalThis.location = new URL("http://test/?map=tbilisi");
  globalThis.history = {
    replaceState: (_state, _title, url) => {
      globalThis.location = new URL(url);
    },
  };
  const nodes = new Map();
  const element = (id) => {
    if (!nodes.has(id))
      nodes.set(id, {
        dataset: {},
        children: [],
        hidden: false,
        open: id === "event-dialog",
        setAttribute() {},
        querySelector: () => element("join-button"),
      });
    return nodes.get(id);
  };
  globalThis.document = { hidden: false, getElementById: element };
  let now = EVENT_START - 1;
  const ui = Object.assign(Object.create(EventUI.prototype), {
    store: { profile: {}, busy: false, serverNow: () => now },
    actions: {},
    map: "tbilisi",
    selected: false,
  });
  try {
    ui.render();
    assert(element("join-button").disabled);
    assert.match(element("join-button").textContent, /NOT STARTED/);
    assert.equal(element("event-clock-label").textContent, "STARTS IN");
    assert(!element("event-entry-status").hidden);
    now = EVENT_START;
    ui.tick();
    assert(!element("join-button").disabled);
    assert.equal(element("join-button").textContent, "JOIN EVENT ↗");
    assert.equal(element("event-clock-label").textContent, "ENDS IN");
    assert(element("event-entry-status").hidden);
    ui.store.busy = true;
    ui.render();
    assert(element("join-button").disabled);
    ui.store.busy = false;
    ui.store.profile.events = { [EVENT_ID]: { handle: "ExistingRacer" } };
    now = EVENT_START - 1;
    ui.tick();
    assert(element("event-enter").disabled);
    now = EVENT_START;
    ui.tick();
    assert(!element("event-enter").disabled);
    now = EVENT_END;
    ui.tick();
    assert(!element("event-enter").disabled);
    assert.equal(element("event-play-label").textContent, "PLAY");
    assert.match(element("event-play-context").textContent, /START CHASE/);
    assert(element("event-register").hidden);
    assert.equal(element("event-countdown").textContent, "FINISHED");
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousLocation === undefined) delete globalThis.location;
    else globalThis.location = previousLocation;
    if (previousHistory === undefined) delete globalThis.history;
    else globalThis.history = previousHistory;
  }
});

test("joined mode follows the profile across URL removal and city changes, then releases at the deadline", () => {
  const previousLocation = globalThis.location,
    previousHistory = globalThis.history;
  let now = EVENT_START;
  const profile = { events: { [EVENT_ID]: { handle: "EnrolledRacer" } } };
  const ui = Object.assign(Object.create(EventUI.prototype), {
    store: { profile, serverNow: () => now },
    selected: false,
  });
  globalThis.history = {
    replaceState: (_state, _title, url) => {
      globalThis.location = new URL(url);
    },
  };
  try {
    for (const city of ["tbilisi", "kutaisi", "batumi", "rustavi"]) {
      globalThis.location = new URL("http://test/?map=" + city);
      ui.syncMode();
      assert.equal(ui.runEvent(), EVENT_ID);
      assert.equal(ui.selected, true);
      assert.equal(globalThis.location.searchParams.get("event"), EVENT_ID);
      assert.equal(globalThis.location.searchParams.get("map"), city);
    }
    now = EVENT_END;
    ui.syncMode();
    assert.equal(ui.runEvent(), undefined);
    assert.equal(ui.selected, false);
    assert.equal(globalThis.location.searchParams.has("event"), false);
    assert(
      profile.events[EVENT_ID],
      "ending the event must retain the participant's saved progress",
    );
  } finally {
    if (previousLocation === undefined) delete globalThis.location;
    else globalThis.location = previousLocation;
    if (previousHistory === undefined) delete globalThis.history;
    else globalThis.history = previousHistory;
  }
});
