# Weekly Planner: Next.js Implementation Plan

**Status:** Not started — plan only
**Date:** 2026-08-19
**Relationship to `weekly-planner-redesign.md`:** that document is the iOS/SwiftUI plan for the
same product. This is a **greenfield Next.js application** built to the same design, not a port
of the Swift source. The product decisions (Monday-first weeks, one `selectedDate` as the single
source of truth, day-keyed tasks, holidays printed inline) carry over; every platform mechanism
is replaced.

## Context

The product is a web planner shaped like a paper weekly planner: a **mini month calendar** that
navigates between weeks, a **weekly page** where each day is its own dated section, and
**holidays** printed inline on their date. Tasks are dated records.

Nothing exists yet — this plan starts from `create-next-app`.

### Stack decisions

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router), TypeScript, React Server Components | Server-rendered week page; mutations via Server Actions instead of a REST layer |
| Persistence | **SQLite** via `better-sqlite3`, schema and queries through **Drizzle ORM** | Single-file DB, synchronous driver, no service to run. Drizzle keeps the schema in TypeScript and generates real migrations. (Prisma is the alternative if a GUI/`prisma studio` is wanted; it costs a codegen step and a heavier client.) |
| Auth | **None** | Explicitly out of scope. The app is single-user; every task row belongs to the one implicit user. No `userId` column, no session. |
| Styling | **Tailwind CSS v4**, hand-rolled components | The paper look is borders, spacing, and type. No component library — the calendar grid stays fully under our control. |
| Dates | **`date-fns`** with an explicit `{ weekStartsOn: 1 }` option, wrapped in our own module | See "Date math" below |
| Unit tests | **Vitest** | Fast, no browser needed for the pure date/holiday logic |
| E2E tests | **Playwright** | Mirrors the role `SimplePlannerUITests` plays in the iOS plan |

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
npm i better-sqlite3 drizzle-orm date-fns
npm i -D drizzle-kit @types/better-sqlite3 vitest @vitejs/plugin-react \
        @testing-library/react @testing-library/jest-dom jsdom @playwright/test
