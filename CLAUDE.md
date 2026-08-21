# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This repo holds **two separate implementations of the same product** plus the plans behind them.
Pick the right directory before running anything — the two use entirely different toolchains.

| Path | What it is |
|---|---|
| `SimplePlanner/` | The iOS SwiftUI app (Xcode project). Implemented and verified. |
| `simple-planner/` | The Next.js 16 web app. Implemented and verified. |
| `docs/` | The written plans: `weekly-planner-redesign.md` (iOS) and `weekly-planner-nextjs.md` (web). Both are *implemented*. |

Both target the same product: a planner shaped like a paper weekly planner — a mini month
calendar that navigates between weeks, a week page where each day is its own dated section, and
holidays printed inline on their date. Tasks are dated records. The web app is a **greenfield
build to the same design, not a port** of the Swift source; the product decisions carry over,
every platform mechanism is replaced.

---

# iOS app (`SimplePlanner/`)

Project root for all Xcode/build commands: `SimplePlanner/`.

## Commands

Building requires **full Xcode** (Command Line Tools alone cannot build this — `xcodebuild`
will error out). Xcode is installed at `/Applications/Xcode.app` but may not be the selected
developer directory; either select it once with `sudo xcode-select -s /Applications/Xcode.app`
or prefix each command with `DEVELOPER_DIR`, as below.

Check `xcrun simctl list devices available` for simulator names — `iPhone 17 Pro` exists on
this machine, `iPhone 16` does not.

```bash
# Build for the iOS Simulator
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
xcodebuild -project SimplePlanner/SimplePlanner.xcodeproj -scheme SimplePlanner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build

# Run all tests (unit tests in SimplePlannerTests + UI tests in SimplePlannerUITests)
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
xcodebuild -project SimplePlanner/SimplePlanner.xcodeproj -scheme SimplePlanner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test

# Unit tests only — seconds, versus minutes for the UI tests
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
xcodebuild -project SimplePlanner/SimplePlanner.xcodeproj -scheme SimplePlanner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test \
  -only-testing:SimplePlannerTests

# A single test (Swift Testing syntax, used by SimplePlannerTests)
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
xcodebuild -project SimplePlanner/SimplePlanner.xcodeproj -scheme SimplePlanner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test \
  -only-testing:SimplePlannerTests/CalendarMathTests/referenceWeekIsTheSameForEveryDayInIt
```

All commands above were run and verified.

Alternatively, open `SimplePlanner/SimplePlanner.xcodeproj` in Xcode and use Cmd+B / Cmd+U / Cmd+R.

## Architecture

- **`SimplePlannerApp.swift`** — `@main` App entry point; loads `PlannerView` and attaches
  `.modelContainer(for: PlannerTask.self)`.
- **`Models/PlannerTask.swift`** — the SwiftData `@Model`: `title`, `date`, `isCompleted`,
  `createdAt`. `date` is normalized to start-of-day **on write**, which is what makes tasks
  group onto a calendar day.
- **`Calendar/CalendarMath.swift`** — all date math, as pure static functions so it is unit
  testable. Everything runs on an explicit **Monday-first** Gregorian calendar
  (`firstWeekday = 2`, `en_US_POSIX`) rather than `Calendar.current`, whose `firstWeekday` is
  locale-dependent and would render Sunday-first in the US. Both the mini calendar and the
  week page go through here, so they cannot disagree. Day arithmetic goes through
  `addingDays`, which anchors at midday so a DST transition at midnight cannot collapse two
  days into one.
- **`Views/`** — `PlannerView` is the root and owns the single `selectedDate`;
  `MiniCalendarView` takes a `Binding<Date>` and `WeekPageView`/`DayRowView` derive from it,
  so both are pure functions of that one date. `DayRowView` builds its per-day `@Query` in
  `init` (predicates are fixed at view init) and computes the day's bounds outside the
  `#Predicate`, because `Calendar.startOfDay` cannot be called inside one.
