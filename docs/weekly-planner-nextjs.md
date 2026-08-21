# Weekly Planner: Next.js Implementation Plan

**Status:** Implemented — all six phases, on branch `feat/nextjs-weekly-planner`
**Date:** 2026-08-19 (pixel theme added 2026-08-20)
**Relationship to `weekly-planner-redesign.md`:** that document is the iOS/SwiftUI plan for the
same product. This is a **greenfield Next.js application** built to the same design, not a port
of the Swift source. The product decisions (Monday-first weeks, one `selectedDate` as the single
source of truth, day-keyed tasks, holidays printed inline) carry over; every platform mechanism
is replaced.

**The web app's *look* deliberately diverges.** The iOS app renders a literal paper planner. The
web app renders that same planner **at low resolution** — a pixel-art theme, described in full
under "Visual direction" below and built in Phase 3a. Nothing about the data model, date math, or
navigation changes because of it; the theme is a presentation layer with its own phase, tokens,
and tests.

## Context

The product is a web planner shaped like a paper weekly planner: a **mini month calendar** that
navigates between weeks, a **weekly page** where each day is its own dated section, and
**holidays** printed inline on their date. Tasks are dated records.

Nothing exists yet — this plan starts from `create-next-app`.

### Stack decisions

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router), TypeScript, React Server Components | Server-rendered week page; mutations via Server Actions instead of a REST layer |
| Hosting | **Vercel** | Given. Shapes persistence more than anything else in this table: functions are stateless and the filesystem is ephemeral, so nothing may be stored on disk. |
| Persistence | **Postgres**, provisioned through the **Vercel Marketplace** (Neon), accessed through **Drizzle ORM** | Vercel's own Postgres and KV products were retired in Dec 2024; Postgres now comes from Marketplace providers with credentials auto-injected as env vars. Drizzle keeps the schema in TypeScript, generates real migrations, and — the reason it matters here — makes the provider a one-file swap. |
| File storage | **Vercel Blob**, behind our own `BlobStore` interface — **not used yet** | The planner stores no files today. The interface exists so the first attachment does not become an architecture decision; see "Portability". |
| Auth | **None** | Explicitly out of scope. The app is single-user; every task row belongs to the one implicit user. No `userId` column, no session. |
| Styling | **Tailwind CSS v4**, hand-rolled components, **pixel theme** | The look is borders, spacing, and type — all of which a pixel theme makes *stricter*, not harder. No component library: every off-the-shelf kit ships rounded corners, blurred shadows, and fractional spacing, which is exactly what this theme has to strip back out. |
| Type | Two vendored **bitmap/pixel faces**, self-hosted via `next/font/local` | Pixel type is the theme. Vendored rather than `next/font/google` because that fetches at build time and this repo must build offline. See Phase 3a. |
| Dates | **`date-fns`** with an explicit `{ weekStartsOn: 1 }` option, wrapped in our own module | See "Date math" below |
| Unit tests | **Vitest** | Fast, no browser needed for the pure date/holiday logic |
| E2E tests | **Playwright** | Mirrors the role `SimplePlannerUITests` plays in the iOS plan |

### Hosting, data storage, and portability

**Deployed to Vercel; data in a Marketplace Postgres; files in Vercel Blob when there are any.**
The constraint that follows from Vercel is absolute and worth stating plainly: **Vercel Functions
have no persistent filesystem.** Anything written to disk vanishes when the function instance
does. That rules out the single-file SQLite design an earlier draft of this plan assumed, and it
is why persistence is a network service from Phase 2 onward.

Provisioning is one command, and Vercel injects the credentials into the project's environment:

```bash
vercel install neon      # or: vercel install supabase
```

#### Leaving room to change providers

The requirement is that swapping storage providers stays cheap. That is bought with three rules,
each of which costs almost nothing to follow now and a great deal to retrofit later:

1. **Exactly one file imports a database driver** — `src/db/index.ts`. Nothing else in the
   codebase names Neon, or Postgres, or a connection library.
2. **Exactly one module imports Drizzle** — `src/db/queries.ts`. Server Actions and components
   call named functions like `tasksForWeek(mondayKey)`; they do not know a query language exists.
3. **No provider-specific SQL.** Portable Postgres only: no vendor extensions, no provider-only
   functions, nothing in a migration that a stock Postgres would reject.

What each kind of move then costs:

| Move | Cost |
|---|---|
| Neon → Supabase / Railway / RDS / self-hosted Postgres | A connection string. Nothing in the codebase changes |
| Neon HTTP driver → a TCP/pooled driver | One import in `src/db/index.ts` |
| Postgres → a different database entirely | Rewrite `src/db/queries.ts` and the schema. Every caller is unaffected, because they only ever called functions |
| Vercel Blob → S3 / R2 / Supabase Storage | One implementation of `BlobStore` |

**The seam is tested, not just asserted.** Phase 2's test suite runs the real query functions
against **PGlite** — Postgres compiled to WASM, in-process — while production runs Neon. That
means a second backing implementation is exercised on every `npm test`, so the day the seam breaks
is the day the tests fail, not the day of the migration.

#### One env var, normalized once

Marketplace integrations inject several connection variables (`DATABASE_URL`, `POSTGRES_URL`,
pooled and unpooled variants). The app reads **`DATABASE_URL` only**, mapped from whatever the
provider supplies in a single place. A second provider that names its variable differently is
then a one-line change rather than a search across the codebase.

