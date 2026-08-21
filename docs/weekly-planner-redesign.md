# SimplePlanner: Weekly Planner Redesign

**Status:** Implemented (both phases) and verified — 2026-08-19
**Date:** 2026-08-19

## Context

SimplePlanner is currently a fresh Xcode template: the entire app is one `ContentView.swift`
holding a flat `[String]` of tasks in `UserDefaults` (and, as noted in `CLAUDE.md`, it loads
from `UserDefaults` but never saves back — persistence is broken today).

The goal is to make it look and behave like a real paper planner rather than a to-do list,
modeled on a weekly-planner reference image with three highlighted features: a **mini month
calendar**, a **weekly page** where each day is its own dated section, and **holidays** printed
inline on their date.

Outcome: a dated `PlannerTask` model in SwiftData, a week page as the home screen, a mini
month calendar that navigates between weeks, and holiday labels on the correct days.

### Constraint that shapes this plan

**Building this project requires full Xcode.** When this plan was authored, `xcodebuild`
failed with `xcode-select: error: tool 'xcodebuild' requires Xcode`, so the work was **phased**
to keep each unverified batch small.

**Update at implementation time:** full Xcode *is* installed at `/Applications/Xcode.app`; it
simply was not the selected developer directory. Prefixing commands with
`DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` builds and runs everything without
`sudo`, so both phases were compiled, unit-tested and exercised in the simulator rather than
being left unverified.

The build/test commands currently in `CLAUDE.md` were written without being run and are
unverified — correcting that is a task below. (Done: they named a non-existent `iPhone 16`
simulator; `CLAUDE.md` now carries verified commands using `iPhone 17 Pro`.)

### Helpful project fact

`project.pbxproj` uses `objectVersion = 77` with `PBXFileSystemSynchronizedRootGroup`. New
`.swift` files added anywhere under `SimplePlanner/SimplePlanner/` are picked up by the target
automatically, and deleting a file removes it from the build. **No pbxproj edits are needed to
add or remove source files.** (The one pbxproj edit needed is a build setting, in Phase 2.)

---

## Phase 1 — Data model, week page, mini calendar

No permissions, no EventKit. Independently verifiable.

### Design decisions

- **Single source of truth:** one `selectedDate: Date` owned by the root `PlannerView`.
  `MiniCalendarView` takes a `Binding<Date>`; the week page derives its 7 days from it. Both
  views become pure functions of `selectedDate`.
- **Week start: Monday**, matching the reference image's week page (Mon 29 → Sun 5). Applied
  to *both* the mini calendar grid and the week page so they can never disagree. Define this
  once as a single `firstWeekday` constant in `CalendarMath` (a `Calendar` with
  `firstWeekday = 2`) rather than reading `Calendar.current.firstWeekday`, which is
  locale-dependent and would render Sunday-first in the US.
- **Day keying:** normalize `PlannerTask.date` to `Calendar.startOfDay` **on write**. A raw
  `Date` carries a time component, so two tasks "on July 5" would not group together.
- **Date math lives in pure functions**, not in views — since unit tests are the only
  verification available without Xcode.

### Files to create

| File | Purpose |
|---|---|
| `SimplePlanner/SimplePlanner/Models/PlannerTask.swift` | `@Model final class PlannerTask` — `title: String`, `date: Date` (normalized to start-of-day), `isCompleted: Bool`, `createdAt: Date` (stable sort within a day) |
| `SimplePlanner/SimplePlanner/Calendar/CalendarMath.swift` | Pure, testable date helpers: `startOfWeek(containing:)`, `daysOfWeek(containing:)` → `[Date]`, `monthGrid(for:)` → weeks of optional dates, `weekdaySymbols()` → `M T W T F S S` — all built on the shared Monday-first `Calendar` |
| `SimplePlanner/SimplePlanner/Views/PlannerView.swift` | Root container. Owns `@State selectedDate`. Stacks `MiniCalendarView` above `WeekPageView`. |
| `SimplePlanner/SimplePlanner/Views/MiniCalendarView.swift` | Custom SwiftUI month grid (weekday header + `LazyVGrid` of days), prev/next month controls, tap a date → writes to the `Binding<Date>`. Highlights today and the selected week. |
| `SimplePlanner/SimplePlanner/Views/WeekPageView.swift` | Renders the 7 `DayRowView`s for the selected week, plus the week's date-range header |
| `SimplePlanner/SimplePlanner/Views/DayRowView.swift` | One day: date number + weekday name, its task list, inline add field, check/delete |

### Files to modify / remove

- **`SimplePlannerApp.swift`** — attach `.modelContainer(for: PlannerTask.self)`, show `PlannerView()`.
- **`ContentView.swift`** — delete. Its behavior is fully replaced; the file-system-synchronized
  group means deletion is enough. The dead `UserDefaults` key `"tasks"` needs no migration —
  the app never successfully wrote it.

### The `@Query` detail that will bite

