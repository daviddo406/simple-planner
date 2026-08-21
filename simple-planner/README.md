# Weekly Planner (web)

A planner shaped like a paper weekly planner, rendered at low resolution: a mini month calendar
that navigates between weeks, a week page where each day is its own dated section, and holidays
printed inline on their date. Tasks are dated records.

Built to `docs/weekly-planner-nextjs.md`. The iOS app in `SimplePlanner/` is the same product on
a different platform — the product decisions carry over, every platform mechanism is replaced.

## Setup

```bash
npm install
npm run dev
```

The dev server needs a database. There are three drivers, chosen with `DB_DRIVER`, and only one
file in the codebase names any of them (`src/db/index.ts`).

### No account, no network — PGlite

Postgres compiled to WASM, running in-process. It bootstraps its own schema from the same
checked-in migrations, so there is nothing to provision:

```bash
DB_DRIVER=pglite PGLITE_DATA_DIR=.pglite/dev DATABASE_URL=pglite://.pglite/dev npm run dev
```

This is what `npm test` and `npm run test:e2e` use.

### Any Postgres — `DB_DRIVER=postgres`

Supabase, Railway, Render, RDS, Neon, or a Postgres on your own machine. Get a connection string
from the provider's dashboard, put it in `.env.local`, and apply the migrations:

```bash
echo 'DATABASE_URL=postgres://user:password@host:5432/dbname' >> .env.local
echo 'DB_DRIVER=postgres' >> .env.local
npm run db:migrate
npm run dev
```

A local Postgres works the same way:

```bash
brew services start postgresql@14 && createdb planner
DATABASE_URL="postgres://$USER@127.0.0.1:5432/planner" npm run db:migrate
DB_DRIVER=postgres DATABASE_URL="postgres://$USER@127.0.0.1:5432/planner" npm run dev
```

On a serverless host, point this at the provider's **pooled** connection string, not the direct
one — functions are the classic way to exhaust a Postgres connection limit.

### Neon on Vercel — `DB_DRIVER=neon` (the default)

The production configuration. Neon's HTTP driver avoids holding a TCP connection open from a
function that may live for milliseconds, and every query here is a single statement, so its one
real limitation — no interactive transactions — costs nothing.

**You do not need the Vercel CLI.** In the Vercel dashboard: create the project, open its
**Storage** tab, add a Marketplace Postgres (Neon), and Vercel injects the connection variables
into the project's environment. Copy `DATABASE_URL` from **Settings → Environment Variables** into
a local `.env.local` and run `npm run db:migrate`.

If you would rather use the CLI, it needs no install — `npx vercel link`, `npx vercel env pull
.env.local`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve a production build |
| `npm run lint` | ESLint, including the rule that bans direct `date-fns` imports |
| `npm test` | Vitest — date math, holidays, slimes, queries against PGlite, components |
| `npm run test:watch` | The same, in watch mode |
| `npm run test:e2e` | Playwright against a production build backed by PGlite |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` into `drizzle/` |
| `npm run db:migrate` | Apply `drizzle/*.sql` to `DATABASE_URL` (uses `pg`, so it works against any Postgres) |
| `npm run probe:fonts` | Measure which font sizes are on each bitmap face's pixel grid |

`npm test` and `npm run test:e2e` need no network and no Vercel account, so CI does not need
database credentials.

## The four rules that are easy to break

1. **Monday-first lives in one file.** `src/lib/calendar.ts` is the only module allowed to import
   `date-fns`, because it is the only one that passes `{ weekStartsOn: 1 }`. An ESLint
   `no-restricted-imports` rule enforces it.
2. **A task's date is a `dayKey`, not a timestamp.** A `YYYY-MM-DD` civil date built from local
   calendar fields — never `toISOString().slice(0, 10)`, which converts to UTC first and lands on
   the wrong day for anyone far enough east.
3. **One file names a driver, one file imports Drizzle.** `src/db/index.ts` and
   `src/db/queries.ts`. Everything else calls named query functions, so changing provider is a
   connection string and a `DB_DRIVER` value.
4. **The theme has six rules**, all of them things the browser does by default that
   `src/app/globals.css` switches off: nothing is round, nothing is blurred, everything lands on
   the 4px grid, borders are 2px, type is unsmoothed bitmap type at integer multiples of its
   design size, and raster stays raster. The E2E suite asserts all four of the checkable ones
   from computed styles at DPR 1, 1.5, and 2.

## Deploying

Migrations run as a **deploy step**, never at request time — on a serverless platform that would
mean every cold start racing every other to alter the same schema. Point Preview deployments at a
separate database (a Neon branch per preview), and put the database in the region the functions
run in.

## Fonts

Two OFL-licensed pixel faces are vendored into `src/app/fonts/` with their licences:
**Silkscreen** (display, 8px design size, rendered at 16 / 24 / 32) and **Departure Mono** (body,
11px design size, rendered at 22 on a 32px line-height). Both are self-hosted through
`next/font/local`, so the build needs no network.

The ladder is measured rather than assumed — `npm run probe:fonts` rasterizes each candidate size
and reports how uniform the stems came out. Off-grid sizes do not blur, because smoothing is off;
they go lumpy.
