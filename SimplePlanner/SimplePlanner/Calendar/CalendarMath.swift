//
//  CalendarMath.swift
//  SimplePlanner
//

import Foundation

/// Pure, testable date helpers shared by the mini calendar and the week page.
///
/// Everything is built on an explicit Monday-first Gregorian calendar rather than
/// `Calendar.current`, whose `firstWeekday` is locale-dependent (Sunday-first in the US).
/// Because both the grid and the week page go through here, they can never disagree.
enum CalendarMath {

    /// The calendar all planner date math uses: Gregorian, Monday-first, fixed locale.
    static func plannerCalendar(timeZone: TimeZone = .current) -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.firstWeekday = 2 // Monday
        calendar.timeZone = timeZone
        calendar.locale = Locale(identifier: "en_US_POSIX")
        return calendar
    }

    // MARK: - Days

    /// Normalizes a date to midnight — the key every task is stored under.
    static func startOfDay(_ date: Date, calendar: Calendar = CalendarMath.plannerCalendar()) -> Date {
        calendar.startOfDay(for: date)
    }

    static func isSameDay(_ lhs: Date, _ rhs: Date, calendar: Calendar = CalendarMath.plannerCalendar()) -> Bool {
        calendar.isDate(lhs, inSameDayAs: rhs)
    }

    /// Adds whole days without being derailed by a DST transition at midnight:
    /// the arithmetic happens from a midday anchor, then snaps back to midnight.
    static func addingDays(_ days: Int, to date: Date, calendar: Calendar = CalendarMath.plannerCalendar()) -> Date {
        let anchor = calendar.date(byAdding: .hour, value: 12, to: calendar.startOfDay(for: date)) ?? date
        let moved = calendar.date(byAdding: .day, value: days, to: anchor) ?? anchor
        return calendar.startOfDay(for: moved)
    }

    // MARK: - Weeks

    /// The Monday at or before `date`.
    static func startOfWeek(containing date: Date, calendar: Calendar = CalendarMath.plannerCalendar()) -> Date {
        let start = calendar.startOfDay(for: date)
        let weekday = calendar.component(.weekday, from: start)
        let offset = (weekday - calendar.firstWeekday + 7) % 7
        return addingDays(-offset, to: start, calendar: calendar)
    }

    /// Exactly seven consecutive days, always Monday first.
    static func daysOfWeek(containing date: Date, calendar: Calendar = CalendarMath.plannerCalendar()) -> [Date] {
        let start = startOfWeek(containing: date, calendar: calendar)
        return (0..<7).map { addingDays($0, to: start, calendar: calendar) }
    }

    static func isSameWeek(_ lhs: Date, _ rhs: Date, calendar: Calendar = CalendarMath.plannerCalendar()) -> Bool {
        startOfWeek(containing: lhs, calendar: calendar) == startOfWeek(containing: rhs, calendar: calendar)
    }

    // MARK: - Months

    static func startOfMonth(for date: Date, calendar: Calendar = CalendarMath.plannerCalendar()) -> Date {
        let components = calendar.dateComponents([.year, .month], from: date)
        return calendar.date(from: components) ?? calendar.startOfDay(for: date)
    }

    static func month(byAdding months: Int, to date: Date, calendar: Calendar = CalendarMath.plannerCalendar()) -> Date {
        let start = startOfMonth(for: date, calendar: calendar)
        return calendar.date(byAdding: .month, value: months, to: start) ?? start
    }

    static func daysInMonth(for date: Date, calendar: Calendar = CalendarMath.plannerCalendar()) -> [Date] {
        let start = startOfMonth(for: date, calendar: calendar)
        let dayCount = calendar.range(of: .day, in: .month, for: start)?.count ?? 0
        return (0..<dayCount).map { addingDays($0, to: start, calendar: calendar) }
    }

    /// The month laid out as weeks of seven cells, Monday first.
    /// Cells before the 1st and after the last day of the month are `nil` padding.
    static func monthGrid(for date: Date, calendar: Calendar = CalendarMath.plannerCalendar()) -> [[Date?]] {
        let days = daysInMonth(for: date, calendar: calendar)
        guard let first = days.first else { return [] }

        let weekday = calendar.component(.weekday, from: first)
        let leadingPadding = (weekday - calendar.firstWeekday + 7) % 7

        var cells: [Date?] = Array(repeating: nil, count: leadingPadding)
        cells.append(contentsOf: days.map { Optional($0) })
        while cells.count % 7 != 0 {
            cells.append(nil)
        }

        return stride(from: 0, to: cells.count, by: 7).map { Array(cells[$0..<($0 + 7)]) }
    }

    // MARK: - Labels

    /// Weekday initials in grid order — `M T W T F S S` for a Monday-first calendar.
    static func weekdaySymbols(calendar: Calendar = CalendarMath.plannerCalendar()) -> [String] {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.locale = calendar.locale ?? Locale(identifier: "en_US_POSIX")
        let symbols = formatter.veryShortStandaloneWeekdaySymbols ?? ["S", "M", "T", "W", "T", "F", "S"]
        let shift = calendar.firstWeekday - 1
        return (0..<7).map { symbols[($0 + shift) % symbols.count] }
    }
}
