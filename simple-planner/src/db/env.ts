/**
 * Marketplace integrations inject several connection variables — pooled and
 * unpooled, under a handful of names. The app reads one, normalized here, so a
 * second provider that names its variable differently is a one-line change
 * rather than a search across the codebase.
 */
const CONNECTION_VARIABLES = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
] as const;

export const DRIVERS = ["neon", "postgres", "pglite"] as const;
export type Driver = (typeof DRIVERS)[number];

type Env = Record<string, string | undefined>;

export function resolveDatabaseUrl(env: Env): string {
  for (const name of CONNECTION_VARIABLES) {
    const value = env[name];
    if (value) {
      return value;
    }
  }
  throw new Error(
    `No database connection string. Set one of ${CONNECTION_VARIABLES.join(", ")} — ` +
      `on Vercel these are injected by the Marketplace integration, so run ` +
      `\`vercel env pull .env.local\` locally.`,
  );
}

/**
 * `neon` in production, `postgres` for any other Postgres over the standard
 * wire protocol, `pglite` in the unit tests and the E2E suite. Defaults
 * to neon so a deploy never depends on a variable being set, and throws rather
 * than falling back when the value is unrecognized — a typo that silently
 * pointed production at an in-process database would be much worse.
 */
export function resolveDriver(env: Env): Driver {
  const requested = env.DB_DRIVER;
  if (!requested) {
    return "neon";
  }
  if (!(DRIVERS as readonly string[]).includes(requested)) {
    throw new Error(
      `Unknown DB_DRIVER ${JSON.stringify(requested)}. Expected one of ${DRIVERS.join(", ")}.`,
    );
  }
  return requested as Driver;
}