### Visual direction — the pixel theme

**Pixel-paper hybrid, pixel type throughout.** The ground stays a light paper page; everything
drawn on it is drawn on a pixel grid. This is not a CRT/arcade skin — there are no scanlines, no
glow, no dark saturated arcade palette. It is the same paper planner, rasterized.

```
┌─────────────────────────┐
│  JUL 2026        ◄  ►   │
│  M  T  W  T  F  S  S    │
│        1  2  3  4  5    │
│  6  7  8  9 10 11 12    │
└─────────────────────────┘
▛▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▜
 WED  1                    
  ▣ ship the thing         
  ▢ water plants           
▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▟
```

Six rules define the theme. Every one of them is a thing the browser does by default that we are
switching **off**, which is why the theme is cheap to build and easy to violate by accident:

| Rule | Concretely |
|---|---|
| **Nothing is round** | `border-radius: 0` everywhere, no exceptions — including the checkbox, the focus ring, and the form inputs |
| **Nothing is blurred** | No `box-shadow` blur radius and no `filter`. Depth is a hard offset shadow: `box-shadow: 4px 4px 0 var(--color-ink)` |
| **Everything lands on the grid** | One pixel unit — 4px. Every size, gap, padding, border, and font size is an integer multiple of it. No `0.5` anything |
| **Borders are 2px, never 1px** | A 1px border disappears or half-blurs on the 1.5× displays most Android and Windows users have. 2px survives |
| **Type is pixel type, unsmoothed** | Both faces are bitmap-derived and rendered with font smoothing off, at integer multiples of their design size |
| **Raster stays raster** | `image-rendering: pixelated` on every image, icon, and the favicon, so nothing gets interpolated back into softness |

**Type applies to everything, including task text** — the user's answer to the readability
tradeoff. The mitigation is in the sizing ladder rather than in a fallback sans: body text is
never rendered below 16px, and line-height is a fixed integer (24px), which is also what keeps
task rows on the 4px grid.

**Contrast is the risk this theme carries.** Pixel palettes drift toward mid-tone greys that look
right next to a chunky border and fail WCAG AA on their own. The palette is therefore validated
in Phase 3a rather than eyeballed, and re-checked by an automated pass in Phase 6.

**One mascot, twelve colors.** The theme's one piece of character art is a slime, drawn on the
same pixel grid as everything else. The user picks one of twelve; it sits in the week header and
its color becomes the app's accent. Full spec in Phase 5.

**Dark mode is tokenized but not shipped.** Every color is a token from day one so a "night
paper" ramp is a later drop-in, but building and testing a second palette is out of scope here.

### The constraint that shapes this plan

The iOS plan was phased because it could not be built from the command line. **That constraint
does not exist here** — `npm run dev`, `vitest`, and `playwright test` all run locally and in CI.
So the phases below exist only to keep review batches small and each one independently
verifiable, and each phase ends with commands that must actually pass before the next begins.

The one genuinely new hazard is **server/client time zone skew**: the server renders "today" in
the server's zone, the browser hydrates in the user's. This is the web equivalent of the DST
off-by-one the Swift plan calls out, and it is handled explicitly in Phase 1.

---

## Phase 0 — Project scaffold

```bash
npx create-next-app@latest simple-planner-web \
  --typescript --app --tailwind --eslint --src-dir --import-alias "@/*" --no-turbopack
cd simple-planner-web
npm i drizzle-orm @neondatabase/serverless date-fns
npm i -D drizzle-kit vitest @vitejs/plugin-react \
        @testing-library/react @testing-library/jest-dom jsdom @playwright/test \
        @axe-core/playwright @electric-sql/pglite
npx playwright install chromium

# Provision Postgres and pull its credentials into .env.local
vercel link
vercel install neon
vercel env pull .env.local
```

Also in this phase:
- `vitest.config.ts` — `environment: 'jsdom'`, path alias `@/` matching `tsconfig.json`.
- `playwright.config.ts` — `webServer` block that runs `npm run build && npm run start` with
  `DB_DRIVER=pglite` and a throwaway data directory, so E2E never touches the real database and
  needs no network. This is the portability seam doing real work rather than being decorative.
- `package.json` scripts: `dev`, `build`, `start`, `test` (vitest run), `test:watch`, `test:e2e`,
  `db:generate`, `db:migrate`.
- `.gitignore`: `.env*.local` (already present from `create-next-app`) and `.pglite/` for the
  local/E2E data directories. **No database file is ever committed or deployed.**
- Delete the `create-next-app` boilerplate page, CSS demo classes, and SVG assets — including
  `src/app/favicon.ico` and all five stock SVGs in `public/`. The theme replaces them in Phase 3a.
- Leave `globals.css` as a near-empty Tailwind entry point. The `@theme` block lands in Phase 3a,
  not now, so the theme arrives as one reviewable diff.

**Verify:** `npm run build` succeeds and `npm test` runs with zero tests.

---

## Phase 1 — Date math (pure, no React)

This lands first and alone, because everything else is a function of it and it is the part most
likely to be subtly wrong.

### Files

| File | Purpose |
|---|---|
| `src/lib/calendar.ts` | `startOfWeekMonday(date)`, `daysOfWeek(date) → Date[7]`, `monthGrid(date) → (Date \| null)[][]`, `weekdayHeaders() → ['M','T','W','T','F','S','S']`, `dayKey(date) → 'YYYY-MM-DD'`, `parseDayKey(key) → Date`, `formatWeekRange(date) → string` |

