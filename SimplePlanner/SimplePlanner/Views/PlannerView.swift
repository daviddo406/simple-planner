//
//  PlannerView.swift
//  SimplePlanner
//

import SwiftData
import SwiftUI

/// Root of the planner. Owns the one `selectedDate` that both the mini calendar
/// and the week page are pure functions of.
struct PlannerView: View {
    @State private var selectedDate = Date()
    @State private var holidayService = HolidayService()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    MiniCalendarView(selectedDate: $selectedDate)
                    WeekPageView(selectedDate: selectedDate)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
            .background(Color(.systemGroupedBackground))
            .environment(holidayService)
            .task(id: selectedDate) {
                await holidayService.loadYear(containing: selectedDate)
            }
            .navigationTitle("Planner")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Today") {
                        withAnimation {
                            selectedDate = Date()
                        }
                    }
                    .disabled(CalendarMath.isSameWeek(selectedDate, Date()))
                }
            }
        }
    }
}

#Preview {
    PlannerView()
        .modelContainer(for: PlannerTask.self, inMemory: true)
}
