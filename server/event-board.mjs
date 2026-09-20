import {
  EVENT_ID,
  EVENT_START,
  EVENT_END,
  HUNT_CITIES,
  eventPhase,
} from "../dist/event-rules.js";
import { PRIVATE_DRIVER_NAME } from "../dist/private-driver.js";
export async function eventBoard(DB, url, hash, now, preview = false) {
  const requested = url.searchParams.get("map") || "tbilisi";
  const map = requested === "challenge" ? "rustavi" : requested;
  if (![...HUNT_CITIES, "rustavi"].includes(map))
    throw Error("Unknown event ranking.");
  // Public reveal is earned by the first completed hunt, never by owner preview access.
  const discovery = await DB.prepare(
    "SELECT MIN(e.unlocked_at) at FROM event_entries e JOIN garages g ON g.key_hash=e.key_hash WHERE e.event_id=? AND e.unlocked_at IS NOT NULL AND g.private_mode=0",
  )
    .bind(EVENT_ID)
    .first();
  const challengeRevealed = discovery.at !== null;
  const base = `FROM event_scores s JOIN event_entries e ON e.event_id=s.event_id AND e.key_hash=s.key_hash JOIN garages g ON g.key_hash=s.key_hash WHERE s.event_id=? AND s.map=? AND g.private_mode=0`;
  const ownBase = `FROM event_scores s JOIN event_entries e ON e.event_id=s.event_id AND e.key_hash=s.key_hash JOIN garages g ON g.key_hash=s.key_hash WHERE s.event_id=? AND s.map=?`;
  const { results } = await DB.prepare(
    `SELECT e.handle,s.score,s.level,s.runs,s.rank_at,s.key_hash ${base} ORDER BY s.score DESC,s.rank_at ASC,e.handle_key ASC LIMIT 100`,
  )
    .bind(EVENT_ID, map)
    .all();
  const total = await DB.prepare(`SELECT COUNT(*) n ${base}`)
    .bind(EVENT_ID, map)
    .first();
  const participants = await DB.prepare(
    "SELECT COUNT(*) n FROM event_entries e JOIN garages g ON g.key_hash=e.key_hash WHERE e.event_id=? AND g.private_mode=0",
  )
    .bind(EVENT_ID)
    .first();
  const eventStats = await DB.prepare(
    "SELECT COUNT(DISTINCT r.key_hash) players,COUNT(*) runs,COALESCE(SUM(CASE WHEN r.result='won' THEN 1 ELSE 0 END),0) clears FROM event_runs r JOIN garages g ON g.key_hash=r.key_hash WHERE r.event_id=? AND g.private_mode=0",
  )
    .bind(EVENT_ID)
    .first();
  const cityStats = await DB.prepare(
    "SELECT COUNT(*) runs,COALESCE(SUM(CASE WHEN r.result='won' THEN 1 ELSE 0 END),0) clears FROM event_runs r JOIN garages g ON g.key_hash=r.key_hash WHERE r.event_id=? AND r.map=? AND g.private_mode=0",
  )
    .bind(EVENT_ID, map)
    .first();
  const mine = await DB.prepare(
    `SELECT e.handle,e.handle_key,s.score,s.level,s.runs,s.rank_at,g.private_mode ${ownBase} AND s.key_hash=?`,
  )
    .bind(EVENT_ID, map, hash)
    .first();
  let rank = null;
  if (mine && !mine.private_mode) {
    const ahead = await DB.prepare(
      `SELECT COUNT(*) n ${base} AND (s.score>? OR (s.score=? AND (s.rank_at<? OR (s.rank_at=? AND e.handle_key<?))))`,
    )
      .bind(
        EVENT_ID,
        map,
        mine.score,
        mine.score,
        mine.rank_at,
        mine.rank_at,
        mine.handle_key,
      )
      .first();
    rank = ahead.n + 1;
  }
  return {
    event: EVENT_ID,
    map: map === "rustavi" && !challengeRevealed ? "challenge" : map,
    challengeRevealed,
    phase: eventPhase(now),
    serverTime: now,
    startsAt: EVENT_START,
    endsAt: EVENT_END,
    total: total.n,
    participants: participants.n,
    stats: {
      registered: Number(participants.n),
      uniquePlayers: Number(eventStats.players),
      totalRuns: Number(eventStats.runs),
      levelsCleared: Number(eventStats.clears),
      cityRuns: Number(cityStats.runs),
      cityLevelsCleared: Number(cityStats.clears),
    },
    entries: results.map((r, i) => ({
      rank: i + 1,
      name: r.handle,
      score: r.score,
      level: r.level,
      runs: r.runs,
      you: r.key_hash === hash,
    })),
    mine: mine
      ? {
          name: mine.private_mode === 1 ? PRIVATE_DRIVER_NAME : mine.handle,
          score: mine.score,
          level: mine.level,
          runs: mine.runs,
          rank,
          private: mine.private_mode === 1,
        }
      : null,
  };
}
