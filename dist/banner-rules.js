// Shared reward limits: optional counters keep pre-2.1 clients compatible.
export const BANNER_COUNT = 48;
export const CASH_BANNER_COUNT = 3;
export const CASH_BANNER_REWARD = 4000;
export const DECOR_REWARD = 25;
export const DECOR_REWARD_LIMIT = 100;
export function cashBannerIds(seed = "") {
  let state = 2166136261;
  for (const ch of String(seed))
    state = Math.imul(state ^ ch.charCodeAt(0), 16777619) >>> 0;
  const ids = Array.from({ length: BANNER_COUNT }, (_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, CASH_BANNER_COUNT);
}
export const patrolCollisionDamage = (impact, kind) =>
  Math.min(
    kind === "tank" ? 15 : 10,
    Math.max(0, impact) * (kind === "tank" ? 0.7 : 0.5),
  );
export function breakReward(sim, prop) {
  if (prop.bannerId != null && sim.cashBannerIds.includes(prop.bannerId)) {
    if (sim.cashBanners.includes(prop.bannerId)) return 0;
    sim.cashBanners.push(prop.bannerId);
    sim.runCash += CASH_BANNER_REWARD;
    sim.scoreFeedback("banner", 0, CASH_BANNER_REWARD);
    sim.events.push(`TECHCRUSH +4,000 COINS · ${sim.cashBanners.length}/3`);
    return CASH_BANNER_REWARD;
  }
  if (sim.decorWrecks >= DECOR_REWARD_LIMIT) return 0;
  sim.decorWrecks++;
  sim.runCash += DECOR_REWARD;
  sim.scoreFeedback("decor", 0, DECOR_REWARD);
  return DECOR_REWARD;
}