### Design decisions

- **Monday-first, once.** Every `date-fns` call that takes `weekStartsOn` goes through this module
  with `{ weekStartsOn: 1 }` hard-coded. No component ever imports `startOfWeek` from `date-fns`
  directly — an ESLint `no-restricted-imports` rule enforces it. This is the direct analogue of
  the Swift plan's single `firstWeekday` constant.
- **`dayKey` is the join key, not a `Date`.** Tasks are stored and queried by a `YYYY-MM-DD`
  **string** in local civil time, never by a timestamp. This is deliberately *different* from the
  SwiftData design (`startOfDay` normalization on write): a timestamp normalized on the server
  drifts by up to a day when the server's zone differs from the browser's, and the same row would
  land under a different heading in different places. A civil-date string has no zone and cannot
  drift. `dayKey` is computed with local `getFullYear/getMonth/getDate`, never
  `toISOString().slice(0,10)`, which converts to UTC first and is off by a day for half the world.
- **`parseDayKey` builds `new Date(y, m-1, d)`** (local noon internally for arithmetic), not
  `new Date('2026-07-04')`, which the spec parses as UTC midnight.
- **`monthGrid` returns `null` for padding cells** rather than adjacent-month dates, so the grid
  renderer never has to decide whether a cell is "in" the month.

### The Next.js detail that will bite

**The server does not know the user's time zone.** If the root page computes "today" during SSR,
a user in UTC+13 can be shown yesterday's week, and React will log a hydration mismatch when the
client disagrees.

Resolution, applied throughout: **the selected week is a URL search param**, and "today" is only
ever resolved on the client.

- `/` is a Server Component that reads `?week=YYYY-MM-DD` (a Monday `dayKey`).
- If `week` is absent, `/` renders nothing date-dependent and a tiny client component immediately
  `router.replace`s to `?week=` + this week's Monday computed from the **browser's** clock.
- Once `week` is present the server render is fully deterministic — same output everywhere — and
  every later navigation is a normal server-rendered URL change.
- Only "is this cell today?" highlighting stays client-side, applied after mount, so it can never
  cause a mismatch.

### Tests — `src/lib/calendar.test.ts`

Ported one-for-one from the Swift plan's `CalendarMathTests`, plus the web-specific hazards:
- `daysOfWeek` returns 7 consecutive days always starting Monday — including when the input is
  itself a **Sunday** (the off-by-one this design is most likely to hit)
- the reference week: any date in it yields Mon 2026-06-29 → Sun 2026-07-05
- `monthGrid` for July 2026 puts the 1st in the Wednesday column under an `M T W T F S S` header
- weeks spanning a month boundary and a year boundary
- `monthGrid` leading/trailing `null` padding for a month starting mid-week
- a DST-transition week still yields 7 **distinct** `dayKey`s (US spring-forward and fall-back)
- `dayKey(parseDayKey(k)) === k` round-trips for a year of dates
- **`dayKey` is stable across time zones**: run the suite's key cases with `process.env.TZ` set to
  `Pacific/Kiritimati` (UTC+14), `America/Los_Angeles`, and `UTC` and assert identical output.
  This is the test that would catch a stray `toISOString()`.

**Verify:** `npm test` — all green, no React involved yet.

---

## Phase 2 — Persistence and Server Actions

### Files

| File | Purpose |
|---|---|
| `src/db/schema.ts` | Drizzle `pgTable` `tasks`: `id` (`integer generated always as identity`, pk), `title` (`text` not null), `dayKey` (`text` not null), `isCompleted` (`boolean` not null default false), `createdAt` (`timestamptz` not null default `now()`). Index on `dayKey`. Portable Postgres — nothing provider-specific. |
| `src/db/index.ts` | **The only file that names a driver.** Reads `DATABASE_URL`, picks an implementation from `DB_DRIVER` (`neon` in production, `pglite` in tests and E2E), exports the Drizzle instance. Cached on `globalThis` so Next's dev hot-reload does not open a new client per edit. |
| `src/db/env.ts` | Normalizes whatever the Marketplace integration injected (`DATABASE_URL`, `POSTGRES_URL`, pooled variants) down to one `DATABASE_URL`, and throws a readable error if none is set |
| `src/storage/blob.ts` | The `BlobStore` interface — `put(key, data) → url`, `url(key)`, `delete(key)` — plus a `VercelBlobStore`. **No caller yet**; it exists so the first attachment is a one-file decision, not an architecture one |
| `drizzle.config.ts` | Points drizzle-kit at the schema and `./drizzle` migrations dir, dialect `postgresql` |
| `src/app/actions.ts` | `'use server'` — `addTask(dayKey, title)`, `toggleTask(id)`, `deleteTask(id)`, each ending in `revalidatePath('/')` |
| `src/db/queries.ts` | `tasksForWeek(mondayKey) → Record<dayKey, Task[]>` — **one** query for the whole week |

### Design decisions

- **One query per week, not per day.** The iOS plan gives each `DayRowView` its own `@Query`
  because SwiftData binds predicates at view init. Here the opposite is right: the week page is a
  Server Component, so it fetches all seven days in a single
  `WHERE dayKey IN (...7 keys...) ORDER BY createdAt` and groups in memory. Seven round-trips
  would be seven times the work for the same result.
- **Server Actions, not route handlers.** No `/api` directory. Forms post directly to actions;
  `revalidatePath('/')` re-renders the week.
