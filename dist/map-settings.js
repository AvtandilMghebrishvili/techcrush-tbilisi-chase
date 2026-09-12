import { MAP_DEFAULTS, normalizeMapPreferences } from "./map-preferences.js";
export const MAP_STORAGE_KEY = "techcrush-map-view-v1";
let saved;
try {
  saved = JSON.parse(localStorage.getItem(MAP_STORAGE_KEY) || "null");
} catch {}
export const mapPreferences = normalizeMapPreferences(saved);
export function saveMapPreferences() {
  try {
    localStorage.setItem(
      MAP_STORAGE_KEY,
      JSON.stringify(normalizeMapPreferences(mapPreferences)),
    );
  } catch {}
}
export class MapSettings {
  constructor(redraw) {
    this.redraw = redraw;
    this.inputs = [...document.querySelectorAll("[data-radar-pref]")];
    for (const input of this.inputs) {
      input.addEventListener("input", () => {
        Object.assign(
          mapPreferences,
          normalizeMapPreferences({
            ...mapPreferences,
            [input.dataset.radarPref]: Number(input.value),
          }),
        );
        this.sync();
        redraw();
      });
      // Persist at the end of a drag, not once per input sample.
      input.addEventListener("change", saveMapPreferences);
    }
    for (const button of document.querySelectorAll("[data-reset-radar]"))
      button.onclick = () => {
        Object.assign(mapPreferences, {
          size: MAP_DEFAULTS.size,
          zoom: MAP_DEFAULTS.zoom,
        });
        this.sync();
        saveMapPreferences();
        redraw();
      };
    this.preview = document.getElementById("radar-preview");
    this.previewContext = this.preview.getContext("2d");
    document.getElementById("map-options").addEventListener("toggle", () => {
      if (document.getElementById("map-options").open) redraw();
    });
    this.sync();
  }
  sync() {
    document.documentElement.style.setProperty(
      "--radar-user-scale",
      mapPreferences.size / 100,
    );
    for (const input of this.inputs) {
      const key = input.dataset.radarPref,
        value = mapPreferences[key];
      input.value = String(value);
      const text = key === "size" ? `${value}%` : `${value.toFixed(2)}×`;
      input.setAttribute("aria-valuetext", text);
      document.getElementById(input.id + "-value").textContent = text;
    }
  }
  copyPreview(canvas) {
    if (
      !document.getElementById("controls-dialog").open ||
      !document.getElementById("map-options").open
    )
      return;
    this.previewContext.clearRect(
      0,
      0,
      this.preview.width,
      this.preview.height,
    );
    this.previewContext.drawImage(
      canvas,
      0,
      0,
      this.preview.width,
      this.preview.height,
    );
  }
}
