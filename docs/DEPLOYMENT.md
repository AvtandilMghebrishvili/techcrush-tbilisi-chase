# Deployment and access

The career edition requires **static assets + the Worker save API + a D1 database**. A static-only deployment cannot load saved garages. The obsolete GitHub Pages workflow has been removed.

## Access

The [game link](https://nightshift-chase-september.avtandilmghebrishvili.chatgpt.site/) and [public source repository](https://github.com/AvtandilMghebrishvili/techcrush-tbilisi-chase) are separate resources. Public repository access permits reading, downloading and forking, not pushing changes. Game visitors receive separate anonymous garages; sharing the game never shares your private garage key.

Sites audience settings control who can open the game. Public permits anyone with the link. Source pushes to GitHub do not automatically redeploy Sites.

## Existing Sites deployment

`.openai/hosting.json` identifies the creator's Sites project and logical `DB` binding. It is metadata, not a credential. Fork owners must use their own project.

Run `npm ci`, `npm test`, and `npm run build`. The build emits:

- `dist/server/index.js`: bundled Workers-compatible default fetch handler.
- `dist/client/`: game modules, assets, vendor files and credits.
- `dist/.openai/hosting.json`: logical hosting configuration.
- `dist/.openai/drizzle/`: generated migration files and metadata.

Publish the exact tested source and its build using the Sites hosting integration. Schema migrations must accompany the Worker. Sites provides the static asset binding `ASSETS` and database binding `DB`. Save a version before deployment and check the terminal deployment result. Never place player keys, database files or repository tokens into source or archives.

## Independent Cloudflare Worker deployment

Cloudflare Workers with Static Assets and D1 provides an alternative for a fork. This is a configuration guide, not a claim that a second deployment has been created. See official [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [asset binding](https://developers.cloudflare.com/workers/static-assets/binding/) and [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).

Create a D1 database in your account. Set up Wrangler with a configuration equivalent to:

```jsonc
{
  "name": "your-tbilisi-chase",
  "main": "dist/server/index.js",
  "compatibility_date": "2026-09-11",
  "assets": {
    "directory": "dist/client",
    "binding": "ASSETS",
    "run_worker_first": ["/api/*"]
  },
  "d1_databases": [{
    "binding": "DB",
    "database_name": "your-garages",
    "database_id": "YOUR_DATABASE_ID",
    "migrations_dir": "drizzle"
  }]
}
```

Build first, apply the checked-in migrations to that remote database, then deploy the Worker using your authenticated Wrangler installation. Keep the existing database on updates so players retain their saves. Use your own database identifier; do not copy the Sites project identifier into this configuration.

Generated migrations are schema-only. After a migration has been applied, add a new migration for changes instead of editing history. Database backups/retention are the hosting operator's responsibility. No third-party API key is required by the game.

GitHub Pages and a static file ZIP alone are unsuitable for the current server-saved career. A Node deployment is possible by adapting the loopback development server behind a suitable HTTPS reverse proxy and durable SQLite volume; the included `server.mjs` is intended for local development.

## Release checks

Run tests/build for the release source, include all runtime assets and migrations, and preserve credits/license files. Validate saving, reloading, separate player profiles and a short drive. Public access and repository visibility must be configured separately. See [Testing](TESTING.md), [Career API](CAREER.md) and [Assets](../ASSETS.md).
