import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const garages = sqliteTable(
  "garages",
  {
    keyHash: text("key_hash").primaryKey(),
    profile: text("profile").notNull(),
    version: integer("version").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
    publicId: text("public_id"),
    displayName: text("display_name").notNull().default(""),
    avatar: text("avatar").notNull().default("red"),
    listed: integer("listed").notNull().default(0),
    privateMode: integer("private_mode").notNull().default(0),
    hasPlayed: integer("has_played").notNull().default(0),
    rankedRuns: integer("ranked_runs").notNull().default(0),
    rankLevel: integer("rank_level").notNull().default(1),
    rankCheckpoints: integer("rank_checkpoints").notNull().default(0),
    bestScore: integer("best_score").notNull().default(0),
    totalScore: integer("total_score").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    badges: text("badges").notNull().default("[]"),
    weekKey: text("week_key").notNull().default(""),
    weekScore: integer("week_score").notNull().default(0),
    weekWins: integer("week_wins").notNull().default(0),
    rankAt: integer("rank_at").notNull().default(0),
  },
  (t) => [
    index("leaderboard_player_count").on(t.hasPlayed),
    index("leaderboard_progress").on(
      t.listed,
      t.rankLevel,
      t.rankCheckpoints,
      t.bestScore,
      t.rankAt,
      t.publicId,
    ),
    index("leaderboard_score").on(
      t.listed,
      t.bestScore,
      t.rankLevel,
      t.rankAt,
      t.publicId,
    ),
    index("leaderboard_week").on(
      t.listed,
      t.weekKey,
      t.weekScore,
      t.weekWins,
      t.rankAt,
      t.publicId,
    ),
  ],
);
export const gameIds = sqliteTable("game_ids", {
  keyHash: text("key_hash")
    .primaryKey()
    .references(() => garages.keyHash),
  credentialHash: text("credential_hash").notNull().unique(),
  recoveryCode: text("recovery_code").notNull(),
});
// Owner-authorized corrections are scoped to one garage and recorded once.
export const supportAdjustments = sqliteTable("support_adjustments", {
  id: text("id").primaryKey(),
  keyHash: text("key_hash")
    .notNull()
    .references(() => garages.keyHash),
  caseId: text("case_id").notNull(),
  receipt: text("receipt").notNull(),
  appliedAt: integer("applied_at").notNull(),
});
export const gameIdAttempts = sqliteTable(
  "game_id_attempts",
  {
    bucket: text("bucket").primaryKey(),
    attempts: integer("attempts").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("game_id_attempt_expiry").on(t.expiresAt)],
);
export const levelRecords = sqliteTable(
  "level_records",
  {
    keyHash: text("key_hash")
      .notNull()
      .references(() => garages.keyHash),
    course: text("course").notNull(),
    level: integer("level").notNull(),
    car: text("car").notNull(),
    buildClass: text("build_class").notNull(),
    buildPoints: integer("build_points").notNull(),
    durationMs: integer("duration_ms").notNull(),
    rewinds: integer("rewinds").notNull(),
    recordedAt: integer("recorded_at").notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.keyHash, t.course, t.level, t.car, t.buildClass],
    }),
    index("leaderboard_level_time").on(
      t.course,
      t.level,
      t.durationMs,
      t.recordedAt,
    ),
    index("leaderboard_stock_time").on(
      t.course,
      t.level,
      t.buildClass,
      t.car,
      t.durationMs,
    ),
  ],
);
export const raceResults = sqliteTable("race_results", {
  id: text("id").primaryKey(),
  keyHash: text("key_hash")
    .notNull()
    .references(() => garages.keyHash),
  course: text("course").notNull(),
  level: integer("level").notNull(),
  car: text("car").notNull(),
  buildPoints: integer("build_points").notNull(),
  durationMs: integer("duration_ms").notNull(),
  score: integer("score").notNull(),
  rewinds: integer("rewinds").notNull(),
  recordedAt: integer("recorded_at").notNull(),
});
export const eventEntries = sqliteTable(
  "event_entries",
  {
    eventId: text("event_id").notNull(),
    keyHash: text("key_hash")
      .notNull()
      .references(() => garages.keyHash),
    handle: text("handle").notNull(),
    handleKey: text("handle_key").notNull(),
    joinedAt: integer("joined_at").notNull(),
    unlockedAt: integer("unlocked_at"),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.keyHash] }),
    uniqueIndex("event_unique_handle").on(t.eventId, t.handleKey),
    index("event_discovery").on(t.eventId, t.unlockedAt),
  ],
);
export const eventScores = sqliteTable(
  "event_scores",
  {
    eventId: text("event_id").notNull(),
    keyHash: text("key_hash")
      .notNull()
      .references(() => garages.keyHash),
    map: text("map").notNull(),
    score: integer("score").notNull(),
    runs: integer("runs").notNull(),
    level: integer("level").notNull(),
    rankAt: integer("rank_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.keyHash, t.map] }),
    index("event_city_score").on(t.eventId, t.map, t.score, t.rankAt),
  ],
);
export const eventRuns = sqliteTable("event_runs", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull(),
  keyHash: text("key_hash")
    .notNull()
    .references(() => garages.keyHash),
  map: text("map").notNull(),
  score: integer("score").notNull(),
  result: text("result").notNull(),
  metrics: text("metrics").notNull(),
  recordedAt: integer("recorded_at").notNull(),
});
export const cityRankings = sqliteTable(
  "city_rankings",
  {
    keyHash: text("key_hash")
      .notNull()
      .references(() => garages.keyHash),
    map: text("map").notNull(),
    rankedRuns: integer("ranked_runs").notNull(),
    rankLevel: integer("rank_level").notNull(),
    rankCheckpoints: integer("rank_checkpoints").notNull(),
    bestScore: integer("best_score").notNull(),
    totalScore: integer("total_score").notNull(),
    wins: integer("wins").notNull(),
    badges: text("badges").notNull(),
    weekKey: text("week_key").notNull(),
    weekScore: integer("week_score").notNull(),
    weekWins: integer("week_wins").notNull(),
    rankAt: integer("rank_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.keyHash, t.map] }),
    index("city_progress").on(
      t.map,
      t.rankLevel,
      t.rankCheckpoints,
      t.bestScore,
    ),
    index("city_score").on(t.map, t.bestScore),
    index("city_week").on(t.map, t.weekKey, t.weekScore),
  ],
);
export const ghostPresence = sqliteTable(
  "ghost_presence",
  {
    keyHash: text("key_hash")
      .primaryKey()
      .references(() => garages.keyHash),
    sessionId: text("session_id").notNull(),
    map: text("map").notNull(),
    car: text("car").notNull(),
    x: real("x").notNull(),
    y: real("y").notNull(),
    z: real("z").notNull(),
    angle: real("angle").notNull(),
    pitch: real("pitch").notNull().default(0),
    roll: real("roll").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("ghost_city_recency").on(t.map, t.updatedAt)],
);
