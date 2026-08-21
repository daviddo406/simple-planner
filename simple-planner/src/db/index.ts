import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { resolveDatabaseUrl, resolveDriver } from "./env";
import * as schema from "./schema";

/**
 * The only file in the codebase that names a database driver. Everything else
 * calls the named functions in `./queries`, so moving from Neon to Supabase,
 * Railway, RDS, or a self-hosted Postgres is a connection string, and moving
 * from the HTTP driver to a pooled TCP one is a single import here.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

// Next's dev server re-evaluates modules on every edit. Caching on globalThis
// keeps that from opening a fresh client per keystroke.
const CACHE = globalThis as typeof globalThis & {
  __plannerDb?: Promise<Database>;
};

async function connect(): Promise<Database> {
  const driver = resolveDriver(process.env);

  if (driver === "neon") {
    // Every mutation here is a single statement and every read a single query,
    // so the HTTP driver's one real limitation — no interactive transactions —
    // costs nothing, and it avoids holding a TCP connection open from a
    // function that may live for milliseconds. If a multi-statement
    // transaction is ever genuinely needed, `drizzle-orm/neon-serverless`
    // (WebSocket) supports them: one import change, in this one file.
    const [{ neon }, { drizzle }] = await Promise.all([
      import("@neondatabase/serverless"),
      import("drizzle-orm/neon-http"),
    ]);
    return drizzle(neon(resolveDatabaseUrl(process.env)), { schema });
  }

  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);
  const dataDir = process.env.PGLITE_DATA_DIR ?? "memory://";
  if (!dataDir.startsWith("memory://")) {
    // PGlite creates its own directory but not the parents above it, so a
    // clean checkout running the E2E suite would fail on `.pglite/e2e` with an
    // ENOENT that names mkdir rather than anything recognisable.
    const { mkdirSync } = await import("node:fs");
    const { dirname } = await import("node:path");
    mkdirSync(dirname(dataDir), { recursive: true });
  }
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  // Bootstrapping the schema here applies only to the in-process WASM backend,
  // which starts empty every time and has no deploy step to hang a migration
  // off. The Neon path above never migrates: on a serverless platform that
  // would mean every cold start racing every other to alter the same schema.
  // Production migrations run deliberately, via `npm run db:migrate`.
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

export function getDb(): Promise<Database> {
  CACHE.__plannerDb ??= connect();
  return CACHE.__plannerDb;
}

/**
 * Drops the cached connection. Used between test cases to get a fresh
 * in-memory database, and available for disposing a stale client in dev.
 */
export async function resetDb(): Promise<void> {
  CACHE.__plannerDb = undefined;
}
