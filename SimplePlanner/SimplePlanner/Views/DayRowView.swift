//
//  DayRowView.swift
//  SimplePlanner
//

import SwiftData
import SwiftUI

/// A single dated day section: its date heading, its tasks, and an inline add field.
///
/// The per-day `@Query` is built in `init` because `@Query` predicates are fixed at
/// view initialization. `Calendar.startOfDay` cannot be called inside a `#Predicate`,
/// so the day's bounds are computed here and captured.
struct DayRowView: View {
    let date: Date

    @Environment(\.modelContext) private var modelContext
    @Environment(HolidayService.self) private var holidayService
    @Query private var tasks: [PlannerTask]
    @State private var newTitle = ""

    init(date: Date) {
        let start = CalendarMath.startOfDay(date)
        let end = CalendarMath.addingDays(1, to: start)
        _tasks = Query(
            filter: #Predicate<PlannerTask> { $0.date >= start && $0.date < end },
            sort: \PlannerTask.createdAt
        )
        self.date = date
    }

    private var isToday: Bool {
        CalendarMath.isSameDay(date, Date())
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            dayHeader

            ForEach(tasks) { task in
                taskRow(task)
            }

            addField
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color(.secondarySystemGroupedBackground))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(isToday ? Color.accentColor : Color.clear, lineWidth: 1.5)
        )
    }

    private var dayHeader: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(date, format: .dateTime.day())
                .font(.title3.weight(.bold))
                .foregroundStyle(isToday ? Color.accentColor : Color.primary)
            Text(date, format: .dateTime.weekday(.wide))
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            let holidays = holidayService.holidays(on: date)
            if !holidays.isEmpty {
                Text(holidays.map(\.name).joined(separator: " • "))
                    .font(.caption)
                    .italic()
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.trailing)
            }
        }
    }

    private func taskRow(_ task: PlannerTask) -> some View {
        HStack(spacing: 10) {
            Button {
                task.isCompleted.toggle()
            } label: {
                Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(task.isCompleted ? Color.accentColor : Color.secondary)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(task.isCompleted ? "Mark incomplete" : "Mark complete")

            Text(task.title)
                .strikethrough(task.isCompleted, color: .secondary)
                .foregroundStyle(task.isCompleted ? Color.secondary : Color.primary)

            Spacer()

            Button(role: .destructive) {
                modelContext.delete(task)
                try? modelContext.save()
            } label: {
                Image(systemName: "trash")
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Delete task")
        }
        .font(.subheadline)
    }

    private var addField: some View {
        HStack(spacing: 8) {
            Image(systemName: "plus")
                .font(.caption)
                .foregroundStyle(.secondary)
            TextField("Add a task", text: $newTitle)
                .font(.subheadline)
                .textFieldStyle(.plain)
                .submitLabel(.done)
                .onSubmit(addTask)
        }
        .padding(.top, 2)
    }

    private func addTask() {
        let trimmed = newTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        modelContext.insert(PlannerTask(title: trimmed, date: date))
        // Saved eagerly rather than left to autosave, so a task survives a force-quit.
        try? modelContext.save()
        newTitle = ""
    }
}

#Preview {
    DayRowView(date: Date())
        .padding()
        .modelContainer(for: PlannerTask.self, inMemory: true)
        .environment(HolidayService(providers: [BuiltInHolidayProvider()]))
}
