import {
  availablePowerups,
  powerupIconSVG,
  separatePowerupPins,
} from "./powerup-map.js";
import { STUNT_REWARDS } from "./community-rules.js";
import { MapViewport } from "./map-viewport.js";
import { LIMIT } from "./config.js";
import { ROADS } from "./city-map.js";
import { RIVER_POLYGON } from "./district-data.js";
import { SPECIAL_RAMPS, ROOFTOP_QUESTS } from "./world-sites.js";
import { RAMPS } from "./stunts.js";
import {
  ACTIVE_MAP,
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
  questRouteId,
} from "./navigation-cache.js";
import { mapClickPoint, routeDistance } from "./hud-math.js";
import { LANDMARKS } from "./district-data.js";
import { FACADE_BANNERS } from "./city-brand-sites.js";
import { ARTIFACT_SEARCH_RADIUS, activeArtifactHints } from "./event-rules.js";
import { SPONSOR_SITES } from "./sponsor-sites.js";
import { MAP_PLACES } from "./map-landmarks.js";
export { MAP_PLACES };

const CIVIC_PARKS = IS_RUSTAVI
  ? (await import("./rustavi-civic-data.js")).HEROES_PARKS
  : [];
export const MAP_EXTENT = LIMIT + 80;
export const QUEST_PINS = SPECIAL_RAMPS.filter((r) => r.quest).map((r) => {
  const roofIndex = ROOFTOP_QUESTS.findIndex((q) => q.ramp === r);
  return {
    ...r,
    route: questRouteId(r),
    symbol: roofIndex >= 0 ? `S${roofIndex + 1}` : "R",
    color: roofIndex >= 0 ? "#e3adff" : "#72edf2",
    title:
      roofIndex > 0
        ? ROOFTOP_QUESTS[roofIndex].roof.name
        : roofIndex === 0
          ? "ROOFTOP SKYBOX"
          : IS_KUTAISI
            ? "RIONI GAP"
            : "MTKVARI GAP",
    reward: STUNT_REWARDS[r.quest]?.platinum
      ? "PLATINUM BOX + CREDITS"
      : "PARTS BOX + CREDITS",
  };
});
export const mapPoint = (point, size = 900) => ({
  x: ((MAP_EXTENT - point.x) / (MAP_EXTENT * 2)) * size,
  y: ((MAP_EXTENT - point.z) / (MAP_EXTENT * 2)) * size,
});
export function artifactSearchZones(profile, sim) {
  return activeArtifactHints(profile, ACTIVE_MAP, sim?.runArtifacts).flatMap(
    (id) => {
      // Use the same collectible anchors as the world and collision system. Facade
      // advertising has unrelated IDs and must never determine a search area.
      const site = SPONSOR_SITES.find((site) => site.id === id);
      if (!site) return [];
      const anchor = (sim?.poles || sim?.propDefinitions || []).find(
        (prop) => prop.bannerAnchor && prop.bannerId === id,
      );
      const artifact = {
        ...site,
        x: anchor?.x ?? site.x,
        z: anchor?.z ?? site.z,
      };
      // The artifact sits inside the area, away from its center, so the reveal is
      // useful without becoming an exact waypoint.
      const angle = ((id * 137 + ACTIVE_MAP.length * 53) * Math.PI) / 180,
        offset = ARTIFACT_SEARCH_RADIUS * 0.48;
      return [
        {
          artifact,
          x: artifact.x + Math.cos(angle) * offset,
          z: artifact.z + Math.sin(angle) * offset,
          radius: ARTIFACT_SEARCH_RADIUS,
        },
      ];
    },
  );
}

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
    this.viewport.onchange = () => this.layoutPowerups();
    document.getElementById("map-sponsors").onchange = () => this.brandPins();
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
  pin(point, name, description) {
    this.select("");
    setWaypoint(this.sim, point, name);
    const detail = document.getElementById("map-place-details");
    if (detail)
      detail.textContent =
        description ||
        MAP_PLACES.find((p) => p.name === name)?.description ||
        "";
    this.draw();
  }
  route(value) {
    this.select(value);
    this.dialog.close();
  }
  brandPins() {
    const pins = document.getElementById("quest-pins");
    pins.querySelectorAll(".brand-pin").forEach((pin) => pin.remove());
    const banners = document.getElementById("map-sponsors").checked
      ? FACADE_BANNERS.map((p) => ({
          ...p,
          symbol: p.brand === "robotics" ? "GRA" : "TC",
          color: p.brand === "robotics" ? "#f2394b" : "#69c6d5",
          name:
            p.brand === "robotics"
              ? "GRA · ROBO BATTLE 2026"
              : "TECHCRUSH · SUBSCRIBE",
          banner: true,
        }))
      : [];
    for (const site of [...banners, ...availablePowerups(this.sim)]) {
      const point = mapPoint(site, 100),
        pin = document.createElement("button");
      pin.className =
        "quest-pin brand-pin " +
        (["GRA", "TC"].includes(site.symbol) ? "banner-pin" : "powerup-pin");
      pin.style.cssText = `left:${point.x}%;top:${point.y}%;--quest:${site.color}`;
      if (site.kind) pin.innerHTML = powerupIconSVG(site.kind);
      else pin.textContent = site.symbol;
      pin.title =
        site.name + (site.description ? " · " + site.description : "");
      pin.setAttribute("aria-label", `Set waypoint to ${site.name}`);
      pin.onclick = () => this.pin(site, site.name, site.description);
      pins.append(pin);
    }
    this.layoutPowerups();
  }
  layoutPowerups() {
    const rect = this.viewport.surface.getBoundingClientRect();
    if (!rect.width) return;
    const buttons = [...this.dialog.querySelectorAll(".powerup-pin")];
    const pins = buttons.map((button) => ({
      button,
      x: (parseFloat(button.style.left) * rect.width) / 100,
      y: (parseFloat(button.style.top) * rect.height) / 100,
    }));
    for (const p of separatePowerupPins(pins)) {
      const dx = p.x - p.anchorX,
        dy = p.y - p.anchorY;
      p.button.style.setProperty("--pin-dx", dx + "px");
      p.button.style.setProperty("--pin-dy", dy + "px");
      p.button.style.setProperty("--tether-length", Math.hypot(dx, dy) + "px");
      p.button.style.setProperty(
        "--tether-angle",
        Math.atan2(-dy, -dx) + "rad",
      );
    }
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
    if (!document.getElementById("map-place-details")) {
      const detail = document.createElement("p");
      detail.id = "map-place-details";
      detail.setAttribute("aria-live", "polite");
      places.after(detail);
    }
    places.innerHTML = MAP_PLACES.map(
      (place, i) =>
        `<button title="${place.description}" data-map-place="${i}">${place.symbol} · ${place.name}</button>`,
    ).join("");
    for (const [i, place] of MAP_PLACES.entries()) {
      const point = mapPoint(place, 100),
        button = document.createElement("button");
      button.className = "quest-pin place-pin";
      button.style.cssText = `left:${point.x}%;top:${point.y}%;--quest:#afc6d9`;
      button.textContent = place.symbol;
      button.dataset.mapPlace = i;
      button.title = place.name + " · " + place.description;
      button.setAttribute("aria-label", `Set waypoint to ${place.name}`);
      pins.append(button);
    }
    for (const button of this.dialog.querySelectorAll("[data-map-place]"))
      button.onclick = () => {
        const place = MAP_PLACES[Number(button.dataset.mapPlace)];
        this.pin(place, place.name);
      };
    for (const item of this.dialog.querySelectorAll("[data-powerup]")) {
      if (!item.querySelector("svg"))
        item.insertAdjacentHTML(
          "afterbegin",
          powerupIconSVG(item.dataset.powerup),
        );
    }
    this.brandPins();
    this.draw();
    this.dialog.showModal();
    this.viewport.open(mapPoint(sim.player, 1));
  }
  draw() {
    const sim = this.sim;
    const c = document.getElementById("quest-canvas").getContext("2d");
    c.drawImage(mapAtlas(), 0, 0, 900, 900);
    for (const search of artifactSearchZones(this.profile(), sim)) {
      const center = mapPoint(search),
        radius = (search.radius / (MAP_EXTENT * 2)) * 900;
      c.save();
      c.fillStyle = "rgba(255, 212, 59, 0.17)";
      c.strokeStyle = "#ffd43b";
      c.lineWidth = 5;
      c.setLineDash([12, 8]);
      c.shadowColor = "rgba(255, 212, 59, 0.7)";
      c.shadowBlur = 12;
      c.beginPath();
      c.arc(center.x, center.y, radius, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.setLineDash([]);
      c.shadowBlur = 0;
      c.fillStyle = "#ffe98a";
      c.font = "900 16px Arial";
      c.fillText("ARTIFACT SEARCH AREA", center.x + radius + 8, center.y + 5);
      c.restore();
    }
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
    for (const [i, q] of ROOFTOP_QUESTS.entries())
      dot(q.box, "#e3adff", 5, `ROOF ${i + 1}`);
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
