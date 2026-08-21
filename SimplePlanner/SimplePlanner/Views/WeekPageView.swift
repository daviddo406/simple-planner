//
//  WeekPageView.swift
//  SimplePlanner
//

import SwiftData
import SwiftUI

/// One week of the planner: a dated header plus the seven day sections.
struct WeekPageView: View {
    let selectedDate: Date

    private var days: [Date] {
        CalendarMath.daysOfWeek(containing: selectedDate)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            weekHeader

            VStack(spacing: 10) {
                ForEach(days, id: \.self) { day in
                    DayRowView(date: day)
                }
            }
        }
    }

    private var weekHeader: some View {
        let range = days
        let first = range.first ?? selectedDate
        let last = range.last ?? selectedDate

        return VStack(alignment: .leading, spacing: 2) {
            Text("Week of")
                .font(.caption)
                .textCase(.uppercase)
                .foregroundStyle(.secondary)
            Text("\(first.formatted(.dateTime.month(.abbreviated).day())) – \(last.formatted(.dateTime.month(.abbreviated).day().year()))")
                .font(.title3.weight(.semibold))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview {
    ScrollView {
        WeekPageView(selectedDate: Date()).padding()
    }
    .modelContainer(for: PlannerTask.self, inMemory: true)
    .environment(HolidayService(providers: [BuiltInHolidayProvider()]))
}
