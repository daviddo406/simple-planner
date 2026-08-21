// @vitest-environment node
import { describe, expect, test } from "vitest";
import { resolveDatabaseUrl, resolveDriver } from "./env";

const URL_A = "postgres://a/db";
const URL_B = "postgres://b/db";

describe("resolveDatabaseUrl", () => {
  test.each([
    "DATABASE_URL",
    "POSTGRES_URL",
    "DATABASE_URL_UNPOOLED",
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_PRISMA_URL",
  ])("reads the connection string a provider injected as %s", (name) => {
    expect(resolveDatabaseUrl({ [name]: URL_A })).toBe(URL_A);
  });

  test("prefers DATABASE_URL when a provider injects several", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: URL_A, POSTGRES_URL: URL_B })).toBe(URL_A);
  });

  test("ignores a variable set to an empty string", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "", POSTGRES_URL: URL_B })).toBe(URL_B);
  });

  test("throws a message naming the variables it looked for", () => {
    // The failure that otherwise surfaces as an unreadable driver stack trace
    // on the first deploy.
    expect(() => resolveDatabaseUrl({})).toThrow(/DATABASE_URL/);
    expect(() => resolveDatabaseUrl({})).toThrow(/POSTGRES_URL/);
  });
});

describe("resolveDriver", () => {
  test("defaults to neon so production never depends on a variable being set", () => {
    expect(resolveDriver({})).toBe("neon");
  });

  test("honours DB_DRIVER for the test and E2E backends", () => {
    expect(resolveDriver({ DB_DRIVER: "pglite" })).toBe("pglite");
    expect(resolveDriver({ DB_DRIVER: "neon" })).toBe("neon");
  });

  test("offers a plain TCP driver for any other Postgres", () => {
    // Neon's HTTP driver only speaks to Neon. Supabase, Railway, RDS, and a
    // self-hosted Postgres need the standard wire protocol, so "swapping
    // providers is a connection string" has to come with a driver that can
    // actually dial them.
    expect(resolveDriver({ DB_DRIVER: "postgres" })).toBe("postgres");
  });

  test("rejects an unknown driver rather than silently falling back", () => {
    expect(() => resolveDriver({ DB_DRIVER: "sqlite" })).toThrow(/sqlite/);
  });
});