- **`Holidays/`** — `HolidayService` (`@Observable`, injected through the environment) merges
  providers behind the `HolidayProviding` protocol and de-duplicates by name + day.
  `BuiltInHolidayProvider` computes US holidays from calendar rules and always renders;
  `EventKitHolidayProvider` is optional enrichment that returns `[]` on denial or error, so
  denying the calendar prompt leaves built-in holidays intact. The prompt strings live in the
  `INFOPLIST_KEY_NSCalendars*UsageDescription` build settings, since `GENERATE_INFOPLIST_FILE`
  is `YES` and there is no `Info.plist` file.
- **Two test targets**:
  - `SimplePlannerTests` — unit tests using the new **Swift Testing** framework
    (`import Testing`, `@Test func ...`, `#expect(...)`), not XCTest. `CalendarMathTests` and
    `HolidayTests` pin the date math against a fixed calendar + time zone rather than
    `Calendar.current`, so results are deterministic.
  - `SimplePlannerUITests` — UI automation tests using XCTest (`XCUIApplication`).
    `PlannerFlowUITests` covers the end-to-end flow: seven dated day sections, adding a task
    to one day only, surviving a relaunch, and holiday labels after navigating the mini
    calendar. It takes ~2 minutes.
- Deployment target: iOS 26.5. Swift 5.0 language mode with `SWIFT_APPROACHABLE_CONCURRENCY` and `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` enabled, so new code is MainActor-isolated by default.
- Bundle identifier prefix: `HogriderDavid.*`.
- `project.pbxproj` uses `objectVersion = 77` with `PBXFileSystemSynchronizedRootGroup`: new
  `.swift` files anywhere under `SimplePlanner/SimplePlanner/` are picked up automatically and
  deleting a file removes it from the build — **no pbxproj edits needed to add or remove
  sources**. Build settings still have to be edited there.

---

# Web app (`simple-planner/`)

Built to `docs/weekly-planner-nextjs.md`, all six phases. Deployed to **Vercel**, with Postgres
from the Vercel Marketplace (Neon) through **Drizzle ORM**, **Tailwind v4**, `date-fns` behind a
wrapper that pins `{ weekStartsOn: 1 }`, **Vitest** for units (queries run against PGlite),
**Playwright** for E2E, and no auth. See `simple-planner/README.md` for setup and the scripts
table.

## Commands

Run from `simple-planner/` (not the repo root). `node_modules/` is installed (and gitignored).

```bash
cd simple-planner
npm run dev      # next dev
npm run build    # next build
npm run lint     # eslint
npm test         # vitest run — 132 tests
npm run test:e2e # playwright — 17 tests against a production build on PGlite

# The dev server needs a database. Three drivers, chosen with DB_DRIVER:
#   pglite   — Postgres as WASM, in-process. No account, no network. Used by the test suites.
#   postgres — the standard wire protocol: Supabase, Railway, RDS, or a local Postgres.
#   neon     — the default; Neon's HTTP driver, which is what production runs.
DB_DRIVER=pglite PGLITE_DATA_DIR=.pglite/dev DATABASE_URL=pglite://.pglite/dev npm run dev
DB_DRIVER=postgres DATABASE_URL="postgres://$USER@127.0.0.1:5432/planner" npm run dev

# Migrations. db:generate needs a URL present but does not connect.
DATABASE_URL="postgres://localhost/placeholder" npx drizzle-kit generate --name=<name>
npm run db:migrate    # applies drizzle/*.sql to DATABASE_URL

npm run probe:fonts   # needs `npm run dev -- --port 3111` running first
```

All of the above were run and pass. `npm test` and `npm run test:e2e` need no network and no
Vercel account.

## The invariants

- **Monday-first is decided in one file.** `src/lib/calendar.ts` is the only module allowed to
  import `date-fns`, because it is the only one that passes `{ weekStartsOn: 1 }`; a component
  importing `startOfWeek` directly would silently get the locale default and render Sunday-first.
  An ESLint `no-restricted-imports` rule enforces this — adding a `date-fns` import anywhere else
  fails `npm run lint`.
