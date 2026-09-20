const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export async function keyHash(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

// Keep the original garage primary key: rankings, event entries and inventory
// must never be copied into a new identity when another browser signs in.
export async function resolveGarageHash(DB, token) {
  const hash = await keyHash(token);
  const identity = await DB.prepare(
    "SELECT key_hash FROM game_ids WHERE credential_hash=?",
  )
    .bind(hash)
    .first();
  return identity?.key_hash || hash;
}

const recoveryToken = (code) => keyHash("techcrush-game-id-v1:" + code);

export async function ensureGameCode(DB, hash) {
  const existing = await DB.prepare(
    "SELECT recovery_code FROM game_ids WHERE key_hash=?",
  )
    .bind(hash)
    .first();
  if (existing) return existing.recovery_code;
  // 80 random bits, in four easy-to-read groups. Never use the public driver tag.
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = Array.from(
      crypto.getRandomValues(new Uint8Array(16)),
      (v) => ALPHABET[v & 31],
    ).join("");
    const credential = await keyHash(await recoveryToken(code));
    await DB.prepare(
      "INSERT INTO game_ids(key_hash,credential_hash,recovery_code) VALUES(?,?,?) ON CONFLICT DO NOTHING",
    )
      .bind(hash, credential, code)
      .run();
    const saved = await DB.prepare(
      "SELECT recovery_code FROM game_ids WHERE key_hash=?",
    )
      .bind(hash)
      .first();
    if (saved) return saved.recovery_code;
  }
  throw Error("Could not allocate Game ID.");
}

export function formatGameId(code, name) {
  const prefix =
    Array.from(
      String(name || "")
        .normalize("NFKC")
        .replace(/[^\p{L}\p{N}]/gu, ""),
    )
      .slice(0, 8)
      .join("")
      .toUpperCase() || "DRIVER";
  return prefix + "-" + code.match(/.{4}/g).join("-");
}

export function normalizeGameCode(value) {
  if (typeof value !== "string" || value.length > 80) return null;
  const compact = value.normalize("NFKC").toUpperCase().replace(/[\s-]/g, "");
  if (!/^[\p{L}\p{N}]{16,32}$/u.test(compact)) return null;
  const code = compact.slice(-16).replace(/O/g, "0").replace(/[IL]/g, "1");
  return /^[0-9A-HJKMNP-TV-Z]{16}$/.test(code) ? code : null;
}

export async function allowGameIdAttempt(DB, address, now) {
  const bucket = await keyHash("game-id-restore:" + (address || "local"));
  await DB.prepare("DELETE FROM game_id_attempts WHERE expires_at<=?")
    .bind(now)
    .run();
  const row = await DB.prepare(
    "INSERT INTO game_id_attempts(bucket,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts",
  )
    .bind(bucket, now + 600000)
    .first();
  return row.attempts <= 20;
}

export async function restoreGameId(DB, value) {
  const code = normalizeGameCode(value);
  if (!code) return null;
  const token = await recoveryToken(code);
  const owner = await DB.prepare(
    "SELECT g.key_hash FROM game_ids i JOIN garages g ON g.key_hash=i.key_hash WHERE i.credential_hash=?",
  )
    .bind(await keyHash(token))
    .first();
  return owner ? token : null;
}
