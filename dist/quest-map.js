import { MapViewport } from "./map-viewport.js";
import { LIMIT } from "./config.js";
import { ROADS } from "./city-map.js";
import { RIVER_POLYGON } from "./district-data.js";
import { SPECIAL_RAMPS, QUEST_BOX } from "./world-sites.js";
import { RAMPS } from "./stunts.js";
import {
  CITY_NAME,
  IS_KUTAISI,
  IS_BATUMI,
  IS_RUSTAVI,
} from "./map-selection.js";
import {
  checkpointTarget,
  checkpointRoute,
  secondaryTarget,
  secondaryRoute,
  setWaypoint,
} from "./navigation-cache.js";
import { mapClickPoint, routeDistance } from "./hud-math.js";
import { LANDMARKS } from "./district-data.js";
export const MAP_PLACES = IS_RUSTAVI
  ? [
      { ...LANDMARKS.heroes, name: "HEROES SQUARE", symbol: "H" },
      { ...LANDMARKS.hall, name: "CITY HALL", symbol: "C" },
      { ...LANDMARKS.monument, name: "NEW MONUMENT", symbol: "D" },
      { ...LANDMARKS.track, name: "MOTORPARK", symbol: "T" },
      { ...LANDMARKS.agency, name: "DRIVING ACADEMY", symbol: "A" },
    ]
  : !IS_KUTAISI && !IS_BATUMI
    ? await (async () => {
        const { HEROES, FREEDOM, KING_DAVID, AXIS } = await import(
          "./tbilisi-civic-layout.js"
        );
        return [
          { ...FREEDOM, name: "FREEDOM SQUARE", symbol: "F" },
          { ...HEROES, name: "HEROES FLYOVER", symbol: "H" },
          { ...KING_DAVID, name: "KING DAVID", symbol: "K" },
          { ...AXIS, name: "AXIS TOWERS", symbol: "A" },
          { ...LANDMARKS.narikala, name: "NARIKALA", symbol: "N" },
        ];
      })()
    : [];

const CIVIC_PARKS = IS_RUSTAVI
  ? (await import("./rustavi-civic-data.js")).HEROES_PARKS
  : [];
export const MAP_EXTENT = LIMIT + 80;
export const QUEST_PINS = SPECIAL_RAMPS.filter((r) => r.quest).map((r, i) => ({
  ...r,
  route: i ? "river" : "skybox",
  symbol: i ? "R" : "S",
  color: i ? "#72edf2" : "#e3adff",
  title: i ? (IS_KUTAISI ? "RIONI GAP" : "MTKVARI GAP") : "ROOFTOP SKYBOX",
  reward:
    IS_KUTAISI || IS_BATUMI || IS_RUSTAVI
      ? "PLATINUM BOX"
      : "PARTS BOX + CREDITS",
}));
export const mapPoint = (point, size = 900) => ({
  x: ((MAP_EXTENT - point.x) / (MAP_EXTENT * 2)) * size,
  y: ((MAP_EXTENT - point.z) / (MAP_EXTENT * 2)) * size,
});

// One small raster of static geography, shared by the radar and full map.
// No timers, WebGL context or duplicate world geometry are allocated here.
let atlas;
export function mapAtlas() {
  if (atlas) return atlas;
  atlas = document.createElement("canvas");
  atlas.width = atlas.height = 1536;
  const c = atlas.getContext("2d"),
    scale = 1536 / (MAP_EXTENT * 2);
  c.fillStyle = "#112531";
  c.fillRect(0, 0, 1536, 1536);
  c.fillStyle = "#245867";
  c.beginPath();
  RIVER_POLYGON.forEach(([x, z], i) => {
    const p = mapPoint({ x, z }, 1536);
    if (i) c.lineTo(p.x, p.y);
    else c.moveTo(p.x, p.y);
  });
  c.closePath();
  c.fill();
  for (const park of CIVIC_PARKS) {
    const p = mapPoint(park, 1536);
    c.save();
    c.translate(p.x, p.y);
    c.rotate(-park.angle);
    c.fillStyle = "#507755";
    c.fillRect(
      (-park.w * scale) / 2,
      (-park.d * scale) / 2,
      park.w * scale,
      park.d * scale,
    );
    c.restore();
  }
  c.strokeStyle = "#80959d";
  c.lineCap = "round";
  for (const road of ROADS) {
    const a = mapPoint(road.start, 1536),
      b = mapPoint(road.end, 1536);
    c.lineWidth = Math.max(1, road.width * scale);
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
  }
  return atlas;
}

