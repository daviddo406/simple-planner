//
//  Holiday.swift
//  SimplePlanner
//

import Foundation

/// A named day printed inline on the planner page.
struct Holiday: Identifiable, Hashable, Sendable {
    let name: String
    /// Always normalized to start-of-day, so lookups key off the calendar day.
    let date: Date

    init(name: String, date: Date) {
        self.name = name
        self.date = CalendarMath.startOfDay(date)
    }

    var id: String { "\(name)@\(date.timeIntervalSinceReferenceDate)" }

    /// Identity used when merging providers: same name, same day.
    var dedupeKey: String {
        "\(name.trimmingCharacters(in: .whitespaces).lowercased())@\(date.timeIntervalSinceReferenceDate)"
    }
}