- **`dayKey` is passed from the client** as a string, because only the client knows the user's
  civil date. The action validates the `^\d{4}-\d{2}-\d{2}$` shape and rejects anything else —
  it is user input reaching a query.
- **Migrations are checked in.** `npm run db:generate` writes SQL into `drizzle/`;
  `npm run db:migrate` applies it. The dev server does not migrate implicitly, and **migrations
  never run at request time** — on a serverless platform that would mean every cold start racing
  every other cold start to alter the same schema. They run as a deliberate step; see Phase 6.
- **`drizzle-orm/neon-http` is the production driver.** Every mutation here is a single statement
  and every read is a single query, so the HTTP driver's one real limitation — **no interactive
  transactions** — costs nothing, and it avoids holding a TCP connection open from a function that
  may live for milliseconds. If a multi-statement transaction is ever genuinely needed, the escape
  hatch is `drizzle-orm/neon-serverless` (WebSocket), which does support them: one import change,
  in the one file allowed to have driver imports.
- **Connection reuse over connection pooling.** Serverless functions are the classic way to
  exhaust a Postgres connection limit. The HTTP driver sidesteps the problem rather than managing
  it; a future TCP driver must use the provider's **pooled** connection string, not the direct one.
- **No `userId`, no auth** — per decision. Noted here so the omission reads as intentional.
- **`src/storage/blob.ts` ships unused, deliberately.** It is ten lines and one interface. The
  alternative — reaching for `@vercel/blob` directly at the first file upload — is how a storage
  provider gets welded into a component.

### Tests — `src/db/queries.test.ts`

- Against **PGlite** (`@electric-sql/pglite`, Postgres as WASM, in-process) with the real checked-in
  migrations applied in `beforeEach`. No Docker, no network, no test database to provision — and,
  because it is genuinely Postgres, the migrations under test are the ones that will run in
  production, which an SQLite stand-in could never guarantee
- `tasksForWeek` groups tasks under the right day and returns empty arrays, not `undefined`, for
  days with no tasks
- a task with a `dayKey` outside the week is not returned
- ordering within a day is by `createdAt`
- `addTask` rejects a malformed `dayKey`; `toggleTask` on a missing id is a no-op, not a throw
- `src/db/env.ts` resolves `DATABASE_URL` from each variable name a provider might inject, and
  throws a clear error when none is present — the failure that otherwise surfaces as an
  unreadable driver stack trace on first deploy

**Verify:** `npm test` — date math and persistence both green, still no UI. Then
`npm run db:migrate` against the real Neon database and confirm the tables exist in the Vercel
dashboard's storage view: the same migrations, on both backends, is the portability claim being
checked rather than assumed.

---

## Phase 3 — Pixel theme and UI

Split in two so the theme is reviewable on its own. **3a builds the theme against a specimen page
with no application logic in it; 3b builds the real screens out of 3a's primitives.** Doing it in
the other order means retrofitting a theme across nine components.

---

### Phase 3a — Theme foundation

#### Fonts

Two OFL-licensed pixel faces, **vendored as `.woff2` into `src/app/fonts/` with their `OFL.txt`
alongside**, loaded through `next/font/local`:

| Role | Face | Native design size | Rendered ladder (final) |
|---|---|---|---|
| Display — month name, weekday headers, date numbers | **Silkscreen** | 8px | 16 / 24 / 32 |
| Body — task text, buttons, inputs, holiday labels | **Departure Mono** | 11px | **22** (line-height 32) |

`next/font/local` self-hosts and emits `size-adjust` metrics, so there is no FOUT jump and no
network request at runtime — the reason to prefer it over `next/font/google`, which fetches at
**build** time and would break the offline build this repo currently has.

> **Settled, by measurement.** The hypothesised 16px body was wrong, exactly as this note
> anticipated: 16 is not a multiple of 11. Because font smoothing is off, an off-grid bitmap face
> does not go grey at the edges — it stays hard-edged and goes *lumpy*, some stems rounding to one
> pixel and some to two. So the specimen was checked by rasterizing a string at each candidate
> size in headless Chromium and measuring the spread of horizontal ink run-lengths, where a low
> spread means every stem came out the same width:
>
> | Face | On-grid sizes | Off-grid sizes |
> |---|---|---|
> | Silkscreen (8px) | 8px 24% · 16px 24% · 24px 24% · 32px 24% | 12px 32% · 20px 29% |
> | Departure Mono (11px) | 11px 16% · 22px 16% · 33px 16% | 16px 34% · 20px 54% · 24px 53% |
>
> Each face's on-grid sizes all land on one identical figure — its baseline, from genuine
> variation between glyphs — and every off-grid size sits well above it. **Body text is therefore
> 22px, the first multiple of 11 at or above the 16px readability floor, on a 32px line-height**
> (24px would clip: Departure Mono's ascent-plus-descent is 1.27em, so 22px type needs a 28px
> content box). The display ladder is confirmed unchanged at 16 / 24 / 32.

#### Files

