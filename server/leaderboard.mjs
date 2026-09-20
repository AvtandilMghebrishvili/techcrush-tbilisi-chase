import { weekKey, driverTitle, ACHIEVEMENTS } from "../dist/community-rules.js";
import { TIME_COURSE, TIME_COURSES } from "../dist/race-timing.js";
import { CAR_IDS } from "../dist/progression.js";
import { MAP_COURSES } from "../dist/map-selection.js";
import { PRIVATE_DRIVER_NAME } from "../dist/private-driver.js";
const SORTS = {
  progress:
    "rank_level DESC,rank_checkpoints DESC,best_score DESC,rank_at ASC,public_id ASC",
  score:
    "best_score DESC,rank_level DESC,rank_checkpoints DESC,rank_at ASC,public_id ASC",
  weekly:
    "week_score DESC,week_wins DESC,rank_level DESC,rank_at ASC,public_id ASC",
};
const fields =
  "public_id,display_name,avatar,private_mode,rank_level,rank_checkpoints,best_score,total_score,wins,badges,week_score,week_wins";
async function playerStats(DB) {
  // Covering index: never parse every garage profile on a leaderboard refresh.
  const row = await DB.prepare(
    "SELECT COUNT(*) AS total FROM garages WHERE has_played=1 AND private_mode=0",
  )
    .bind()
    .first();
  return { uniquePlayers: Number(row.total) };
}
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
    name: row.private_mode === 1 ? PRIVATE_DRIVER_NAME : row.display_name,
    avatar: row.avatar,
    rank: rank == null ? null : Number(rank),
    level: row.rank_level,
    checkpoints: row.rank_checkpoints,
    bestScore: row.best_score,
    totalScore: row.total_score,
    wins: row.wins,
    badges,
    weekScore: row.week_score,
    weekWins: row.week_wins,
    title: driverTitle({ furthestLevel: row.rank_level, wins: row.wins }),
    private: row.private_mode === 1,
  };
}
export async function readLeaderboard(DB, url, hash, now = Date.now()) {
  const map = url.searchParams.get("map") || "tbilisi";
  if (!Object.hasOwn(MAP_COURSES, map)) throw Error("Invalid leaderboard map.");
  const mode = url.searchParams.get("mode") || "progress";
  if (mode === "times") return readLevelTimes(DB, url, hash, now);
  if (!Object.hasOwn(SORTS, mode))
    throw Error("Choose Progress, High score or This week.");
  const page = Number(url.searchParams.get("page") || 0);
  if (!Number.isInteger(page) || page < 0 || page > 1000)
    throw Error("Invalid leaderboard page.");
  const week = weekKey(now),
    values = mode === "weekly" ? [week] : [];
  const table =
    map === "tbilisi"
      ? "garages"
      : `(SELECT g.key_hash,g.public_id,g.display_name,g.avatar,g.listed,g.private_mode,c.ranked_runs,c.rank_level,c.rank_checkpoints,c.best_score,c.total_score,c.wins,c.badges,c.week_key,c.week_score,c.week_wins,c.rank_at FROM garages g JOIN city_rankings c ON c.key_hash=g.key_hash WHERE c.map='${map}')`;
  const where =
    "listed=1 AND private_mode=0 AND ranked_runs>0" +
    (mode === "weekly" ? " AND week_key=? AND week_score>0" : "");
  const count = await DB.prepare(
    `SELECT COUNT(*) AS total FROM ${table} WHERE ${where}`,
  )
    .bind(...values)
    .first();
  const total = Number(count.total),
    offset = Math.min(page * 25, Math.max(0, Math.ceil(total / 25) - 1) * 25);
  const data = await DB.prepare(
    `SELECT ${fields} FROM ${table} WHERE ${where} ORDER BY ${SORTS[mode]} LIMIT 25 OFFSET ?`,
  )
    .bind(...values, offset)
    .all();
  let me = null;
  if (hash) {
    const mine = await DB.prepare(
      `SELECT * FROM (SELECT key_hash,${fields},ROW_NUMBER() OVER (ORDER BY ${SORTS[mode]}) AS position FROM ${table} WHERE ${where}) WHERE key_hash=?`,
    )
      .bind(...values, hash)
      .first();
    me = publicRow(mine, mine?.position);
    if (!me) {
      const privateMine = await DB.prepare(
        `SELECT ${fields} FROM ${table} WHERE key_hash=? AND private_mode=1`,
      )
        .bind(hash)
        .first();
      me = publicRow(privateMine, null);
    }
  }
  return {
    map,
    mode,
    total,
    stats: await playerStats(DB),
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
async function readLevelTimes(DB, url, hash, now) {
  const map = url.searchParams.get("map") || "tbilisi";
  const course = url.searchParams.get("course") || MAP_COURSES[map];
  const level = Number(url.searchParams.get("level") || 1),
    page = Number(url.searchParams.get("page") || 0),
    car = url.searchParams.get("car") || "all",
    build = url.searchParams.get("build") || "all";
  if (
    !TIME_COURSES.includes(course) ||
    !course.startsWith(map + "-") ||
    !Number.isSafeInteger(level) ||
    level < 1 ||
    level > 1000000 ||
    !Number.isInteger(page) ||
    page < 0 ||
    page > 1000 ||
    !["all", ...CAR_IDS].includes(car) ||
    !["all", "stock"].includes(build)
  )
    throw Error("Invalid leaderboard time filter.");
  const where =
    "g.listed=1 AND g.private_mode=0 AND r.course=? AND r.level=?" +
    (car !== "all" ? " AND r.car=?" : "") +
    (build === "stock" ? " AND r.build_class='stock'" : "");
  const values = [course, level, ...(car === "all" ? [] : [car])];
  // One fastest result per driver even in the all-car/all-build view. Numeric
  // ties share a sporting rank; recorded_at/public_id only stabilize display.
  const cte = `WITH attempts AS (SELECT r.*,g.public_id,g.display_name,g.avatar,
    ROW_NUMBER() OVER (PARTITION BY r.key_hash ORDER BY r.duration_ms,r.recorded_at,r.car,r.build_class) AS best
    FROM level_records r JOIN garages g ON g.key_hash=r.key_hash WHERE ${where}),
    ranked AS (SELECT *,RANK() OVER (ORDER BY duration_ms) AS position FROM attempts WHERE best=1)`;
  const total = Number(
    (
      await DB.prepare(`${cte} SELECT COUNT(*) AS total FROM ranked`)
        .bind(...values)
        .first()
    ).total,
  );
  const offset = Math.min(
    page * 25,
    Math.max(0, Math.ceil(total / 25) - 1) * 25,
  );
  const rows = await DB.prepare(
    `${cte} SELECT * FROM ranked ORDER BY duration_ms,recorded_at,public_id LIMIT 25 OFFSET ?`,
  )
    .bind(...values, offset)
    .all();
  const mine = hash
    ? await DB.prepare(`${cte} SELECT * FROM ranked WHERE key_hash=?`)
        .bind(...values, hash)
        .first()
    : null;
  const privateMine =
    !mine && hash
      ? await DB.prepare(
          `SELECT r.*,g.public_id,g.display_name,g.avatar,g.private_mode,1 AS best,NULL AS position FROM level_records r JOIN garages g ON g.key_hash=r.key_hash WHERE r.key_hash=? AND r.course=? AND r.level=? AND g.private_mode=1${car !== "all" ? " AND r.car=?" : ""}${build === "stock" ? " AND r.build_class='stock'" : ""} ORDER BY r.duration_ms LIMIT 1`,
        )
          .bind(hash, course, level, ...(car === "all" ? [] : [car]))
          .first()
      : null;
  const publicTime = (r) =>
    r
      ? {
          id: r.public_id,
          name: r.private_mode === 1 ? PRIVATE_DRIVER_NAME : r.display_name,
          avatar: r.avatar,
          rank: Number(r.position),
          level: r.level,
          durationMs: r.duration_ms,
          car: r.car,
          buildPoints: r.build_points,
          rewinds: r.rewinds,
          recordedAt: new Date(r.recorded_at).toISOString(),
          private: r.private_mode === 1,
        }
      : null;
  return {
    map,
    mode: "times",
    total,
    stats: await playerStats(DB),
    page: Math.floor(offset / 25),
    pageSize: 25,
    level,
    car,
    build,
    course,
    courseLabel: map.toUpperCase() + " · COURSE " + course.split("-")[1],
    entries: rows.results.map(publicTime),
    me: publicTime(mine || privateMine),
    updatedAt: new Date(now).toISOString(),
  };
}
