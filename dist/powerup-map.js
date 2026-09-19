import { ROBOTICS_GEARS, GREX_MONUMENTS } from "./city-brand-sites.js";
import { activeRepairCount } from "./brand-rules.js";
import {
  GEAR_OUTLINE,
  GEAR_HOLE,
  ROBOTICS_COLOR,
} from "./robotics-logo-data.js";
import { GREX_OUTLINE, GREX_EYE, GREX_COLOR } from "./grex-logo-data.js";

const path = (points) =>
  points.map(([x, y], i) => `${i ? "L" : "M"}${x},${-y}`).join(" ") + " Z";
const hole = GEAR_HOLE;
const paths = {
  gear:
    path(GEAR_OUTLINE) +
    ` M ${hole},0 A ${hole},${hole} 0 1 0 ${-hole},0 A ${hole},${hole} 0 1 0 ${hole},0 Z`,
  grex: path(GREX_OUTLINE) + " " + path(GREX_EYE),
};
const sites = [
  ...ROBOTICS_GEARS.map((p) => ({
    ...p,
    kind: "gear",
    color: ROBOTICS_COLOR,
    name: "GRA FULL REPAIR",
    description:
      "Gift from Georgian Robotics Association · restores HP to 100% · once per run.",
  })),
  ...GREX_MONUMENTS.map((p) => ({
    ...p,
    kind: "grex",
    color: GREX_COLOR,
    name: "GREX DINO PULSE",
    description:
      "Destroys every patrol and helicopter · costs 50 HP · pursuit returns in 8 seconds. This is not a repair.",
  })),
];
export function availablePowerups(sim) {
  return sites.filter((p) =>
    p.kind === "gear"
      ? p.id < activeRepairCount(sim.level) &&
        !sim.gearRepairs?.some((q) => q.id === p.id)
      : !sim.grexTriggers?.some((q) => q.id === p.id),
  );
}
export function powerupIconSVG(kind) {
  return `<svg viewBox="-1.15 -1.15 2.3 2.3" aria-hidden="true"><path d="${paths[kind]}" fill="currentColor" fill-rule="evenodd"/></svg>`;
}
// Two tiny reusable paths; no texture, image download, timer or render context.
const canvasPaths = {};
export function drawPowerupIcon(c, site, x, y, rotation = 0) {
  canvasPaths[site.kind] ||= new Path2D(paths[site.kind]);
  c.save();
  c.translate(x, y);
  c.rotate(rotation);
  c.fillStyle = "#0d1924";
  c.strokeStyle = site.color;
  c.lineWidth = 1.3;
  c.beginPath();
  c.arc(0, 0, 9, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.scale(6.8, 6.8);
  c.fillStyle = site.color;
  c.fill(canvasPaths[site.kind], "evenodd");
  c.restore();
}

// At most six icons. Move only overlapping badges and keep their true anchors.
export function separatePowerupPins(pins, gap = 34, radius = Infinity) {
  const placed = [];
  for (const pin of pins) {
    let x = pin.x,
      y = pin.y;
    const clear = (a, b) =>
      Math.hypot(a, b) <= radius &&
      placed.every((p) => Math.hypot(p.x - a, p.y - b) >= gap);
    if (!clear(x, y))
      outer: for (let ring = 1; ring <= 6; ring++) {
        for (let step = 0; step < 12; step++) {
          const angle = (step * Math.PI) / 6,
            a = pin.x + Math.cos(angle) * gap * ring,
            b = pin.y + Math.sin(angle) * gap * ring;
          if (clear(a, b)) {
            x = a;
            y = b;
            break outer;
          }
        }
      }
    placed.push({ ...pin, x, y, anchorX: pin.x, anchorY: pin.y });
  }
  return placed;
}
