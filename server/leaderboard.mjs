import { weekKey, driverTitle, ACHIEVEMENTS } from "../dist/community-rules.js";
const SORTS = {
  progress:
    "rank_level DESC,rank_checkpoints DESC,best_score DESC,rank_at ASC,public_id ASC",
  score:
    "best_score DESC,rank_level DESC,rank_checkpoints DESC,rank_at ASC,public_id ASC",
  weekly:
    "week_score DESC,week_wins DESC,rank_level DESC,rank_at ASC,public_id ASC",
};
const fields =
  "public_id,display_name,avatar,rank_level,rank_checkpoints,best_score,total_score,wins,badges,week_score,week_wins";
function publicRow(row, rank) {
  if (!row) return null;
  let badges = [];
  try {
    badges = JSON.parse(row.badges).filter((id) =>
      ACHIEVEMENTS.some((a) => a.id === id),
    );
  } catch {}
  return {
    id: row.public_id,
    name: row.display_name,
    avatar: row.avatar,
    rank: Number(rank),
    level: row.rank_level,
    checkpoints: row.rank_checkpoints,
    bestScore: row.best_score,
    totalScore: row.total_score,
    wins: row.wins,
    badges,
    weekScore: row.week_score,
    weekWins: row.week_wins,
    title: driverTitle({ furthestLevel: row.rank_level, wins: row.wins }),
  };
}
export async function readLeaderboard(DB, url, hash, now = Date.now()) {
  const mode = url.searchParams.get("mode") || "progress";
  if (!Object.hasOwn(SORTS, mode))
    throw Error("Choose Progress, High score or This week.");
  const page = Number(url.searchParams.get("page") || 0);
  if (!Number.isInteger(page) || page < 0 || page > 1000)
    throw Error("Invalid leaderboard page.");
  const week = weekKey(now),
    values = mode === "weekly" ? [week] : [];
  const where =
    "listed=1 AND ranked_runs>0" +
    (mode === "weekly" ? " AND week_key=? AND week_score>0" : "");
  const count = await DB.prepare(
    `SELECT COUNT(*) AS total FROM garages WHERE ${where}`,
  )
    .bind(...values)
    .first();
  const total = Number(count.total),
    offset = Math.min(page * 25, Math.max(0, Math.ceil(total / 25) - 1) * 25);
  const data = await DB.prepare(
    `SELECT ${fields} FROM garages WHERE ${where} ORDER BY ${SORTS[mode]} LIMIT 25 OFFSET ?`,
  )
    .bind(...values, offset)
    .all();
  let me = null;
  if (hash) {
    const mine = await DB.prepare(
      `SELECT * FROM (SELECT key_hash,${fields},ROW_NUMBER() OVER (ORDER BY ${SORTS[mode]}) AS position FROM garages WHERE ${where}) WHERE key_hash=?`,
    )
      .bind(...values, hash)
      .first();
    me = publicRow(mine, mine?.position);
  }
  return {
    mode,
    total,
    page: Math.floor(offset / 25),
    pageSize: 25,
    entries: data.results.map((row, i) => publicRow(row, offset + i + 1)),
    me,
    week,
    resetsAt: new Date(
      Date.parse(week + "T00:00:00Z") + 7 * 86400000,
    ).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
}
