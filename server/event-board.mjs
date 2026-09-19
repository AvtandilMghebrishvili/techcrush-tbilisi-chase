import {
  EVENT_ID,
  EVENT_START,
  EVENT_END,
  HUNT_CITIES,
  eventPhase,
} from "../dist/event-rules.js";
export async function eventBoard(DB, url, hash, now, preview = false) {
  const requested = url.searchParams.get("map") || "tbilisi";
  const map = requested === "challenge" ? "rustavi" : requested;
  if (![...HUNT_CITIES, "rustavi"].includes(map))
    throw Error("Unknown event ranking.");
  // Public reveal is earned by the first completed hunt, never by owner preview access.
  const discovery = await DB.prepare(
    "SELECT MIN(unlocked_at) at FROM event_entries WHERE event_id=? AND unlocked_at IS NOT NULL",
  )
    .bind(EVENT_ID)
    .first();
  const challengeRevealed = discovery.at !== null;
  const base = `FROM event_scores s JOIN event_entries e ON e.event_id=s.event_id AND e.key_hash=s.key_hash WHERE s.event_id=? AND s.map=?`;
  const { results } = await DB.prepare(
    `SELECT e.handle,s.score,s.level,s.runs,s.rank_at,s.key_hash ${base} ORDER BY s.score DESC,s.rank_at ASC,e.handle_key ASC LIMIT 100`,
  )
    .bind(EVENT_ID, map)
    .all();
  const total = await DB.prepare(
    "SELECT COUNT(*) n FROM event_scores WHERE event_id=? AND map=?",
  )
    .bind(EVENT_ID, map)
    .first();
  const participants = await DB.prepare(
    "SELECT COUNT(*) n FROM event_entries WHERE event_id=?",
  )
    .bind(EVENT_ID)
    .first();
  const mine = await DB.prepare(
    `SELECT e.handle,e.handle_key,s.score,s.level,s.runs,s.rank_at ${base} AND s.key_hash=?`,
  )
    .bind(EVENT_ID, map, hash)
    .first();
  let rank = null;
  if (mine) {
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
          name: mine.handle,
          score: mine.score,
          level: mine.level,
          runs: mine.runs,
          rank,
        }
      : null,
  };
}
