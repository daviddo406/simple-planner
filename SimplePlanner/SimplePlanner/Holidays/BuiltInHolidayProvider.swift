//
//  BuiltInHolidayProvider.swift
//  SimplePlanner
//

import Foundation

/// Computes major US holidays from calendar rules. This is the baseline that always
/// renders, so the feature never looks broken before (or without) calendar access.
struct BuiltInHolidayProvider: HolidayProviding {
    let calendar: Calendar

    init(calendar: Calendar = CalendarMath.plannerCalendar()) {
        self.calendar = calendar
    }

    func holidays(in range: ClosedRange<Date>) async -> [Holiday] {
        let firstYear = calendar.component(.year, from: range.lowerBound)
        let lastYear = calendar.component(.year, from: range.upperBound)

        return (firstYear...lastYear)
            .flatMap { holidays(inYear: $0) }
            .filter { range.contains($0.date) }
            .sorted { $0.date < $1.date }
    }

    /// Every supported holiday for one year.
    func holidays(inYear year: Int) -> [Holiday] {
        var result: [Holiday] = []

        // Fixed-date holidays.
        let fixed: [(String, Int, Int)] = [
            ("New Year's Day", 1, 1),
            ("Juneteenth", 6, 19),
            ("Independence Day", 7, 4),
            ("Christmas Day", 12, 25)
        ]
        for (name, month, day) in fixed {
            if let date = date(year: year, month: month, day: day) {
                result.append(Holiday(name: name, date: date))
            }
        }

        // Nth-weekday holidays. Ordinal -1 means "last <weekday> of the month".
        let weekdayBased: [(String, Int, Weekday, Int)] = [
            ("Martin Luther King Jr. Day", 1, .monday, 3),
            ("Memorial Day", 5, .monday, -1),
            ("Labor Day", 9, .monday, 1),
            ("Thanksgiving", 11, .thursday, 4)
        ]
        for (name, month, weekday, ordinal) in weekdayBased {
            if let date = date(year: year, month: month, weekday: weekday, ordinal: ordinal) {
                result.append(Holiday(name: name, date: date))
            }
        }

        return result.sorted { $0.date < $1.date }
    }

    /// Gregorian weekday numbers, named so the tables above read clearly.
    enum Weekday: Int {
        case sunday = 1, monday, tuesday, wednesday, thursday, friday, saturday
    }

    private func date(year: Int, month: Int, day: Int) -> Date? {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        return calendar.date(from: components).map { calendar.startOfDay(for: $0) }
    }

    private func date(year: Int, month: Int, weekday: Weekday, ordinal: Int) -> Date? {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.weekday = weekday.rawValue
        components.weekdayOrdinal = ordinal
        return calendar.date(from: components).map { calendar.startOfDay(for: $0) }
    }
}