| File | Purpose |
|---|---|
| `src/app/globals.css` | The whole theme, as a Tailwind v4 `@theme` block: color tokens, `--spacing: 4px`, `--radius-*: 0`, the font variables, plus a small base layer for the global resets (`image-rendering`, font smoothing) |
| `src/app/fonts/` | The two vendored `.woff2` files and their licenses |
| `src/app/layout.tsx` | Root layout. Loads both faces with `next/font/local`, puts their CSS variables on `<html>`, sets the paper background and base type |
| `src/components/ui/PixelFrame.tsx` | The bordered box every surface is made of: 2px border, square corners, optional hard offset shadow. The mini calendar, each day section, and the dialog-less add form are all this component |
| `src/components/ui/PixelButton.tsx` | Square, 2px border, hard shadow that *moves* on `:active` (offset → 0) instead of animating — the pixel equivalent of a press |
| `src/components/ui/PixelCheckbox.tsx` | A real `<input type="checkbox">` with `appearance: none`, styled box, and a drawn check glyph. Keeps native keyboard and screen-reader behavior |
| `src/app/specimen/page.tsx` | Dev-only page rendering every token, both faces at every step of the ladder, and every primitive in every state, including all twelve slimes. Deleted, or excluded from the production build, before Phase 6 |

#### Design decisions

- **Tailwind v4's `--spacing` variable is the pixel grid.** In v4 the entire numeric spacing scale
  is derived from one `--spacing` base, so setting `--spacing: 4px` in `@theme` makes `p-2` = 8px,
  `gap-3` = 12px, and so on — every utility in the codebase lands on the grid automatically, with
  no per-class discipline required. This single line is what makes the "everything on the grid"
  rule enforceable rather than aspirational.
- **The theme is CSS tokens, not component props.** No `variant="pixel"` anywhere. Swapping the
  palette later is an edit to one `@theme` block.
- **Font smoothing off** — `-webkit-font-smoothing: none` and `font-smooth: never` on `html`.
  Antialiasing a bitmap face is the single most common way a pixel theme ends up looking soft.
- **Depth is offset, not blur.** `box-shadow: 4px 4px 0` and nothing else. Any blur radius in the
  codebase is a bug.
- **Palette is validated, not chosen by eye.** Four ink tones on one paper ground; each is checked
  against its background for **4.5:1** (body) or **3:1** (borders and large display type) before
  it goes in the token block. Contrast is where a mid-tone pixel palette silently fails.
- **Motion is stepped or absent.** No eased transitions. Where something must move, it moves in
  4px jumps via `steps()`, and all of it is disabled under `prefers-reduced-motion`.
- **The focus ring is load-bearing and square**: `outline: 2px solid var(--color-ink); outline-offset: 2px`.
  It is the only affordance a keyboard user gets on a theme with no hover elevation, so it is
  never removed and never blurred.

#### The rendering detail that will bite

**Fractional device pixel ratios.** On a 1.5× display — most mid-range Android and any Windows
laptop at 150% scaling — a 1px CSS border straddles a physical pixel boundary and renders as two
grey half-pixels, and bitmap glyphs pick up interpolation the theme exists to avoid. This is why
borders are 2px minimum and why the ladder is verified at DPR 1, 1.5, and 2 rather than only on
the retina display it will be developed on.

The second-order version: browser zoom does the same thing at 110% / 125%. It is not fixable, and
the theme should degrade to "slightly soft", never to "broken" — which it does, as long as nothing
depends on a 1px line being visible.

#### Verify

`npm run dev`, open `/specimen`, and check at DPR 1, 1.5, and 2 (Chrome DevTools device toolbar):
1. Both faces are crisp — no grey fringing on glyph edges — at every size in the ladder. **Fix the
   ladder here if not**, and update the font table above.
2. No rounded corner, no blurred shadow, and no fractional size anywhere on the page.
3. Every token pair passes its contrast target (DevTools reports it per element).
4. Tab through the primitives: the focus ring is visible on every one of them.

---

### Phase 3b — Week page and mini calendar

#### Files

| File | Purpose |
|---|---|
| `src/app/page.tsx` | **Server Component.** Reads `searchParams.week`; if missing renders `<WeekRedirect />` and nothing else. Otherwise calls `tasksForWeek`, computes holidays, renders `<MiniCalendar />` + `<WeekPage />`. |
| `src/app/week-redirect.tsx` | `'use client'` — resolves this week's Monday from the browser clock and `router.replace`s. Renders a skeleton, never a date. |
| `src/components/MiniCalendar.tsx` | Month grid from `monthGrid`, wrapped in a `<PixelFrame>`. Prev/next month are `<Link>`s to `?week=…&month=…` styled as `PixelButton`s; each day cell is a `<Link>` to that day's `?week=`. Server-rendered — no state at all. Cells are a fixed 32×32 so the grid is square and on-grid. |
| `src/components/TodayMarker.tsx` | `'use client'` — after mount, marks the matching cell. Isolated so hydration can never mismatch. |
| `src/components/WeekPage.tsx` | Week range header + seven `<DaySection />` |
| `src/components/DaySection.tsx` | One `<PixelFrame>` per day: date number, weekday name, inline holiday label, task list, add form |
| `src/components/TaskItem.tsx` | `'use client'` — `PixelCheckbox` and delete, each a Server Action bound to the id, wrapped in `useOptimistic` so the row responds instantly |
| `src/components/AddTaskForm.tsx` | `'use client'` — `<form action={addTask.bind(null, dayKey)}>`, clears via `useRef` on submit, optimistic append. The input is square, 2px-bordered, and inherits the body face — no browser default styling survives |

#### Design decisions

