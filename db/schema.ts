import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const garages = sqliteTable("garages", {
  keyHash: text("key_hash").primaryKey(),
  profile: text("profile").notNull(),
  version: integer("version").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
});
