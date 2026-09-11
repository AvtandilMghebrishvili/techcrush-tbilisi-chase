import { newProfile, applyProgressAction } from "../dist/progression.js";
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
export async function handleApi(request, DB) {
  if (!DB)
    return json(
      { error: "Garage saving is temporarily unavailable. Please try again." },
      503,
    );
  const url = new URL(request.url);
  if (!["/api/profile", "/api/action"].includes(url.pathname))
    return json({ error: "Not found" }, 404);
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    return json({ error: "Missing or invalid garage key." }, 401);
  const hash = await keyHash(token);
  try {
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
      "SELECT profile,version FROM garages WHERE key_hash = ?",
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
    let profile = JSON.parse(row.profile),
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
          );
        } catch (error) {
          return json({ error: error.message }, 400);
        }
        profile.operations = [...(profile.operations || []), body.id].slice(
          -128,
        );
        const result = await DB.prepare(
          "UPDATE garages SET profile = ?, version = version + 1, updated_at = ? WHERE key_hash = ? AND version = ?",
        )
          .bind(JSON.stringify(profile), Date.now(), hash, version)
          .run();
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
    return json({ profile, version, driver: hash.slice(0, 6).toUpperCase() });
  } catch (error) {
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
