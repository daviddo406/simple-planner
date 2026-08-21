# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

SimplePlanner is an iOS SwiftUI app (Xcode project) shaped like a paper weekly planner: a mini month calendar that navigates between weeks, a week page where each day is its own dated section, and holidays printed inline on their date. Tasks are dated `PlannerTask` records persisted with SwiftData.

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
