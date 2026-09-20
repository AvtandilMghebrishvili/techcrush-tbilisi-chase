import { EVENT_ID, eventProgress } from "../dist/event-rules.js";
import { eventBoard } from "./event-board.mjs";
import { readLeaderboard } from "./leaderboard.mjs";
import { cityCommunity } from "../dist/map-selection.js";
import {
  newProfile,
  migrateProfile,
  applyProgressAction,
} from "../dist/progression.js";
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
export async function keyHash(token) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
async function readBody(request) {
  if (Number(request.headers.get("content-length") || 0) > 8192)
    throw Error("Request too large.");
  const reader = request.body?.getReader();
  if (!reader) throw Error("Missing action.");
  let size = 0,
    text = "";
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) {
      await reader.cancel();
      throw Error("Request too large.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
}
export async function handleApi(request, DB, options = {}) {
  const now = options.now ? options.now() : Date.now();
  if (!DB)
    return json(
      { error: "Garage saving is temporarily unavailable. Please try again." },
      503,
    );
  const url = new URL(request.url);
  if (url.pathname === "/api/leaderboard") {
    if (request.method !== "GET")
      return json({ error: "Method not allowed" }, 405);
    const optionalToken = request.headers
      .get("authorization")
      ?.replace(/^Bearer /, "");
    try {
      const hash = /^[a-f0-9]{64}$/.test(optionalToken || "")
        ? await keyHash(optionalToken)
        : null;
      return json(await readLeaderboard(DB, url, hash));
    } catch (error) {
      const invalid = /Choose Progress|Invalid leaderboard/.test(error.message);
      return json(
        {
          error: invalid
            ? error.message
            : "Leaderboard is temporarily unavailable. Try Refresh.",
        },
        invalid ? 400 : 503,
      );
    }
  }
  if (
    !["/api/profile", "/api/action", "/api/event/leaderboard"].includes(
      url.pathname,
    )
  )
    return json({ error: "Not found" }, 404);
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    return json({ error: "Missing or invalid garage key." }, 401);
  const hash = await keyHash(token);
  try {
    if (url.pathname === "/api/event/leaderboard") {
      if (request.method !== "GET")
        return json({ error: "Method not allowed" }, 405);
      try {
        return json(
          await eventBoard(DB, url, hash, now, options.preview === true),
        );
      } catch (error) {
        return json({ error: error.message }, 400);
      }
    }
    if (url.pathname === "/api/profile" && request.method === "POST") {
      await DB.prepare(
        "INSERT INTO garages (key_hash,profile,version,updated_at) VALUES (?,?,0,?) ON CONFLICT(key_hash) DO NOTHING",
      )
        .bind(hash, JSON.stringify(newProfile()), Date.now())
        .run();
    } else if (
      !(url.pathname === "/api/profile" && request.method === "GET") &&
      !(url.pathname === "/api/action" && request.method === "POST")
    )
      return json({ error: "Method not allowed" }, 405);
    const row = await DB.prepare(
      "SELECT profile,version,public_id FROM garages WHERE key_hash = ?",
    )
      .bind(hash)
      .first();
    if (!row)
      return json(
        {
          error:
            "This garage was not found. Keep your existing key and try again.",
        },
        404,
      );
    const publicId = row.public_id || crypto.randomUUID();
    let profile = migrateProfile(JSON.parse(row.profile)),
      version = row.version;
    if (url.pathname === "/api/action") {
      let body;
      try {
        body = await readBody(request);
      } catch {
        return json({ error: "Invalid garage action." }, 400);
      }
      if (
        typeof body.id !== "string" ||
        body.id.length < 8 ||
        body.id.length > 100 ||
        !body.action ||
        typeof body.action !== "object"
      )
        return json({ error: "Invalid garage action." }, 400);
      if (!(profile.operations || []).includes(body.id)) {
        if (body.version !== version)
          return json(
            {
              error:
                "Your garage changed in another tab. It has been refreshed; try again.",
              profile,
              version,
            },
            409,
          );
        try {
          profile = applyProgressAction(
            profile,
            { ...body.action, id: body.id },
            random,
            {
              now,
              runId: crypto.randomUUID(),
              preview: options.preview === true,
              exclusiveEvent:
                options.preview !== true && options.eventExclusive !== false,
            },
          );
        } catch (error) {
          return json({ error: error.message }, 400);
        }
        if (body.action.type === "settle" && body.action.metrics)
          cityCommunity(profile, profile.lastRunMap || "tbilisi").rankAt =
            Date.now();
        profile.operations = [...(profile.operations || []), body.id].slice(
          -128,
        );
        const update = DB.prepare(
          "UPDATE garages SET profile=?,version=version+1,updated_at=?,public_id=?,display_name=?,avatar=?,listed=?,ranked_runs=?,rank_level=?,rank_checkpoints=?,best_score=?,total_score=?,wins=?,badges=?,week_key=?,week_score=?,week_wins=?,rank_at=?,has_played=MAX(has_played,?) WHERE key_hash=? AND version=?",
        ).bind(
          JSON.stringify(profile),
          Date.now(),
          publicId,
          profile.driver.name,
          profile.driver.avatar,
          Number(profile.driver.listed && !!profile.driver.name),
          profile.community.runs,
          profile.community.furthestLevel,
          profile.community.checkpoints,
          profile.community.bestScore,
          profile.community.totalScore,
          profile.community.wins,
          JSON.stringify(profile.community.badges),
          profile.community.week,
          profile.community.weekScore,
          profile.community.weekWins,
          profile.community.rankAt || Date.now(),
          Number(
            body.action.type === "begin-run" || profile.settled.length > 0,
          ),
          hash,
          version,
        );
        const settledMap = profile.lastRunMap || "tbilisi";
        const record =
          body.action.type === "settle"
            ? cityCommunity(profile, settledMap).lastTime
            : null;
        const recordPath =
          settledMap !== "tbilisi"
            ? `$.maps.${settledMap}.community.lastTime.runId`
            : "$.community.lastTime.runId";
        const statements = [update];
        const contest = eventProgress(profile);
        const guard =
          "EXISTS(SELECT 1 FROM garages WHERE key_hash=? AND version=? AND json_extract(profile,'$.operations[#-1]')=?)";
        if (body.action.type === "join-event")
          statements.push(
            DB.prepare(
              `INSERT INTO event_entries(event_id,key_hash,handle,handle_key,joined_at) SELECT ?,?,?,?,? WHERE ${guard} ON CONFLICT(event_id,key_hash) DO NOTHING`,
            ).bind(
              EVENT_ID,
              hash,
              contest.handle,
              contest.handleKey,
              contest.joinedAt,
              hash,
              version + 1,
              body.id,
            ),
          );
        if (
          body.action.type === "settle" &&
          contest?.lastReceipt?.runId === body.action.runId
        ) {
          const receipt = contest.lastReceipt,
            r = contest.scores[receipt.map];
          if (receipt.unlocked)
            statements.push(
              DB.prepare(
                `UPDATE event_entries SET unlocked_at=COALESCE(unlocked_at,?) WHERE event_id=? AND key_hash=? AND ${guard}`,
              ).bind(now, EVENT_ID, hash, hash, version + 1, body.id),
            );
          statements.push(
            DB.prepare(
              `INSERT INTO event_scores(event_id,key_hash,map,score,runs,level,rank_at) SELECT ?,?,?,?,?,?,? WHERE ${guard} ON CONFLICT(event_id,key_hash,map) DO UPDATE SET score=excluded.score,runs=excluded.runs,level=excluded.level,rank_at=excluded.rank_at`,
            ).bind(
              EVENT_ID,
              hash,
              receipt.map,
              r.score,
              r.runs,
              r.level,
              r.rankAt,
              hash,
              version + 1,
              body.id,
            ),
          );
          statements.push(
            DB.prepare(
              `INSERT INTO event_runs(id,event_id,key_hash,map,score,result,metrics,recorded_at) SELECT ?,?,?,?,?,?,?,? WHERE ${guard} ON CONFLICT(id) DO NOTHING`,
            ).bind(
              body.action.runId,
              EVENT_ID,
              hash,
              receipt.map,
              receipt.score,
              body.action.result,
              JSON.stringify(body.action.metrics),
              now,
              hash,
              version + 1,
              body.id,
            ),
          );
        }

        const rankingMap =
          body.action.type === "checkpoint-progress"
            ? profile.activeRun?.map
            : settledMap;
        if (
          ["settle", "checkpoint-progress"].includes(body.action.type) &&
          rankingMap &&
          rankingMap !== "tbilisi"
        ) {
          const c = profile.maps[rankingMap].community;
          statements.push(
            DB.prepare(
              "INSERT INTO city_rankings(key_hash,map,ranked_runs,rank_level,rank_checkpoints,best_score,total_score,wins,badges,week_key,week_score,week_wins,rank_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM garages WHERE key_hash=? AND version=? AND json_extract(profile,'$.operations[#-1]')=?) ON CONFLICT(key_hash,map) DO UPDATE SET ranked_runs=excluded.ranked_runs,rank_level=excluded.rank_level,rank_checkpoints=excluded.rank_checkpoints,best_score=excluded.best_score,total_score=excluded.total_score,wins=excluded.wins,badges=excluded.badges,week_key=excluded.week_key,week_score=excluded.week_score,week_wins=excluded.week_wins,rank_at=excluded.rank_at",
            ).bind(
              hash,
              rankingMap,
              c.runs,
              c.furthestLevel,
              c.checkpoints,
              c.bestScore,
              c.totalScore,
              c.wins,
              JSON.stringify(c.badges),
              c.week,
              c.weekScore,
              c.weekWins,
              c.rankAt || Date.now(),
              hash,
              version + 1,
              body.id,
            ),
          );
        }
        let result;
        if (record && record.runId === body.action.runId) {
          const insert = DB.prepare(
            "INSERT INTO level_records (key_hash,course,level,car,build_class,build_points,duration_ms,rewinds,recorded_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM garages WHERE key_hash=? AND version=? AND json_extract(profile,?)=? AND json_extract(profile,'$.operations[#-1]')=?) ON CONFLICT(key_hash,course,level,car,build_class) DO UPDATE SET build_points=excluded.build_points,duration_ms=excluded.duration_ms,rewinds=excluded.rewinds,recorded_at=excluded.recorded_at WHERE excluded.duration_ms<level_records.duration_ms",
          ).bind(
            hash,
            record.course,
            record.level,
            record.car,
            record.buildPoints === 0 ? "stock" : "tuned",
            record.buildPoints,
            record.elapsedMs,
            record.rewinds,
            record.recordedAt,
            hash,
            version + 1,
            recordPath,
            record.runId,
            body.id,
          );
          // Save an immutable result, atomically with the reward and fastest time.
          // Public reads still require the owner to have a listed driver profile.
          const share = DB.prepare(
            "INSERT INTO race_results (id,key_hash,course,level,car,build_points,duration_ms,score,rewinds,recorded_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM garages WHERE key_hash=? AND version=? AND json_extract(profile,?)=? AND json_extract(profile,'$.operations[#-1]')=?) ON CONFLICT(id) DO NOTHING",
          ).bind(
            record.runId,
            hash,
            record.course,
            record.level,
            record.car,
            record.buildPoints,
            record.elapsedMs,
            record.score,
            record.rewinds,
            record.recordedAt,
            hash,
            version + 1,
            recordPath,
            record.runId,
            body.id,
          );
          statements.push(insert, share);
        }
        if (statements.length > 1) [result] = await DB.batch(statements);
        else result = await update.run();
        if (result.meta.changes !== 1)
          return json(
            {
              error: "Another garage update just completed. Refresh and retry.",
            },
            409,
          );
        version++;
      }
    }
    return json({
      profile: options.preview ? { ...profile, previewAccess: true } : profile,
      preview: options.preview === true,
      serverTime: now,
      version,
      driver: hash.slice(0, 6).toUpperCase(),
      publicId: row.public_id || (version !== row.version ? publicId : null),
    });
  } catch (error) {
    if (
      /UNIQUE constraint failed: event_entries.event_id, event_entries.handle_key/.test(
        error.message,
      )
    )
      return json(
        { error: "This event username is taken. Choose a different one." },
        400,
      );
    console.error("Garage storage error:", error.message);
    return json(
      {
        error:
          "Your garage could not be saved. Please retry; your action has not been discarded.",
      },
      503,
    );
  }
}