- **`selectedDate` lives in the URL, not in React state.** The Swift plan's "one `selectedDate`
  owned by the root view" becomes one `?week=` param owned by the router. Both the mini calendar
  and the week page derive from it, so they cannot disagree — same invariant, better property:
  the state is shareable, bookmarkable, and survives reload.
- **Server Components by default.** Only the four files above marked `'use client'` ship JS. The
  calendar grid, week page and day sections are static HTML.
- **Optimistic updates** (`useOptimistic`) on add/toggle/delete. Without them every checkbox tick
  waits for a server round-trip, which reads as lag in a way the native app never had.
- **Mini calendar month ≠ selected week.** Paging to another month must not move the week page —
  it only changes what the grid shows, so `?month=` is a separate param that defaults to the
  selected week's month.
- **No component defines its own border, radius, shadow, or font size.** Surfaces come from
  `PixelFrame`, controls from `PixelButton`/`PixelCheckbox`, sizes from the spacing scale. A
  component reaching for a raw pixel value is the signal that a primitive is missing.
- **"Today" and "selected week" are marked by *fill*, not by a ring.** A ring on a 32px square
  cell competes with the grid's own 2px borders and reads as noise; inverting the cell (paper ink
  swapped) is unambiguous at any DPR. This also keeps `TodayMarker` a one-class change.
- **Completed tasks get a strikethrough drawn as a 2px border**, not `text-decoration:
  line-through`, whose thickness is font-derived and lands off-grid.

#### Tests

`src/components/*.test.tsx` (Vitest + Testing Library), on the pure-render pieces:
- `WeekPage` renders exactly seven sections, in Mon→Sun order, with the right date numbers
- `MiniCalendar` marks the selected week's cells and links each day to the correct `?week=`
- `DaySection` renders a holiday label when given one and nothing when not
- `TaskItem` renders a real `<input type="checkbox">` that is reachable by role and label — the
  regression guard for `PixelCheckbox` ever being rebuilt as a styled `<div>`

**Verify:** `npm test`, then `npm run dev` and check by hand:
1. `/` redirects to `/?week=` this Monday
2. Seven dated day sections for the current week
3. Adding a task under one day makes it appear under that day and no other
4. Reload — tasks persist
5. Clicking a date in the mini calendar switches the week page to that week
6. Paging to another month and clicking a date navigates correctly
7. Editing `?week=` in the address bar directly works
8. The whole page still obeys the six theme rules — nothing round, nothing blurred, nothing
   off-grid — now that it is real content rather than the specimen page

---

## Phase 4 — Holidays

**Computed built-in US holidays only.** No API, no network, no provider negotiation — the web has
no EventKit equivalent, and a static ruleset is exact, offline, instant, and fully unit-testable.

### Files

| File | Purpose |
|---|---|
| `src/lib/holidays.ts` | `holidaysForYear(year) → Holiday[]` and `holidaysByDayKey(mondayKey) → Record<string, string[]>`. Fixed-date: New Year's Day, Juneteenth, Independence Day, Veterans Day, Christmas. Nth-weekday: MLK (3rd Mon Jan), Presidents' Day (3rd Mon Feb), Memorial (last Mon May), Labor (1st Mon Sep), Columbus/Indigenous Peoples' (2nd Mon Oct), Thanksgiving (4th Thu Nov). |

### Design decisions

- **Keyed by `dayKey`**, same as tasks, so the week page does one lookup per day with no date
  comparison at render time.
- **Observed dates are not computed.** July 4 2026 falls on a Saturday; the planner prints the
  holiday on the 4th, matching a paper planner. Asserted in tests so it reads as a decision.
- Results are memoized per year in a module-level `Map` — the ruleset is deterministic and the
  same three years get asked for repeatedly.
- **Rendering, in theme:** an uppercase, letter-spaced label in the body face on the day's header
  line, prefixed with a drawn pixel glyph — *not* italic, which a bitmap face either lacks
  entirely or fakes by shearing the bitmap into mush. On the mini calendar, a holiday date gets a
  2×2px square under the number rather than a round dot.

### Tests — `src/lib/holidays.test.ts`

- known dates for several years: Thanksgiving 2026 = Nov 26, MLK 2027 = Jan 18, Memorial 2026 =
  May 25 (**last** Monday, not 4th — the rule most likely to be coded wrong)
- July 4 2026 asserts the raw date (Saturday), not an observed Friday
- nth-weekday math across a leap year and a year where the month starts on the target weekday
- a day with no holiday returns `[]`, and `holidaysByDayKey` covers all seven days of the week

**Verify:** `npm test`, then navigate to July 2026 → "Independence Day" prints on the 4th.

---

## Phase 5 — Slimes (pick-your-mascot)

The personalization layer, and the theme's only character art. Lands after holidays because it
needs Phase 3a's primitives and Phase 2's database, and because nothing else depends on it — if
it slips, the planner still ships.

**What it is:** twelve slimes, the user picks one, it appears in the week header and its color
becomes the accent. **What it is not:** a collection, a progression system, or a reactive pet.
One stored preference, one sprite component, one picker.

### The sprite

One shape, twelve fills. The slime is a **16×14 pixel grid** authored as inline SVG — not a PNG
sprite sheet — using four token slots: outline, base, highlight, shade.

