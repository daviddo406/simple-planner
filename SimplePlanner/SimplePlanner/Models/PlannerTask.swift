//
//  PlannerTask.swift
//  SimplePlanner
//

import Foundation
import SwiftData

/// A single task, pinned to one calendar day.
///
/// `date` is always normalized to start-of-day on write: a raw `Date` carries a time
/// component, so two tasks "on July 5" would otherwise not group onto the same day.
@Model
final class PlannerTask {
    var title: String
    var date: Date
    var isCompleted: Bool
    /// Keeps ordering stable within a day.
    var createdAt: Date

    init(title: String, date: Date, isCompleted: Bool = false, createdAt: Date = Date()) {
        self.title = title
        self.date = CalendarMath.startOfDay(date)
        self.isCompleted = isCompleted
        self.createdAt = createdAt
    }

    /// Re-normalizes when a task is moved to another day.
    func move(to newDate: Date) {
        date = CalendarMath.startOfDay(newDate)
    }
}
