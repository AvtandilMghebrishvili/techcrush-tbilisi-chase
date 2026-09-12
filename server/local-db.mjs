import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
export function openLocalDatabase(filename = ".sites-runtime/garages.sqlite") {
  if (filename !== ":memory:") mkdirSync(".sites-runtime", { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(
    "CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)",
  );
  for (const file of readdirSync("drizzle")
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    if (
      db.prepare("SELECT name FROM local_migrations WHERE name = ?").get(file)
    )
      continue;
    db.exec("BEGIN");
    try {
      db.exec(readFileSync("drizzle/" + file, "utf8"));
      db.prepare("INSERT INTO local_migrations (name) VALUES (?)").run(file);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  return {
    close: () => db.close(),
    prepare(sql) {
      const statement = db.prepare(sql);
      return {
        bind(...values) {
          return {
            async all() {
              return { results: statement.all(...values) };
            },
            async first() {
              return statement.get(...values) || null;
            },
            async run() {
              const r = statement.run(...values);
              return { success: true, meta: { changes: Number(r.changes) } };
            },
          };
        },
      };
    },
  };
}
