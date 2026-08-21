import { defineConfig } from "drizzle-kit";
import { resolveDatabaseUrl } from "./src/db/env";

/*
 * `next dev` and `next build` read `.env.local` on their own; drizzle-kit does
 * not, so without this the CLI would not see the credentials `vercel env pull`
 * had just written and `npm run db:migrate` would report no connection string
 * on a machine that plainly has one.
 *
 * Order matters: `process.loadEnvFile` does not overwrite a value that is
 * already set, so the first file loaded wins. `.env.local` goes first to
 * outrank `.env`, and anything passed inline on the command line outranks both
 * — which is what keeps `DATABASE_URL=… npm run db:migrate` working against a
 * one-off database.
 */
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Not every environment has one; CI passes the variable directly.
  }
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: resolveDatabaseUrl(process.env),
  },
});