- **Dates are `dayKey` strings, never timestamps.** `YYYY-MM-DD` in local civil time, built from
  `getFullYear/getMonth/getDate` and **never** `toISOString().slice(0, 10)`, which converts to UTC
  first and lands on the wrong day for anyone far enough east. This is deliberately different from
  the SwiftData design's `startOfDay` normalization: a normalized timestamp drifts when the
  server's zone differs from the browser's, and the same row would land under a different heading
  in different places. `src/lib/calendar.test.ts` runs its key cases under Pacific/Kiritimati,
  America/Los_Angeles, and UTC; that suite is what catches a stray `toISOString`.
- **The selected week lives in the URL** (`?week=`), not in React state, and the visible mini
  calendar month is a separate param (`?month=`) so paging months does not move the week page. The
  server never resolves "today" — `/` renders nothing date-dependent until `?week=` is present, a
  client component rewrites the URL from the browser's clock, and `TodayMarker` marks the cell
  after mount. E2E covers the real skew case: browser in Kiritimati, server in the host zone.
- **One file names a driver, one file imports Drizzle.** `src/db/index.ts` and
  `src/db/queries.ts`; everything else calls named query functions. Keep migrations to portable
  Postgres — the same ones run against Neon in production and PGlite in the tests, so a broken
  seam fails `npm test` rather than the migration. Verified on three backends: PGlite, a real
  Postgres 14 server, and the Neon code path.
- **`npm run db:migrate` uses `pg`, not the Neon driver**, and therefore works against any
  Postgres including Neon. `@neondatabase/serverless` speaks only to Neon over HTTP/WebSocket,
  and drizzle-kit will silently prefer it and then hang against a plain server if `pg` is not
  installed.
- **`drizzle.config.ts` loads `.env.local` itself.** `next dev` and `next build` do this on their
  own; drizzle-kit does not, so without it `npm run db:migrate` reports "no database connection
  string" on a machine that plainly has one. It uses Node's built-in `process.loadEnvFile`, which
  does *not* overwrite a value that is already set — so the first file loaded wins, `.env.local`
  is loaded before `.env` to outrank it, and an inline `DATABASE_URL=… npm run db:migrate` still
  outranks both.

## Deploying to Vercel

- **Root Directory must be `simple-planner`.** The repo root holds the iOS app and the docs; the
  Next app is one level down, and the build fails without this.
- **No Vercel CLI is needed.** Provision Postgres from the project's Storage tab, then copy
  `DATABASE_URL` from Settings → Environment Variables into a local `.env.local`. If a CLI is
  wanted it runs under `npx vercel` with no install.
- `DB_DRIVER` need not be set in production — it defaults to `neon`.
- Use the **pooled** connection string for the app and the direct/`_UNPOOLED` one for migrations.
  Serverless functions are the classic way to exhaust a Postgres connection limit.
- **Migrations run as a deploy step or by hand, never at request time** — on a serverless platform
  a migration inside a request handler runs once per cold start, concurrently, against the same
  schema. There is deliberately no `vercel-build` script yet: adding one makes every deploy write
  to whatever database that environment points at, including previews. That call is David's.
- **Preview deployments must not share the production database** — a Neon branch per preview is
  the least-effort version, and the thing most likely to be skipped and then regretted.
- **The app has no auth by decision**, so a public deployment is world-readable *and*
  world-writable — Server Actions are public endpoints. The fix is Vercel Deployment Protection, a
  project setting, not Neon Auth: Neon Auth manages users but does not gate routes, and it adds a
  Neon-specific `neon_auth` schema that cuts against the portable-Postgres rule.
- **Do not set a custom environment-variable prefix** on the Marketplace integration. `src/db/env.ts`
  looks for a fixed list of names and a prefix renames all of them; it is only worth it with two
  databases in one project, and it is a one-line change to that file if ever needed.