`@Query` predicates are fixed at view init, so the per-day query belongs in `DayRowView`'s
initializer. `Calendar.startOfDay` **cannot** be called inside a `#Predicate` — compute bounds
outside and capture them:

```swift
init(date: Date) {
    let start = Calendar.current.startOfDay(for: date)
    let end = Calendar.current.date(byAdding: .day, value: 1, to: start)!
    _tasks = Query(
        filter: #Predicate<PlannerTask> { $0.date >= start && $0.date < end },
        sort: \.createdAt
    )
    self.date = date
}
```

### Tests (`SimplePlannerTests/CalendarMathTests.swift`, Swift Testing)

Cover `CalendarMath` against a fixed `Calendar` + `TimeZone` rather than `Calendar.current`,
so results are deterministic:
- `daysOfWeek` returns exactly 7 consecutive days always starting on a **Monday**, including
  when the passed-in date is itself a Sunday (the off-by-one this design is most likely to hit)
- the reference week specifically: any date in that week yields Mon 2026-06-29 → Sun 2026-07-05
- `monthGrid` for July 2026 puts the 1st in the Wednesday column under a `M T W T F S S` header
- weeks spanning a month boundary and a year boundary
- `monthGrid` leading/trailing padding for a month starting mid-week
- a DST-transition week still yields 7 distinct days
- start-of-day normalization makes two same-day-different-time dates equal

---

## Phase 2 — Holidays

Layered on only after Phase 1 is confirmed working in Xcode.

**Hybrid approach.** A built-in list is the baseline that always renders; EventKit is optional
enrichment. Rationale: EventKit requires `requestFullAccessToEvents` (a "wants to access your
calendar" prompt for what is only a date label), returns holidays **only if the user has
subscribed to a holiday calendar**, and typically returns nothing on a simulator — so an
EventKit-only build would make the highlighted feature look broken during development.

### Files to create

| File | Purpose |
|---|---|
| `Holidays/Holiday.swift` | `struct Holiday { let name: String; let date: Date }` |
| `Holidays/HolidayProviding.swift` | `protocol HolidayProviding { func holidays(in range: ClosedRange<Date>) async -> [Holiday] }` — the seam that keeps tests off real EventKit |
| `Holidays/BuiltInHolidayProvider.swift` | Computes major US holidays for a year (fixed-date: New Year's, Juneteenth, July 4th, Christmas; nth-weekday: MLK, Memorial, Labor, Thanksgiving). Pure and fully testable. |
| `Holidays/EventKitHolidayProvider.swift` | Wraps `EKEventStore`. Requests access on first use; returns `[]` on denial or error — never throws into the UI. |
| `Holidays/HolidayService.swift` | `@Observable`. Merges both providers, de-duplicates by name+day, exposes `holidays(on date: Date) -> [Holiday]` for view lookup. |

### Wiring

- `DayRowView` renders holiday names in its header (styled like the reference: centered,
  small, italic on the day's line).
- `MiniCalendarView` optionally marks holiday dates with a dot.
- **The one pbxproj edit:** add `INFOPLIST_KEY_NSCalendarsUsageDescription` to both Debug and
  Release build settings of the app target. Because `GENERATE_INFOPLIST_FILE = YES`, this must
  be a build setting — there is no `Info.plist` file to edit.

### Tests (`SimplePlannerTests/HolidayTests.swift`)

- `BuiltInHolidayProvider` returns correct dates for known years (e.g. Thanksgiving 2026 =
  Nov 26; July 4 2026 falls on a Saturday — assert the raw date, not an observed date)
- nth-weekday math across several years
- `HolidayService` de-duplicates when both providers report the same holiday
- a stub `HolidayProviding` that returns `[]` (denied access) leaves the UI holiday-free without error

---

## Verification

None of this can be verified from the command line without full Xcode installed.
**Verification is done in Xcode**, at the end of each phase.

**End of Phase 1** — open `SimplePlanner/SimplePlanner.xcodeproj`, Cmd+U then Cmd+R:
1. Unit tests pass (`CalendarMathTests`).
2. App launches to a week page showing 7 dated day sections for the current week.
3. Adding a task under one day makes it appear under that day and no other.
4. Force-quit and relaunch — tasks persist (this is the bug the current app has).
5. Tapping a date in the mini calendar switches the week page to that week.
6. Paging the mini calendar to another month and tapping a date navigates correctly.

**End of Phase 2:**
7. Built-in holidays appear on the right days (jump to July 2026 → "Independence Day" on the 4th)
   — this must work **before** any permission is granted.
8. Denying the calendar permission prompt leaves built-in holidays intact and does not crash.

**Also to fix:** once the correct invocation is confirmed (likely
`sudo xcode-select -s /Applications/Xcode.app` first), correct the unverified build/test
commands in `CLAUDE.md` and note the full-Xcode requirement there.

---

## Out of scope

- Full month view / tab switcher (mini calendar is a navigator, per decision)
- Free-form lined note areas per day (day sections are task lists, per decision)
- Recurring tasks, reminders/notifications, iCloud sync beyond SwiftData defaults
- Decorative artwork from the reference image
