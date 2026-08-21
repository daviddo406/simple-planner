//
//  HolidayService.swift
//  SimplePlanner
//

import Foundation
import Observation

/// Merges every holiday provider into one day-keyed lookup for the views.
///
/// The built-in provider is the baseline that always renders; EventKit is optional
/// enrichment, so a denied permission simply contributes nothing.
@Observable
final class HolidayService {
    private let providers: [any HolidayProviding]
    private var holidaysByDay: [Date: [Holiday]] = [:]
    private var loadedYears: Set<Int> = []

    init(providers: [any HolidayProviding] = [BuiltInHolidayProvider(), EventKitHolidayProvider()]) {
        self.providers = providers
    }

    /// Lookup used by the views; cheap enough to call per day cell.
    func holidays(on date: Date) -> [Holiday] {
        holidaysByDay[CalendarMath.startOfDay(date)] ?? []
    }

    /// Loads the whole year containing `date`, once. A week or month view can
    /// straddle a year boundary, so the neighbouring year is loaded too.
    func loadYear(containing date: Date, calendar: Calendar = CalendarMath.plannerCalendar()) async {
        let year = calendar.component(.year, from: date)
        for candidate in [year - 1, year, year + 1] {
            await load(year: candidate, calendar: calendar)
        }
    }

    private func load(year: Int, calendar: Calendar) async {
        guard !loadedYears.contains(year) else { return }
        loadedYears.insert(year)

        var startComponents = DateComponents()
        startComponents.year = year
        startComponents.month = 1
        startComponents.day = 1

        var endComponents = DateComponents()
        endComponents.year = year
        endComponents.month = 12
        endComponents.day = 31

        guard let start = calendar.date(from: startComponents),
              let end = calendar.date(from: endComponents) else { return }

        var found: [Holiday] = []
        for provider in providers {
            found.append(contentsOf: await provider.holidays(in: start...end))
        }

        merge(found)
    }

    /// De-duplicates by name + day, so a holiday reported by both providers appears once.
    private func merge(_ holidays: [Holiday]) {
        var seen = Set(holidaysByDay.values.flatMap { $0 }.map(\.dedupeKey))

        for holiday in holidays where !seen.contains(holiday.dedupeKey) {
            seen.insert(holiday.dedupeKey)
            holidaysByDay[holiday.date, default: []].append(holiday)
        }

        for (day, list) in holidaysByDay {
            holidaysByDay[day] = list.sorted { $0.name < $1.name }
        }
    }
}
