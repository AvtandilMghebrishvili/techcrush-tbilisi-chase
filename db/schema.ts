import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
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
