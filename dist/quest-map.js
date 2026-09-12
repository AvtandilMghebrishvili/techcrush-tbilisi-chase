import { MapViewport } from "./map-viewport.js";
import { LIMIT } from "./config.js";
import { ROADS } from "./city-map.js";
import { RIVER_POLYGON } from "./district-data.js";
import { SPECIAL_RAMPS, QUEST_BOX } from "./world-sites.js";
import { RAMPS } from "./stunts.js";
import { CITY_NAME, IS_KUTAISI, IS_BATUMI } from "./map-selection.js";
import { navigationTarget, playerRoute } from "./navigation-cache.js";

export const MAP_EXTENT = LIMIT + 80;
export const QUEST_PINS = SPECIAL_RAMPS.map((r, i) => ({
  ...r,
  route: i ? "river" : "skybox",
  symbol: i ? "R" : "S",
  color: i ? "#72edf2" : "#e3adff",
  title: i ? (IS_KUTAISI ? "RIONI GAP" : "MTKVARI GAP") : "ROOFTOP SKYBOX",
  reward: IS_KUTAISI || IS_BATUMI ? "PLATINUM BOX" : "PARTS BOX + CREDITS",
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
    document.getElementById("quest-return").onclick = () => this.route("");
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
    const c = document.getElementById("quest-canvas").getContext("2d");
    c.drawImage(mapAtlas(), 0, 0, 900, 900);
    c.strokeStyle = "#e8ff76";
    c.lineWidth = 3;
    c.beginPath();
    const player = mapPoint(sim.player);
    c.moveTo(player.x, player.y);
    for (const p of playerRoute(sim)) {
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
    const target = navigationTarget(sim);
    if (target) dot(target, "#e8ff76", 7, "");
    dot(sim.player, "#ff335c", 8, "YOU");
    this.dialog.showModal();
    this.viewport.open(mapPoint(sim.player, 1));
  }
}
