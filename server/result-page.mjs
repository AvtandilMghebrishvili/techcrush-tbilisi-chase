import { formatRaceTime } from "../dist/race-timing.js";
import { carSpec } from "../dist/config.js";

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
};
export async function resultPage(request, DB) {
  if (!["GET", "HEAD"].includes(request.method))
    return new Response("Method not allowed", { status: 405 });
  const url = new URL(request.url),
    id = url.pathname.slice("/result/".length);
  if (!/^[a-f0-9-]{36}$/.test(id))
    return new Response("Result not found", { status: 404, headers });
  let r;
  try {
    r = await DB.prepare(
      "SELECT r.*,g.display_name FROM race_results r JOIN garages g ON g.key_hash=r.key_hash WHERE r.id=? AND g.listed=1",
    )
      .bind(id)
      .first();
  } catch {
    return new Response("Result temporarily unavailable", {
      status: 503,
      headers,
    });
  }
  if (!r)
    return new Response("This result is private or unavailable.", {
      status: 404,
      headers,
    });
  const time = formatRaceTime(r.duration_ms),
    title = `${r.display_name} · Level ${r.level} in ${time} · TECHCRUSH`,
    description = `${r.score.toLocaleString("en-US")} points · ${carSpec(r.car).name} · ${r.build_points}/56 upgrades · ${r.rewinds} rewinds. Six checkpoints, one escape. Can you beat this time?`,
    canonical = url.origin + url.pathname;
  // No client JavaScript/WebGL: crawlers and friends get the saved result directly.
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:site_name" content="TECHCRUSH Tbilisi Chase"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(url.origin)}/assets/techcrush-logo.jpg"><link rel="canonical" href="${esc(canonical)}">
  <style>*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px;background:#0a111d;color:#edf5ff;font:16px/1.5 system-ui}main{max-width:600px;width:100%;padding:32px;border:1px solid #526077;border-top:4px solid #ef2146;border-radius:20px;background:linear-gradient(145deg,#202c40,#101a2c)}img{width:64px;height:64px;border-radius:50%;float:right}small{color:#a8b7c9;letter-spacing:.14em}h1{font-size:clamp(24px,6vw,42px);overflow-wrap:anywhere;margin:16px 0 0}strong{display:block;font-size:clamp(48px,12vw,82px);color:#ffe08a;font-variant-numeric:tabular-nums;line-height:1.3}p{color:#c2d1e4}a{display:block;padding:15px;background:#ed2548;color:white;text-decoration:none;border-radius:10px;font-weight:800;text-align:center;margin-top:24px}footer{font-size:12px;color:#8d9bad;margin-top:20px}</style></head><body><main><img src="/assets/techcrush-logo.jpg" alt="TECHCRUSH"><small>TBILISI / LEVEL ${r.level} CLEAR</small><h1>${esc(r.display_name)}</h1><strong>${time}</strong><p>${esc(description)}</p><a href="/">RACE TBILISI · PLAY FREE ↗</a><footer>${esc(r.course.toUpperCase())} · ${esc(new Date(r.recorded_at).toISOString().slice(0, 10))}<br>Active race time includes rewind; pauses and loading are excluded.</footer></main></body></html>`;
  return new Response(request.method === "HEAD" ? null : html, { headers });
}