npx playwright install chromium
```

Also in this phase:
- `vitest.config.ts` — `environment: 'jsdom'`, path alias `@/` matching `tsconfig.json`.
- `playwright.config.ts` — `webServer` block that runs `npm run build && npm run start` against a
  disposable database file, so E2E never runs against the dev database.
- `package.json` scripts: `dev`, `build`, `start`, `test` (vitest run), `test:watch`, `test:e2e`,
  `db:generate`, `db:migrate`.
- `.gitignore`: add `*.db`, `*.db-journal`, `*.db-wal`.
- Delete the `create-next-app` boilerplate page, CSS demo classes, and SVG assets.

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
| `src/db/schema.ts` | Drizzle table `tasks`: `id` (integer pk autoincrement), `title` (text not null), `dayKey` (text not null), `isCompleted` (integer boolean, default 0), `createdAt` (integer timestamp, default now). Index on `dayKey`. |
| `src/db/index.ts` | Opens `better-sqlite3` at `process.env.DATABASE_PATH ?? './planner.db'`, sets `PRAGMA journal_mode = WAL`, exports the Drizzle instance. Cached on `globalThis` so Next's dev hot-reload does not open a new handle per edit. |
| `drizzle.config.ts` | Points drizzle-kit at the schema and `./drizzle` migrations dir |
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
  `npm run db:migrate` applies it. The dev server does not migrate implicitly.
- **No `userId`, no auth** — per decision. Noted here so the omission reads as intentional.

### Tests — `src/db/queries.test.ts`

- Against an in-memory SQLite (`:memory:`) with migrations applied in `beforeEach`
- `tasksForWeek` groups tasks under the right day and returns empty arrays, not `undefined`, for
  days with no tasks
- a task with a `dayKey` outside the week is not returned
- ordering within a day is by `createdAt`
- `addTask` rejects a malformed `dayKey`; `toggleTask` on a missing id is a no-op, not a throw

**Verify:** `npm test` — date math and persistence both green, still no UI.

---

## Phase 3 — UI: week page and mini calendar

### Files

| File | Purpose |
|---|---|
| `src/app/layout.tsx` | Root layout, fonts, Tailwind base. A serif display face for headings sells the paper look. |
| `src/app/page.tsx` | **Server Component.** Reads `searchParams.week`; if missing renders `<WeekRedirect />` and nothing else. Otherwise calls `tasksForWeek`, computes holidays, renders `<MiniCalendar />` + `<WeekPage />`. |
| `src/app/week-redirect.tsx` | `'use client'` — resolves this week's Monday from the browser clock and `router.replace`s. Renders a skeleton, never a date. |
| `src/components/MiniCalendar.tsx` | Month grid from `monthGrid`. Prev/next month are `<Link>`s to `?week=…&month=…`; each day cell is a `<Link>` to that day's `?week=`. Server-rendered — no state at all. |
| `src/components/TodayMarker.tsx` | `'use client'` — after mount, adds the "today" ring to the matching cell. Isolated so hydration can never mismatch. |
| `src/components/WeekPage.tsx` | Week range header + seven `<DaySection />` |
| `src/components/DaySection.tsx` | One day: date number, weekday name, inline holiday label, task list, add form |
| `src/components/TaskItem.tsx` | `'use client'` — checkbox and delete, each a Server Action bound to the id, wrapped in `useOptimistic` so the row responds instantly |
| `src/components/AddTaskForm.tsx` | `'use client'` — `<form action={addTask.bind(null, dayKey)}>`, clears via `useRef` on submit, optimistic append |

### Design decisions

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

### Tests

`src/components/*.test.tsx` (Vitest + Testing Library), on the pure-render pieces:
- `WeekPage` renders exactly seven sections, in Mon→Sun order, with the right date numbers
- `MiniCalendar` marks the selected week's cells and links each day to the correct `?week=`
- `DaySection` renders a holiday label when given one and nothing when not

**Verify:** `npm test`, then `npm run dev` and check by hand:
1. `/` redirects to `/?week=` this Monday
2. Seven dated day sections for the current week
3. Adding a task under one day makes it appear under that day and no other
4. Reload — tasks persist
5. Clicking a date in the mini calendar switches the week page to that week
6. Paging to another month and clicking a date navigates correctly
7. Editing `?week=` in the address bar directly works

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
- Rendering: a small centered italic line inside `DaySection`'s header, plus an optional dot on
  the mini calendar cell.

### Tests — `src/lib/holidays.test.ts`

- known dates for several years: Thanksgiving 2026 = Nov 26, MLK 2027 = Jan 18, Memorial 2026 =
  May 25 (**last** Monday, not 4th — the rule most likely to be coded wrong)
- July 4 2026 asserts the raw date (Saturday), not an observed Friday
- nth-weekday math across a leap year and a year where the month starts on the target weekday
- a day with no holiday returns `[]`, and `holidaysByDayKey` covers all seven days of the week

**Verify:** `npm test`, then navigate to July 2026 → "Independence Day" prints on the 4th.

---

## Phase 5 — End-to-end and ship

### `e2e/planner.spec.ts` (Playwright)

Mirrors `PlannerFlowUITests`, run against a production build with a throwaway `DATABASE_PATH`:
1. `/` lands on the current week with seven dated sections
2. Adding a task to Wednesday puts it under Wednesday and no other day
3. Reload — the task is still there (real persistence, not a client cache)
4. Toggling completion survives a reload; deleting removes it
5. Navigating the mini calendar to July 2026 shows "Independence Day" on the 4th
6. Deep-linking `?week=2026-06-29` renders Mon 29 → Sun 5 directly
7. `TZ=Pacific/Kiritimati npx playwright test` passes identically — the skew guard, end to end

### Ship checklist

- `npm run build && npm test && npm run test:e2e` all green
- `README.md`: setup, `db:migrate`, the scripts table
- `CLAUDE.md` for this repo: commands **that were actually run**, the Monday-first invariant, the
  `dayKey`-not-timestamp rule, and the no-direct-`date-fns`-import rule
- Deployment note: SQLite needs a **persistent filesystem**. Vercel's serverless runtime has none,
  so this deploys to Fly.io / Railway / a container with a mounted volume, or swaps the Drizzle
  driver for Turso (libSQL) — a one-file change in `src/db/index.ts` because nothing above the
  driver knows it is SQLite.

---

## Out of scope

- Authentication and multi-user data (explicit decision — no `userId` anywhere)
- Full month view or a tab switcher; the mini calendar is a navigator
- Free-form lined note areas per day; day sections are task lists
- Recurring tasks, reminders, notifications, sync
- Drag-and-drop between days, non-US holidays, i18n/locale-driven week start