```
      0123456789012345
  0   .....######.....
  1   ...##HHHHOO##...
  2   ..#HHHHOOOOOO#..
  3   .#HHHOOOOOOOOO#.
  4   #HHOOOOOOOOOOOO#
  5   #HOO##OOOO##OOO#     # outline    H highlight
  6   #OOO##OOOO##OOO#     O base       S shade
  7   #OOOOOOOOOOOOOO#
  8   #OOO#OOOOOO#OOO#
  9   #OOOO######OOOO#
 10   #SSSSSSSSSSSSSS#
 11   #SSSSSSSSSSSSSS#
 12   ################
```

Eyes at rows 5–6, mouth at rows 8–9, shade band at rows 10–11 — the same read as the reference
art: a flat-bottomed dome with a dark underside and a simple face.

**Why SVG rather than the reference PNG:**
- **It recolors from tokens.** Twelve variants are twelve token triples against one shape, so a
  thirteenth slime is three CSS values, not a new asset and a new sprite-sheet offset.
- **It stays crisp at fractional DPR.** Integer-coordinate rects are resolution-independent,
  which sidesteps the 1.5× hazard Phase 3a calls out for raster assets entirely.
- **No license question.** Hand-authored art ships without needing to trace the provenance of a
  stock sprite sheet.

### The SVG detail that will bite

**`shape-rendering="crispEdges"` is mandatory on the sprite.** Browsers antialias SVG rect edges
by default, so without it the slime renders with soft grey fringes — the exact softness
`image-rendering: pixelated` exists to prevent on the raster side, arriving through the back door.
It is one attribute, and forgetting it is the single most likely way this sprite ends up looking
wrong.

Alongside it: **every coordinate is an integer**, and the sprite renders only at integer multiples
of its native size — 32×28 in the header (2×), 16×14 in the picker swatches (1×). Never 1.5×.

### Files

| File | Purpose |
|---|---|
| `src/lib/slimes.ts` | The twelve variants: stable string ids (`plum`, `rose`, `sky`, `teal`, `lemon`, `peach`, `cherry`, `cream`, `bubblegum`, `moss`, `midnight`, `amber`) each mapping to a base/highlight/shade token triple, plus `isSlimeId()` for validating what comes back from the client |
| `src/components/ui/Slime.tsx` | The sprite. Takes a slime id and a scale; emits the grid above as `<rect>`s with `shape-rendering="crispEdges"`. Server Component — no JS ships for it |
| `src/components/SlimePicker.tsx` | `'use client'` — a `PixelFrame` holding twelve `<Slime>` swatches as a real radio group, each submitting `setSlime` |
| `src/db/schema.ts` | Adds a `settings` `pgTable` (`key` text pk, `value` text not null). Ships its **own migration** — Phase 2's migration is already applied to the deployed database and is never edited in place |
| `src/db/queries.ts` | `getSlime() → SlimeId` (returns the default when unset — never `null`, so no caller branches) |
| `src/app/actions.ts` | `setSlime(id)` — validates against `isSlimeId` before writing, then `revalidatePath('/')` |
| `src/components/WeekPage.tsx` | Renders the chosen slime beside the week-range header |

### Design decisions

- **The preference lives in the database, not in `localStorage`.** `localStorage` is readable only
  after mount, which would force the header to be a Client Component and reintroduce exactly the
  hydration mismatch Phase 1 was designed around — the server would render one slime and the
  browser would swap it. A server-side read keeps the header static HTML.
- **Not a cookie either.** A cookie is per-browser, so clearing site data would lose the slime
  while the tasks survived. In a single-user app that already has a database, the one preference
  belongs next to the data.
- **A generic `settings` table, not a `slimeColor` column somewhere.** One key/value table absorbs
  the next preference without a schema change, and there is no row to attach it to — there is no
  user table, by decision.
- **Slime colors are a separate token family from the ink/paper ramp, and are fill-only.** Several
  of the twelve (lemon, cream, peach) cannot carry text on paper at 4.5:1 and never will. The rule
  that keeps this safe: **a slime token is never a text color and never sits behind text.** The
  accent appears as the slime itself, a 2px rule under the week header, and the holiday square —
  all non-text marks, all checked at 3:1.
- **The sprite is `aria-hidden` in the header** — it is decoration, and announcing "teal slime"
  before every week range is noise. In the picker it is the opposite: each swatch is a real
  `<input type="radio">` with a visible-on-focus square ring and an accessible name.
- **The picker sits under the mini calendar**, inline. No modal, no settings route — twelve 16px
  swatches fit in one row of the sidebar, and a whole screen for one preference is not warranted.
- **Default slime: `teal`.** Chosen because it clears 3:1 on paper, so a user who never opens the
  picker still gets a correctly-contrasting accent.

### Tests

`src/lib/slimes.test.ts` and `src/components/Slime.test.tsx`:
- all twelve ids are unique, and every variant defines all three tokens
- `isSlimeId` rejects unknown strings — it guards a value that arrives from the client
- **the rendered SVG contains no fractional coordinate** (assert no `\d\.\d` in any `x`/`y`/
  `width`/`height`), the guard against someone nudging the sprite off-grid
- the rendered SVG carries `shape-rendering="crispEdges"` — cheap, and it is the failure that is
  invisible in a unit test otherwise
- `SlimePicker` renders twelve radios, each with an accessible name

`src/db/queries.test.ts` gains:
- `getSlime` returns the default on a fresh database, and the stored value after `setSlime`
- `setSlime` with a bogus id throws and writes nothing

