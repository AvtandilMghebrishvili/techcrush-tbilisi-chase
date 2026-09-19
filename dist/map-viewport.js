import { clampMapView, zoomMapView, centerMapView } from "./map-preferences.js";
import { mapPreferences, saveMapPreferences } from "./map-settings.js";

// Transform the one existing map raster and its pins together. No render loop.
export class MapViewport {
  constructor() {
    this.host = document.getElementById("quest-viewport");
    this.surface = document.getElementById("quest-surface");
    this.view = clampMapView({ zoom: mapPreferences.mapZoom });
    this.pointers = new Map();
    const $ = (id) => document.getElementById(id);
    $("quest-zoom-in").onclick = () => this.zoom(this.view.zoom + 0.25);
    $("quest-zoom-out").onclick = () => this.zoom(this.view.zoom - 0.25);
    $("quest-map-fit").onclick = () => {
      this.view = clampMapView({ zoom: 1 });
      this.apply();
    };
    $("quest-map-player").onclick = () => this.center();
    this.host.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const rect = this.host.getBoundingClientRect();
        this.zoom(this.view.zoom + (event.deltaY < 0 ? 0.15 : -0.15), {
          x: (event.clientX - rect.left) / rect.width - 0.5,
          y: (event.clientY - rect.top) / rect.height - 0.5,
        });
      },
      { passive: false },
    );
    this.host.addEventListener("keydown", (event) => {
      if (event.target !== this.host) return;
      if (
        [
          "+",
          "=",
          "-",
          "_",
          "0",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
        ].includes(event.key)
      )
        event.preventDefault();
      if (["+", "="].includes(event.key)) this.zoom(this.view.zoom + 0.25);
      if (["-", "_"].includes(event.key)) this.zoom(this.view.zoom - 0.25);
      if (event.key === "0") $("quest-map-fit").click();
      const delta = {
        ArrowLeft: [0.08, 0],
        ArrowRight: [-0.08, 0],
        ArrowUp: [0, 0.08],
        ArrowDown: [0, -0.08],
      }[event.key];
      if (delta) {
        this.view = clampMapView({
          ...this.view,
          x: this.view.x + delta[0],
          y: this.view.y + delta[1],
        });
        this.apply();
      }
    });
    this.host.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      if (this.pointers.size >= 2) return;
      if (!this.pointers.size) {
        this.dragged = false;
        this.rect = this.host.getBoundingClientRect();
      }
      this.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
      });
      if (this.pointers.size > 1) this.dragged = true;
      if (!event.target.closest("button")) this.capture(event.pointerId);
    });
    this.host.addEventListener("pointermove", (event) => this.move(event));
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      this.host.addEventListener(type, (event) => {
        if (type === "pointercancel") this.dragged = true;
        this.pointers.delete(event.pointerId);
        if (!this.pointers.size) this.host.classList.remove("panning");
      });
    this.host.addEventListener(
      "click",
      (event) => {
        if (this.dragged) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true,
    );
    $("quest-map").addEventListener("close", () => {
      mapPreferences.mapZoom = this.view.zoom;
      saveMapPreferences();
      this.cancel();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.cancel();
    });
  }
  capture(id) {
    try {
      this.host.setPointerCapture(id);
    } catch {}
  }
  cancel() {
    for (const id of this.pointers.keys())
      if (this.host.hasPointerCapture(id)) this.host.releasePointerCapture(id);
    this.pointers.clear();
    this.host.classList.remove("panning");
  }
  move(event) {
    const old = this.pointers.get(event.pointerId);
    if (!old || !this.rect?.width || !this.rect.height) return;
    const next = { ...old, x: event.clientX, y: event.clientY },
      previous = [...this.pointers.values()];
    this.pointers.set(event.pointerId, next);
    if (
      Math.hypot(next.x - old.startX, next.y - old.startY) > 5 ||
      this.pointers.size === 2
    )
      this.dragged = true;
    if (!this.dragged) return;
    this.capture(event.pointerId);
    this.host.classList.add("panning");
    const dx = (next.x - old.x) / this.rect.width,
      dy = (next.y - old.y) / this.rect.height;
    if (this.pointers.size === 2) {
      const points = [...this.pointers.values()],
        distance = (p) => Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      const oldDistance = distance(previous),
        newDistance = distance(points);
      const anchor = {
        x:
          ((previous[0].x + previous[1].x) / 2 - this.rect.left) /
            this.rect.width -
          0.5,
        y:
          ((previous[0].y + previous[1].y) / 2 - this.rect.top) /
            this.rect.height -
          0.5,
      };
      if (oldDistance > 2)
        this.view = zoomMapView(
          this.view,
          (this.view.zoom * newDistance) / oldDistance,
          anchor,
        );
      this.view = clampMapView({
        ...this.view,
        x: this.view.x + dx / 2,
        y: this.view.y + dy / 2,
      });
    } else
      this.view = clampMapView({
        ...this.view,
        x: this.view.x + dx,
        y: this.view.y + dy,
      });
    this.apply();
  }
  open(player) {
    this.cancel();
    this.player = player;
    this.view = centerMapView(mapPreferences.mapZoom, player);
    this.apply();
  }
  center() {
    if (this.player) {
      this.view = centerMapView(this.view.zoom, this.player);
      this.apply();
    }
  }
  zoom(value, anchor) {
    this.view = zoomMapView(this.view, value, anchor);
    this.apply();
  }
  apply() {
    const { zoom, x, y } = this.view;
    this.surface.style.transform = `translate(${x * 100}%,${y * 100}%) scale(${zoom})`;
    this.surface.style.setProperty("--pin-scale", 1 / zoom);
    document.getElementById("quest-zoom-value").textContent =
      `${Math.round(zoom * 100)}%`;
    document.getElementById("quest-zoom-in").disabled = zoom >= 3;
    document.getElementById("quest-zoom-out").disabled = zoom <= 1;
    this.onchange?.();
  }
}
