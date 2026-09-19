// Public contest rules. The server supplies the clock and stamps run eligibility.
export const EVENT_ID = "city-wars-2026-09";
export const EVENT_NAME = "TECHCRUSH: CITY WARS";
export const EVENT_START = Date.parse("2026-09-20T15:00:00+04:00");
export const EVENT_END = Date.parse("2026-09-24T21:00:00+04:00");
// Transport grace only: the client stops driving at EVENT_END. No late starts.
export const EVENT_SAVE_GRACE = 30000;
export const HUNT_CITIES = ["tbilisi", "kutaisi", "batumi"];
export const ARTIFACT_BANNERS = [0, 3, 6, 9, 12];
export const eventPhase = (now) =>
  now < EVENT_START ? "upcoming" : now < EVENT_END ? "live" : "ended";
export const eventProgress = (p) => p?.events?.[EVENT_ID];
// Enrollment belongs to the saved profile, not a removable URL mode switch.
export const enrolledEvent = (p, now) =>
  eventProgress(p) && now < EVENT_END ? EVENT_ID : undefined;
export const huntComplete = (p) =>
  HUNT_CITIES.every((map) =>
    ARTIFACT_BANNERS.every((id) =>
      (eventProgress(p)?.artifacts?.[map] || []).includes(id),
    ),
  );
export const secretOpen = (p, now = Date.now()) =>
  !!p?.previewAccess || now >= EVENT_END || huntComplete(p);
export function normalizeEventHandle(value) {
  const handle = String(value || "")
    .normalize("NFKC")
    .trim();
  if (!/^[\p{L}\p{N}_-]{3,20}$/u.test(handle))
    throw Error("Use 3–20 letters, numbers, underscores or hyphens.");
  return { handle, normalized: handle.toLocaleLowerCase("en-US") };
}
export function joinEvent(p, action, now) {
  if (eventPhase(now) === "upcoming")
    throw Error(
      "The event has not started yet. Joining opens on 20 September at 15:00 (Tbilisi time).",
    );
  if (eventPhase(now) === "ended")
    throw Error("This event has ended. Its rankings are archived.");
  if (action.acceptRules !== true || action.subscribeAcknowledged !== true)
    throw Error(
      "Confirm the event rules and the channel subscription requirement.",
    );
  p.events ||= {};
  const existing = eventProgress(p);
  const { handle, normalized } = normalizeEventHandle(action.handle);
  if (existing && existing.handleKey !== normalized)
    throw Error("Your event username stays fixed until the event ends.");
  if (!existing)
    p.events[EVENT_ID] = {
      handle,
      handleKey: normalized,
      joinedAt: now,
      artifacts: Object.fromEntries(HUNT_CITIES.map((map) => [map, []])),
      scores: {},
      subscription: "self-declared",
    };
}
export function stampEventRun(p, action, ticket, now) {
  const event = action.event || enrolledEvent(p, now);
  if (!event) return;
  if (event !== EVENT_ID || !eventProgress(p))
    throw Error("Join CITY WARS before starting an event chase.");
  if (eventPhase(now) !== "live")
    throw Error(
      eventPhase(now) === "upcoming"
        ? "The event has not started yet."
        : "The event has ended.",
    );
  ticket.event = EVENT_ID;
  ticket.eventEndsAt = EVENT_END;
}
export function settleEvent(p, ticket, metrics, result, now) {
  if (
    ticket?.event !== EVENT_ID ||
    ticket.startedAt < EVENT_START ||
    ticket.startedAt >= EVENT_END ||
    now >= EVENT_END + EVENT_SAVE_GRACE ||
    metrics.time > (EVENT_END - ticket.startedAt) / 1000 + 0.25
  )
    return null;
  const event = eventProgress(p);
  if (!event) throw Error("Event registration was not found.");
  const map = ticket.map;
  const artifacts = metrics.artifacts ?? [];
  if (
    !Array.isArray(artifacts) ||
    artifacts.length > 5 ||
    new Set(artifacts).size !== artifacts.length ||
    artifacts.some((id) => !ARTIFACT_BANNERS.includes(id)) ||
    (!HUNT_CITIES.includes(map) && artifacts.length)
  )
    throw Error("Invalid event artifacts.");
  if (
    artifacts.length &&
    (metrics.time < artifacts.length * 0.25 ||
      metrics.distance < artifacts.length * 8)
  )
    throw Error("Artifact route could not be verified.");
  const before = huntComplete(p);
  if (HUNT_CITIES.includes(map))
    event.artifacts[map] = [
      ...new Set([...(event.artifacts[map] || []), ...artifacts]),
    ];
  const row = (event.scores[map] ||= {
    score: 0,
    runs: 0,
    level: 1,
    rankAt: now,
  });
  row.score += metrics.score;
  row.runs++;
  row.level = Math.max(row.level, ticket.level + Number(result === "won"));
  row.rankAt = now;
  event.lastReceipt = {
    runId: ticket.id,
    map,
    score: metrics.score,
    unlocked: !before && huntComplete(p),
    at: now,
  };
  return event.lastReceipt;
}
