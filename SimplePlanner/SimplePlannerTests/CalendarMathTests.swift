//
//  CalendarMathTests.swift
//  SimplePlannerTests
//

import Foundation
import Testing
@testable import SimplePlanner

/// All assertions run against a fixed calendar + time zone rather than
/// `Calendar.current`, so results do not depend on the machine's locale.
struct CalendarMathTests {

    private let timeZone = TimeZone(identifier: "America/New_York")!

    private var calendar: Calendar {
        CalendarMath.plannerCalendar(timeZone: timeZone)
    }

    private func date(_ year: Int, _ month: Int, _ day: Int, hour: Int = 0, minute: Int = 0) -> Date {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        components.hour = hour
        components.minute = minute
        return calendar.date(from: components)!
    }

    private func ymd(_ date: Date) -> String {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year!, parts.month!, parts.day!)
    }

    // MARK: - daysOfWeek

    @Test func daysOfWeekAlwaysReturnsSevenConsecutiveDaysStartingMonday() {
        // Every day of the reference week, plus a few others, must agree.
        let probes = [
            date(2026, 6, 29), date(2026, 7, 1), date(2026, 7, 5),
            date(2026, 1, 1), date(2026, 12, 31), date(2027, 2, 14)
        ]

        for probe in probes {
            let days = CalendarMath.daysOfWeek(containing: probe, calendar: calendar)
            #expect(days.count == 7)
            // Monday is weekday 2 in a Gregorian calendar.
            #expect(calendar.component(.weekday, from: days[0]) == 2)

            for index in 1..<days.count {
                let expected = CalendarMath.addingDays(index, to: days[0], calendar: calendar)
                #expect(days[index] == expected)
            }
        }
    }

    @Test func aSundayBelongsToTheWeekThatStartedTheMondayBefore() {
        // The off-by-one this design is most likely to hit: with a Monday-first
        // calendar, Sunday is the *last* day of its week, not the first.
        let sunday = date(2026, 7, 5)
        let days = CalendarMath.daysOfWeek(containing: sunday, calendar: calendar)

        #expect(ymd(days.first!) == "2026-06-29")
        #expect(ymd(days.last!) == "2026-07-05")
    }

    @Test func referenceWeekIsTheSameForEveryDayInIt() {
        let expected = ["2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02",
                        "2026-07-03", "2026-07-04", "2026-07-05"]

        for day in 29...30 {
            #expect(CalendarMath.daysOfWeek(containing: date(2026, 6, day), calendar: calendar).map(ymd) == expected)
        }
        for day in 1...5 {
            #expect(CalendarMath.daysOfWeek(containing: date(2026, 7, day), calendar: calendar).map(ymd) == expected)
        }
    }

    @Test func weekSpanningAYearBoundaryStaysContiguous() {
        let days = CalendarMath.daysOfWeek(containing: date(2026, 12, 31), calendar: calendar)

        #expect(days.map(ymd) == ["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31",
                                  "2027-01-01", "2027-01-02", "2027-01-03"])
    }

    @Test func dstTransitionWeekStillYieldsSevenDistinctDays() {
        // US spring-forward, 2026-03-08.
        let days = CalendarMath.daysOfWeek(containing: date(2026, 3, 8), calendar: calendar)

        #expect(days.count == 7)
        #expect(Set(days.map(ymd)).count == 7)
        #expect(days.map(ymd) == ["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05",
                                  "2026-03-06", "2026-03-07", "2026-03-08"])
    }

    @Test func sameWeekIgnoresTimeOfDay() {
        #expect(CalendarMath.isSameWeek(date(2026, 6, 29, hour: 23), date(2026, 7, 5, hour: 1), calendar: calendar))
        #expect(!CalendarMath.isSameWeek(date(2026, 7, 5), date(2026, 7, 6), calendar: calendar))
    }

    // MARK: - monthGrid

    @Test func monthGridPutsJuly2026FirstUnderTheWednesdayColumn() {
        let grid = CalendarMath.monthGrid(for: date(2026, 7, 15), calendar: calendar)
        let header = CalendarMath.weekdaySymbols(calendar: calendar)

        #expect(header == ["M", "T", "W", "T", "F", "S", "S"])

        let wednesdayColumn = header.firstIndex(of: "W")!
        #expect(wednesdayColumn == 2)
        #expect(ymd(grid[0][wednesdayColumn]!) == "2026-07-01")
    }

    @Test func monthGridPadsLeadingAndTrailingCells() {
        let grid = CalendarMath.monthGrid(for: date(2026, 7, 1), calendar: calendar)

        // July 2026 has 31 days and starts on a Wednesday: 2 leading pads + 31 = 33,
        // rounded up to 5 full weeks of 7.
        #expect(grid.count == 5)
        #expect(grid.allSatisfy { $0.count == 7 })
        #expect(grid[0][0] == nil)
        #expect(grid[0][1] == nil)
        #expect(grid[0][2] != nil)

        let lastWeek = grid[grid.count - 1]
        #expect(ymd(lastWeek[4]!) == "2026-07-31")
        #expect(lastWeek[5] == nil)
        #expect(lastWeek[6] == nil)
    }

    @Test func monthGridContainsEveryDayOfTheMonthExactlyOnce() {
        for month in 1...12 {
            let grid = CalendarMath.monthGrid(for: date(2026, month, 10), calendar: calendar)
            let days = grid.flatMap { $0 }.compactMap { $0 }
            let expectedCount = calendar.range(of: .day, in: .month, for: date(2026, month, 1))!.count

            #expect(days.count == expectedCount)
            #expect(Set(days.map(ymd)).count == expectedCount)
            #expect(days.allSatisfy { calendar.component(.month, from: $0) == month })
        }
    }

    @Test func monthNavigationCrossesTheYearBoundary() {
        #expect(ymd(CalendarMath.month(byAdding: 1, to: date(2026, 12, 20), calendar: calendar)) == "2027-01-01")
        #expect(ymd(CalendarMath.month(byAdding: -1, to: date(2026, 1, 20), calendar: calendar)) == "2025-12-01")
    }

    // MARK: - start-of-day normalization

    @Test func startOfDayMakesTwoTimesOnTheSameDayEqual() {
        let morning = CalendarMath.startOfDay(date(2026, 7, 5, hour: 8, minute: 30), calendar: calendar)
        let evening = CalendarMath.startOfDay(date(2026, 7, 5, hour: 23, minute: 59), calendar: calendar)

        #expect(morning == evening)
        #expect(morning != CalendarMath.startOfDay(date(2026, 7, 6), calendar: calendar))
    }
}
