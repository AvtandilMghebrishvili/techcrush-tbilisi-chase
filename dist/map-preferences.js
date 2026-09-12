export const MAP_DEFAULTS = Object.freeze({ size: 110, zoom: 1, mapZoom: 1 });
const bounded = (value, fallback, min, max) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
export function normalizeMapPreferences(value) {
  const p = value && typeof value === "object" ? value : {};
  return {
    size: Math.round(bounded(p.size, MAP_DEFAULTS.size, 80, 160)),
    zoom: bounded(p.zoom, MAP_DEFAULTS.zoom, 0.5, 2.5),
    mapZoom: bounded(p.mapZoom, 1, 1, 3),
  };
}
// Pan is measured in viewport fractions, so resizing needs no new raster or pixel buffer.
export function clampMapView(view) {
  const zoom = bounded(view?.zoom, 1, 1, 3),
    limit = (zoom - 1) / 2;
  return {
    zoom,
    x: bounded(view?.x, 0, -limit, limit) || 0,
    y: bounded(view?.y, 0, -limit, limit) || 0,
  };
}
export function zoomMapView(view, zoom, anchor = { x: 0, y: 0 }) {
  const old = clampMapView(view),
    next = bounded(zoom, old.zoom, 1, 3),
    ratio = next / old.zoom;
  const ax = bounded(anchor.x, 0, -0.5, 0.5),
    ay = bounded(anchor.y, 0, -0.5, 0.5);
  return clampMapView({
    zoom: next,
    x: ax - (ax - old.x) * ratio,
    y: ay - (ay - old.y) * ratio,
  });
}
export function centerMapView(zoom, point) {
  return clampMapView({
    zoom,
    x: (0.5 - point.x) * zoom,
    y: (0.5 - point.y) * zoom,
  });
}
export function radarScale(zoom) {
  return (230 / 1100) * bounded(zoom, 1, 0.5, 2.5);
}