export class QuestMap {
  constructor(sim, profile, select) {
    this.sim = sim;
    this.profile = profile;
    this.select = select;
    this.dialog = document.getElementById("quest-map");
    this.viewport = new MapViewport();
    document.getElementById("quest-map-close").onclick = () =>
      this.dialog.close();
    document.getElementById("quest-map-open").onclick = () => this.open();
    document.getElementById("quest-return").onclick = () => this.dialog.close();
    document.getElementById("river-quest-legend").hidden = !QUEST_PINS.some(
      (q) => q.route === "river",
    );
    document.getElementById("waypoint-clear").onclick = () => {
      this.select("");
      setWaypoint(sim, null);
      this.draw();
    };
    const pick = (x, y) => {
      const point = mapClickPoint(
        { x, y },
        this.viewport.surface.getBoundingClientRect(),
        MAP_EXTENT,
      );
      if (point) this.pin(point);
    };
    this.viewport.host.addEventListener("click", (event) => {
      if (
        event.defaultPrevented ||
        this.viewport.dragged ||
        event.target.closest("button")
      )
        return;
      pick(event.clientX, event.clientY);
    });
    this.viewport.host.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.target !== this.viewport.host) return;
      event.preventDefault();
      const rect = this.viewport.host.getBoundingClientRect();
      pick(rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
  }
  pin(point, name) {
    this.select("");
    setWaypoint(this.sim, point, name);
    this.draw();
  }
  route(value) {
    this.select(value);
    this.dialog.close();
  }
  open() {
    const sim = this.sim,
      saved = this.profile().quests?.completed || [];
    const completed = new Set([...saved, ...sim.runQuests]);
    document.getElementById("quest-city").textContent =
      CITY_NAME + " · EXPLORE & COLLECT";
    document.getElementById("quest-list").innerHTML = QUEST_PINS.map(
      (q) =>
        `<button data-quest-route="${q.route}" class="quest-card" style="--quest:${q.color}"><b>${q.symbol}</b><span><strong>${q.title} ${completed.has(q.quest) ? "✓" : ""}</strong><small>${Math.round(Math.hypot(q.x - sim.player.x, q.z - sim.player.z))} M TO RAMP · ${q.name.includes("220") ? "220" : "200"}+ KM/H</small><small>${completed.has(q.quest) ? "BOX COLLECTED · PRACTISE THE JUMP" : q.reward + " · ONE-TIME REWARD"}</small></span><em>ROUTE ↗</em></button>`,
    ).join("");
    const pins = document.getElementById("quest-pins");
    pins.innerHTML = QUEST_PINS.map((q) => {
      const p = mapPoint(q, 100);
      return `<button data-quest-route="${q.route}" class="quest-pin" style="left:${p.x}%;top:${p.y}%;--quest:${q.color}" aria-label="Route to ${q.title}">${q.symbol}${completed.has(q.quest) ? "✓" : ""}</button>`;
    }).join("");
    const cash = (sim.cashBannerTargets || []).filter((p) => !p.broken);
    for (const target of cash) {
      const p = mapPoint(target, 100);
      const pin = document.createElement("span");
      pin.className = "quest-pin cash-pin";
      pin.style.cssText = `left:${p.x}%;top:${p.y}%;--quest:#ffd166`;
      pin.textContent = "₾";
      pin.title = "TECHCRUSH banner · 4,000 coins";
      pins.append(pin);
    }
    document.getElementById("quest-city").textContent +=
      ` · ${cash.length}/3 CASH BANNERS`;
    for (const b of this.dialog.querySelectorAll("[data-quest-route]"))
      b.onclick = () => this.route(b.dataset.questRoute);
    const places = document.getElementById("map-places");
    places.innerHTML = MAP_PLACES.map(
      (place, i) =>
        `<button data-map-place="${i}">${place.symbol} · ${place.name}</button>`,
    ).join("");
    for (const [i, place] of MAP_PLACES.entries()) {
      const point = mapPoint(place, 100),
        button = document.createElement("button");
      button.className = "quest-pin place-pin";
      button.style.cssText = `left:${point.x}%;top:${point.y}%;--quest:#afc6d9`;
      button.textContent = place.symbol;
      button.dataset.mapPlace = i;
      button.setAttribute("aria-label", `Set waypoint to ${place.name}`);
      pins.append(button);
    }
    for (const button of this.dialog.querySelectorAll("[data-map-place]"))
      button.onclick = () => {
        const place = MAP_PLACES[Number(button.dataset.mapPlace)];
        this.pin(place, place.name);
      };
    this.draw();
    this.dialog.showModal();
    this.viewport.open(mapPoint(sim.player, 1));
  }
  draw() {
    const sim = this.sim;
    const c = document.getElementById("quest-canvas").getContext("2d");
    c.drawImage(mapAtlas(), 0, 0, 900, 900);
    c.strokeStyle = "#73e6ed";
    c.lineWidth = 3;
    c.beginPath();
    const player = mapPoint(sim.player);
    c.moveTo(player.x, player.y);
    for (const p of checkpointRoute(sim)) {
      const v = mapPoint(p);
      c.lineTo(v.x, v.y);
    }
    c.stroke();
    for (const r of RAMPS.slice(0, 4)) {
      const p = mapPoint(r);
      c.fillStyle = "#e0b666";
      c.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    const dot = (point, color, size, label) => {
      const p = mapPoint(point);
      c.fillStyle = color;
      c.beginPath();
      c.arc(p.x, p.y, size, 0, Math.PI * 2);
      c.fill();
      c.font = "bold 15px Arial";
      c.fillText(label, p.x + size + 5, p.y + 5);
    };
    dot(QUEST_BOX, "#e3adff", 5, "ROOF CRATE");
    sim.checkpoints.forEach((p, i) =>
      dot(p, i < sim.checkpoint ? "#66827a" : "#ffffff", 5, String(i + 1)),
    );
    const target = checkpointTarget(sim);
    if (target) dot(target, "#73e6ed", 7, "");
    const secondary = secondaryTarget(sim);
    const info = document.getElementById("waypoint-info");
    document.getElementById("waypoint-clear").disabled = !secondary;
    if (secondary) {
      const route = secondaryRoute(sim);
      c.strokeStyle = "#ffd43b";
      c.lineWidth = 3;
      c.setLineDash([6, 4]);
      c.beginPath();
      c.moveTo(player.x, player.y);
      for (const point of route) {
        const v = mapPoint(point);
        c.lineTo(v.x, v.y);
      }
      c.stroke();
      c.setLineDash([]);
      dot(secondary, "#ffd43b", 8, "PIN");
      info.textContent = `${secondary.name} · ${Math.round(routeDistance(sim.player, route))} M`;
    } else info.textContent = "TAP A STREET TO SET YOUR DESTINATION";
    c.save();
    c.translate(player.x, player.y);
    c.rotate(-sim.player.angle);
    c.fillStyle = "#ff335c";
    c.strokeStyle = "#fff";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, -10);
    c.lineTo(6, 7);
    c.lineTo(0, 4);
    c.lineTo(-6, 7);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
    c.fillStyle = "#fff";
    c.fillText("YOU", player.x + 12, player.y + 5);
  }
}
