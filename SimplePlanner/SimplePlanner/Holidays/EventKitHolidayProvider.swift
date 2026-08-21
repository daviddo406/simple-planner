//
//  EventKitHolidayProvider.swift
//  SimplePlanner
//

import EventKit
import Foundation

/// Optional enrichment on top of the built-in list: picks up whatever holiday
/// calendar the user has subscribed to. Requests access on first use and returns
/// `[]` on denial or error — it never throws into the UI.
struct EventKitHolidayProvider: HolidayProviding {

    func holidays(in range: ClosedRange<Date>) async -> [Holiday] {
        let store = EKEventStore()

        let granted = (try? await store.requestFullAccessToEvents()) ?? false
        guard granted else { return [] }

        let calendars = store.calendars(for: .event).filter(isHolidayCalendar)
        guard !calendars.isEmpty else { return [] }

        let predicate = store.predicateForEvents(
            withStart: range.lowerBound,
            end: range.upperBound,
            calendars: calendars
        )

        return store.events(matching: predicate)
            .filter { $0.isAllDay }
            .compactMap { event in
                guard let title = event.title, let start = event.startDate else { return nil }
                return Holiday(name: title, date: start)
            }
    }

    /// Holiday feeds ship as subscribed calendars; the title check catches the rest.
    private func isHolidayCalendar(_ calendar: EKCalendar) -> Bool {
        calendar.type == .subscription || calendar.title.localizedCaseInsensitiveContains("holiday")
    }
}
