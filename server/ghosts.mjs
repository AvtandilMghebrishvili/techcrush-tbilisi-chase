const MAPS = new Set(["tbilisi", "kutaisi", "batumi", "rustavi"]);
const CARS = new Set([
  "classic",
  "gt",
  "rally",
  "suv",
  "falcon",
  "rioni",
  "coast",
  "creator",
  "batmobile",
]);
const number = (value, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max)
    throw Error("Invalid ghost position.");
  return Math.round(parsed * 100) / 100;
};

export function validateGhost(body) {
  if (!body || typeof body !== "object") throw Error("Invalid ghost update.");
  if (!/^[a-f0-9-]{36}$/i.test(body.session || ""))
    throw Error("Invalid ghost session.");
  if (!MAPS.has(body.map)) throw Error("Invalid ghost city.");
  if (!CARS.has(body.car)) throw Error("Invalid ghost car.");
  return {
    session: body.session.toLowerCase(),
    map: body.map,
    car: body.car,
    x: number(body.x, -5000, 5000),
    y: number(body.y, -30, 500),
    z: number(body.z, -5000, 5000),
    angle: number(body.angle, -1000, 1000),
    pitch: number(body.pitch || 0, -Math.PI, Math.PI),
    roll: number(body.roll || 0, -Math.PI, Math.PI),
  };
}

export async function updateGhosts(DB, keyHash, body, now) {
  const ghost = validateGhost(body);
  await DB.prepare(
    "INSERT INTO ghost_presence(key_hash,session_id,map,car,x,y,z,angle,pitch,roll,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(key_hash) DO UPDATE SET session_id=excluded.session_id,map=excluded.map,car=excluded.car,x=excluded.x,y=excluded.y,z=excluded.z,angle=excluded.angle,pitch=excluded.pitch,roll=excluded.roll,updated_at=excluded.updated_at",
  )
    .bind(
      keyHash,
      ghost.session,
      ghost.map,
      ghost.car,
      ghost.x,
      ghost.y,
      ghost.z,
      ghost.angle,
      ghost.pitch,
      ghost.roll,
      now,
    )
    .run();
  // A presence is intentionally ephemeral. Opportunistic cleanup keeps the
  // table small without requiring a scheduled job.
  await DB.prepare("DELETE FROM ghost_presence WHERE updated_at < ?")
    .bind(now - 60000)
    .run();
  const result = await DB.prepare(
    "SELECT p.session_id AS id,p.car,p.x,p.y,p.z,p.angle,p.pitch,p.roll,CASE WHEN g.private_mode=1 THEN 'PRIVATE DRIVER' WHEN length(trim(g.display_name))>=3 THEN trim(g.display_name) ELSE 'DRIVER' END AS name FROM ghost_presence p JOIN garages g ON g.key_hash=p.key_hash WHERE p.map=? AND p.key_hash<>? AND p.updated_at>=? AND ((p.x-?)*(p.x-?)+(p.z-?)*(p.z-?))<=? ORDER BY ((p.x-?)*(p.x-?)+(p.z-?)*(p.z-?)) ASC, p.updated_at DESC LIMIT 12",
  )
    .bind(
      ghost.map,
      keyHash,
      now - 7000,
      ghost.x,
      ghost.x,
      ghost.z,
      ghost.z,
      1800 * 1800,
      ghost.x,
      ghost.x,
      ghost.z,
      ghost.z,
    )
    .all();
  return { ghosts: result.results || [], serverTime: now };
}
