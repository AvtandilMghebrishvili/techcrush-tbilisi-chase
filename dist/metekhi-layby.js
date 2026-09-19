import { ACTIVE_MAP } from "./map-selection.js";
import { TBILISI_EVENT_SITES } from "./tbilisi-event-sites.js";

// A small guarded bridge lay-by preserves the released banner's exact location.
// Rendering, water support and rail openings all use this same footprint.
const site = TBILISI_EVENT_SITES.find((p) => p.id === 3);
export const METEKHI_LAYBY =
  ACTIVE_MAP === "tbilisi"
    ? {
        x: site.x + Math.sin(site.angle),
        z: site.z + Math.cos(site.angle),
        angle: site.angle,
        w: 18,
        d: 12,
      }
    : null;

export function laybyPoint(x, z) {
  const b = METEKHI_LAYBY;
  return {
    x: b.x + Math.cos(b.angle) * x + Math.sin(b.angle) * z,
    z: b.z - Math.sin(b.angle) * x + Math.cos(b.angle) * z,
  };
}

export function onMetekhiLayby(p, inset = 0) {
  const b = METEKHI_LAYBY;
  if (!b || Math.abs(p.x - b.x) > 16 || Math.abs(p.z - b.z) > 16) return false;
  const dx = p.x - b.x,
    dz = p.z - b.z;
  return (
    Math.abs(dx * Math.cos(b.angle) - dz * Math.sin(b.angle)) <=
      b.w / 2 - inset &&
    Math.abs(dx * Math.sin(b.angle) + dz * Math.cos(b.angle)) <= b.d / 2 - inset
  );
}

export const LAYBY_RAILS = METEKHI_LAYBY
  ? [
      { ...laybyPoint(0, -5.8), angle: site.angle + Math.PI / 2, d: 17.6 },
      ...[-1, 1].map((side) => ({
        ...laybyPoint(side * 8.8, -2.2),
        angle: site.angle,
        d: 7.2,
      })),
    ].map((r) => ({
      ...r,
      w: 0.34,
      h: 1.5,
      barrier: true,
      bridgeRail: true,
      name: "METEKHI BRIDGE LAY-BY",
      deckX: METEKHI_LAYBY.x,
      deckZ: METEKHI_LAYBY.z,
      deckLength: 24,
      entrance: false,
    }))
  : [];
