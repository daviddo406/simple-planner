import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships a WASM build that must not be bundled. It is a devDependency
  // and only the test and E2E backends import it — the production Neon path
  // never touches it.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
