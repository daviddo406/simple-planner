//
//  MiniCalendarView.swift
//  SimplePlanner
//

import SwiftUI

/// A compact month grid used purely as a navigator: tapping a day moves the
/// week page to that day's week.
struct MiniCalendarView: View {
    @Binding var selectedDate: Date
    @Environment(HolidayService.self) private var holidayService
    @State private var displayedMonth: Date

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 2), count: 7)

    init(selectedDate: Binding<Date>) {
        _selectedDate = selectedDate
        _displayedMonth = State(initialValue: CalendarMath.startOfMonth(for: selectedDate.wrappedValue))
    }

    var body: some View {
        VStack(spacing: 8) {
            header
            weekdayHeader
            grid
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color(.secondarySystemGroupedBackground))
        )
        .onChange(of: selectedDate) { _, newValue in
            // Follow the selection when it is changed from elsewhere.
            let month = CalendarMath.startOfMonth(for: newValue)
            if month != displayedMonth {
                withAnimation { displayedMonth = month }
            }
        }
    }

    private var header: some View {
        HStack {
            Button {
                withAnimation { displayedMonth = CalendarMath.month(byAdding: -1, to: displayedMonth) }
            } label: {
                Image(systemName: "chevron.left")
            }
            .accessibilityLabel("Previous month")

            Spacer()

            Text(displayedMonth, format: .dateTime.month(.wide).year())
                .font(.headline)

            Spacer()

            Button {
                withAnimation { displayedMonth = CalendarMath.month(byAdding: 1, to: displayedMonth) }
            } label: {
                Image(systemName: "chevron.right")
            }
            .accessibilityLabel("Next month")
        }
        .buttonStyle(.plain)
    }

    private var weekdayHeader: some View {
        HStack(spacing: 2) {
            ForEach(Array(CalendarMath.weekdaySymbols().enumerated()), id: \.offset) { _, symbol in
                Text(symbol)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
            }
        }
    }

    private var grid: some View {
        let weeks = CalendarMath.monthGrid(for: displayedMonth)
        return LazyVGrid(columns: columns, spacing: 2) {
            ForEach(Array(weeks.enumerated()), id: \.offset) { _, week in
                ForEach(Array(week.enumerated()), id: \.offset) { _, day in
                    if let day {
                        dayCell(day)
                    } else {
                        Color.clear.frame(height: 30)
                    }
                }
            }
        }
    }

    private func dayCell(_ day: Date) -> some View {
        let isToday = CalendarMath.isSameDay(day, Date())
        let isSelected = CalendarMath.isSameDay(day, selectedDate)
        let inSelectedWeek = CalendarMath.isSameWeek(day, selectedDate)
        let isHoliday = !holidayService.holidays(on: day).isEmpty

        return Button {
            withAnimation { selectedDate = day }
        } label: {
            VStack(spacing: 1) {
                Text(day, format: .dateTime.day())
                    .font(.caption)
                Circle()
                    .fill(isHoliday ? (isSelected ? Color.white : Color.accentColor) : Color.clear)
                    .frame(width: 3, height: 3)
            }
            .fontWeight(isToday ? .bold : .regular)
            .frame(maxWidth: .infinity)
            .frame(height: 30)
            .background {
                if isSelected {
                    Circle().fill(Color.accentColor)
                } else if inSelectedWeek {
                    RoundedRectangle(cornerRadius: 6).fill(Color.accentColor.opacity(0.12))
                }
            }
            .foregroundStyle(isSelected ? Color.white : (isToday ? Color.accentColor : Color.primary))
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    @Previewable @State var date = Date()
    MiniCalendarView(selectedDate: $date)
        .padding()
        .environment(HolidayService(providers: [BuiltInHolidayProvider()]))
}