- **Nothing is ever written to disk.** Vercel Functions have no persistent filesystem; files go
  through the `BlobStore` interface in `src/storage/blob.ts`, which deliberately has no callers.
- **Migrations never run at request time** on the Neon path. `src/db/index.ts` does bootstrap the
  schema when the driver is `pglite`, because that in-process WASM backend starts empty every time
  and has no deploy step to hang a migration off.

## The six theme rules

Every one is something the browser does by default that `src/app/globals.css` switches off. The
radius scale, the blurred-shadow scale, the filter primitives, and the rem-based type scale are
all set to `initial` in the `@theme` block, so `rounded-md` and `text-sm` are not utilities that
exist to be typed by accident.

1. **Nothing is round** — `border-radius: 0`, including form controls and the focus ring.
2. **Nothing is blurred** — depth is `box-shadow: 4px 4px 0`, and any blur radius is a bug.
3. **Everything lands on the grid** — `--spacing: 4px` drives Tailwind's whole numeric scale.
4. **Borders are 2px, never 1px** — 1px half-blurs on the 1.5× displays most Android and Windows
   users have.
5. **Type is pixel type, unsmoothed**, at integer multiples of each face's design size.
6. **Raster stays raster** — `image-rendering: pixelated`; the slime SVG uses
   `shape-rendering="crispEdges"`, without which browsers antialias its rect edges.

The E2E suite asserts rules 1–4 from computed styles on the real week page at DPR 1, 1.5, and 2.
Pixel snapshots exist for the rest but are gated behind `PLAYWRIGHT_SNAPSHOTS=1` and meant to run
only in the pinned Playwright container image, because font rendering differs between a host and
CI — the command is in `playwright.config.ts`.

## The final font ladder

Measured, not assumed — `npm run probe:fonts` rasterizes each candidate size and reports how
uniform the stems came out. Because smoothing is off, an off-grid bitmap face does not go grey at
the edges; it goes lumpy.

| Role | Face | Design size | Rendered |
|---|---|---|---|
| Display — month name, weekday headers, date numbers | Silkscreen | 8px | 16 / 24 / 32 |
| Body — task text, inputs, holiday labels | Departure Mono | 11px | **22**, line-height 32 |

The plan's hypothesised 16px body was wrong: 16 is not a multiple of 11, and the probe puts it at
34% stem spread against 16% for 11/22/33. Both faces are vendored as `.woff2` with their `OFL.txt`
in `src/app/fonts/` and loaded with `next/font/local`, so the build needs no network.

## Things to know

- **Next.js 16.3.1 with Turbopack**, React 19.2, App Router, `src/` dir, `@/*` → `./src/*`.
  `searchParams` and `params` are Promises. This is a *much* newer Next.js than most training
  data — check `node_modules/next/dist/docs/` (which ships with the package) before writing App
  Router code.
- `simple-planner/AGENTS.md` carries a `<!-- BEGIN:nextjs-agent-rules -->` block that **`next dev`
  writes back automatically**. Deleting it from a diff only re-creates the uncommitted change —
  commit it along with the work. `simple-planner/CLAUDE.md` is a one-line `@AGENTS.md` import.
- **`src/app/specimen/` is dev-only** — it `notFound()`s in production, and an E2E test asserts
  the production build returns 404 for it. It renders every token, both faces at every ladder
  step, every primitive state, and all twelve slimes.
- **Vitest defaults to jsdom.** The date, holiday, slime, and database suites opt into node with a
  `// @vitest-environment node` docblock; PGlite needs real Node APIs for its WASM build, and the
  time-zone cases need `process.env.TZ` reassignment to take effect.
- **`@electric-sql/pglite` is a devDependency** listed in `serverExternalPackages`, so Next leaves
  it unbundled and the production Neon path never touches it.
- There are two `.gitignore`s: the repo-root one is Next-flavoured (left over from the initial
  commit) and `simple-planner/.gitignore` is the real one, covering `node_modules/`, `.next/`,
  `next-env.d.ts`, `.pglite/`, and the Playwright output directories.
