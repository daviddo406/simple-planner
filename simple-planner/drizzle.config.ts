import { defineConfig } from "drizzle-kit";
import { resolveDatabaseUrl } from "./src/db/env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: resolveDatabaseUrl(process.env),
  },
});