**Verify:** `npm test`, then `npm run dev`:
1. The default slime renders in the week header, crisp, at 2× with no grey fringing
2. Picking a different slime updates the header and the accent rule immediately
3. Reload — the choice persists
4. Tab into the picker: the focused swatch has a visible square ring, arrow keys move between
   slimes (native radio-group behavior, intact)

---

## Phase 6 — End-to-end and ship

### `e2e/planner.spec.ts` (Playwright)

Mirrors `PlannerFlowUITests`, run against a production build with `DB_DRIVER=pglite` and a
throwaway data directory — no network, no Vercel account, no shared database:
1. `/` lands on the current week with seven dated sections
2. Adding a task to Wednesday puts it under Wednesday and no other day
3. Reload — the task is still there (real persistence, not a client cache)
4. Toggling completion survives a reload; deleting removes it
5. Navigating the mini calendar to July 2026 shows "Independence Day" on the 4th
6. Deep-linking `?week=2026-06-29` renders Mon 29 → Sun 5 directly
7. `TZ=Pacific/Kiritimati npx playwright test` passes identically — the skew guard, end to end

### Theme regression guards (Playwright, same spec file)

The theme has no unit tests worth writing — it is CSS — so it is guarded at the end instead:

8. **Visual snapshot** of the week page via `toHaveScreenshot()`, captured at
   `deviceScaleFactor: 1` **and** `2`, on the deep-linked `?week=2026-06-29` so the content is
   fixed and the shot is deterministic. This is what catches a stray `rounded-md` or a blurred
   shadow arriving in a later change.
9. **Contrast and roles**, via `@axe-core/playwright` on the same page: zero violations. Aimed
   squarely at the two failure modes this theme invites — a mid-tone palette that drops below
   4.5:1, and a `PixelCheckbox` that lost its real `<input>`.
10. **Reduced motion**: with `page.emulateMedia({ reducedMotion: 'reduce' })`, the press states
   still work and nothing animates.
11. **Slime persistence**: pick a slime other than the default, reload, and the header still shows
   it — the same real-persistence check step 3 makes for tasks, since both now come from the
   database. The visual snapshot in step 8 pins the default slime, so this test sets and then
   restores it.

Snapshots are committed. A font-rendering difference between a developer's machine and CI will
make them flap, so they run **only in the Playwright container image**, pinned in
`playwright.config.ts` — not on the host.

### Ship checklist

- `npm run build && npm test && npm run test:e2e` all green
- `README.md`: setup, `db:migrate`, the scripts table
- `CLAUDE.md` for this repo: commands **that were actually run**, the Monday-first invariant, the
  `dayKey`-not-timestamp rule, the no-direct-`date-fns`-import rule, and the six theme rules with
  the final font ladder from Phase 3a
- `/specimen` is removed from the production build, and the vendored fonts' `OFL.txt` files ship
  with the app
- Both migrations (Phase 2's `tasks`, Phase 5's `settings`) are checked in and apply cleanly to an
  empty database in order
### Deploying to Vercel

- **Environment variables**: `DATABASE_URL` resolved by `src/db/env.ts` from what `vercel install
  neon` injected. Set for Production, Preview, and Development. Nothing else is required — the app
  has no secrets of its own.
- **Migrations run as a deploy step, not at request time.** Add `"db:migrate"` to a
  `vercel-build`/`buildCommand` chain, or run it from CI against the production database before
  promoting. A migration executed inside a request handler on a serverless platform runs once per
  cold start, concurrently, against the same schema.
- **Preview deployments must not share the production database.** Point Preview at a separate
  database — a Neon branch per preview is the least-effort version, and it is the thing most
  likely to be skipped and then regretted after a preview deploy deletes real tasks.
- **Region**: put the database in the region the functions run in. A planner is
  read-heavy-per-page (one query for the week, one for settings), so a cross-region hop is felt on
  every navigation.
- **What still runs locally**: `npm test` (PGlite) and `npm run test:e2e` (PGlite) need no network
  and no Vercel account, so CI does not need database credentials.

### Provider-portability check (do this once, before shipping)

The whole point of the seam is that it is cheap to leave. Prove it while it is still easy:
swap `DB_DRIVER` to `pglite`, run the full E2E suite, and confirm it passes. The suite already
does this, which means **the app has been run end-to-end on two different Postgres backends
before it ever ships** — the claim in "Portability" is a test result, not an intention.

---

## Out of scope

- Authentication and multi-user data (explicit decision — no `userId` anywhere)
- Full month view or a tab switcher; the mini calendar is a navigator
- Free-form lined note areas per day; day sections are task lists
- Recurring tasks, reminders, notifications, sync
- Drag-and-drop between days, non-US holidays, i18n/locale-driven week start
- **Theme scope:** no CRT/scanline overlay, no glow or chromatic aberration, no chiptune audio,
  and no sprite artwork beyond the icon glyphs the components need. The theme is pixel *drawing*,
  not a retro-console pastiche
- A shipped dark palette — the tokens are structured for one, building it is a later piece of work
- A theme switcher, or any way to turn the pixel theme off. There is one look
- File uploads and attachments. `BlobStore` exists as a seam; nothing calls it, and Vercel Blob is
  not provisioned until something does
- Multi-region or read-replica database topology, connection-pool tuning, and caching beyond what
  `revalidatePath` gives — all premature for a single-user planner
- **Slime scope:** no idle animation or bounce, no reacting to task completion, no naming, no
  unlocking or collecting, no more than one slime on screen, and no user-supplied sprites. The
  slime is a chosen mascot, not a pet and not a game
