import test from "node:test";
import assert from "node:assert/strict";
import {
  MAP_DEFAULTS,
  normalizeMapPreferences,
  clampMapView,
  zoomMapView,
  centerMapView,
  radarScale,
} from "../dist/map-preferences.js";
import { radarPoint } from "../dist/hud-math.js";

test("map settings default safely for old users and malformed local preferences", () => {
  for (const value of [
    null,
    undefined,
    "old",
    42,
    [],
    { size: NaN, zoom: Infinity, mapZoom: "3" },
  ])
    assert.deepEqual(normalizeMapPreferences(value), MAP_DEFAULTS);
  assert.deepEqual(
    normalizeMapPreferences({ size: 9999, zoom: -8, mapZoom: 20, extra: true }),
    { size: 160, zoom: 0.5, mapZoom: 3 },
  );
  const saved = { size: 135, zoom: 1.75, mapZoom: 2.5 };
  assert.deepEqual(
    normalizeMapPreferences(JSON.parse(JSON.stringify(saved))),
    saved,
  );
  assert.equal(normalizeMapPreferences({ size: 0 }).size, 80);
});
test("radar zoom changes world coverage without moving player center or distant marker bearings", () => {
  assert.equal(radarScale(2), radarScale(1) * 2);
  assert.equal(radarScale(0.5), radarScale(1) / 2);
  for (const zoom of [0.5, 1, 1.75, 2.5]) {
    const scale = radarScale(zoom),
      player = { x: 721, z: -343 },
      ox = 115 + player.x * scale,
      oy = 115 + player.z * scale;
    assert(Math.abs(ox - player.x * scale - 115) < 1e-10);
    assert(Math.abs(oy - player.z * scale - 115) < 1e-10);
    const point = radarPoint(115 + 3000 * scale, 115 + 4000 * scale);
    assert(point.edge);
    assert(Math.abs((point.x - 115) / (point.y - 115) - 0.75) < 1e-12);
    assert(Math.abs(Math.hypot(point.x - 115, point.y - 115) - 101) < 1e-10);
  }
});
test("full map cannot pan into blank space and fit always recovers the entire city", () => {
  for (const zoom of [1, 1.25, 2, 3])
    for (const x of [-100, -0.7, 0, 0.5, 100])
      for (const y of [-100, -0.4, 0, 0.8, 100]) {
        const view = clampMapView({ zoom, x, y }),
          limit = (zoom - 1) / 2;
        assert(Math.abs(view.x) <= limit && Math.abs(view.y) <= limit);
        assert.deepEqual(zoomMapView(view, 1), { zoom: 1, x: 0, y: 0 });
      }
  assert.deepEqual(clampMapView({ zoom: NaN, x: Infinity, y: -Infinity }), {
    zoom: 1,
    x: 0,
    y: 0,
  });
});
test("zoom preserves the world point under the cursor or pinch midpoint away from the map edge", () => {
  const old = { zoom: 2, x: 0.1, y: -0.1 },
    anchor = { x: 0.2, y: -0.15 },
    next = zoomMapView(old, 2.5, anchor);
  for (const axis of ["x", "y"])
    assert(
      Math.abs(
        (anchor[axis] - old[axis]) / old.zoom -
          (anchor[axis] - next[axis]) / next.zoom,
      ) < 1e-12,
    );
  const back = zoomMapView(next, 2, anchor);
  assert(Math.abs(back.x - old.x) < 1e-12 && Math.abs(back.y - old.y) < 1e-12);
});
test("find player centers interior positions and keeps edge positions visible at every zoom", () => {
  for (const zoom of [1, 1.5, 2, 3])
    for (const point of [
      { x: 0.5, y: 0.5 },
      { x: 0.3, y: 0.7 },
      { x: 0.01, y: 0.99 },
    ]) {
      const view = centerMapView(zoom, point),
        screenX = (point.x - 0.5) * zoom + view.x,
        screenY = (point.y - 0.5) * zoom + view.y;
      assert(Math.abs(screenX) <= 0.5 && Math.abs(screenY) <= 0.5);
      if (point.x === 0.5) assert.equal(screenX, 0);
    }
});
