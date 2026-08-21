import { afterEach } from "vitest";

/**
 * Testing Library only registers its own auto-cleanup when the global test
 * API is present, and this project imports `describe`/`test` explicitly. Doing
 * it here keeps every render from leaking into the next case, which shows up
 * as "found multiple elements" rather than as anything obviously stateful.
 *
 * Guarded on `document` because the date and database suites opt into the node
 * environment, where there is no DOM to clean up.
 */
if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");
  afterEach(cleanup);
}
