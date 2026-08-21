import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Monday-first has to be decided once. `src/lib/calendar.ts` is the only
    // module allowed to talk to date-fns, because it is the only one that
    // passes `{ weekStartsOn: 1 }`; a component importing `startOfWeek`
    // directly would silently get the locale default and render Sunday-first.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/calendar.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["date-fns", "date-fns/*"],
              message:
                "Import the wrapper in @/lib/calendar instead. It is the only module that pins { weekStartsOn: 1 }.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
