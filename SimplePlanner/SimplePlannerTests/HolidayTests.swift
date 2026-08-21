//
//  HolidayTests.swift
//  SimplePlannerTests
//

import Foundation
import Testing
@testable import SimplePlanner

/// A `HolidayProviding` that answers from a fixed list — keeps these tests off EventKit.
struct StubHolidayProvider: HolidayProviding {
    let stubbed: [Holiday]

    init(_ stubbed: [Holiday] = []) {
        self.stubbed = stubbed
    }

    func holidays(in range: ClosedRange<Date>) async -> [Holiday] {
        stubbed.filter { range.contains($0.date) }
    }
}

@MainActor
struct HolidayTests {

    private let timeZone = TimeZone(identifier: "America/New_York")!

    private var calendar: Calendar {
        CalendarMath.plannerCalendar(timeZone: timeZone)
    }

    private var provider: BuiltInHolidayProvider {
        BuiltInHolidayProvider(calendar: calendar)
    }

    private func date(_ year: Int, _ month: Int, _ day: Int) -> Date {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        return calendar.startOfDay(for: calendar.date(from: components)!)
    }

    private func holiday(named name: String, inYear year: Int) -> Holiday? {
        provider.holidays(inYear: year).first { $0.name == name }
    }

    // MARK: - Fixed-date holidays

    @Test func fixedDateHolidaysLandOnTheirActualDate() {
        // July 4 2026 falls on a Saturday — the raw date is asserted, not an
        // observed/shifted federal holiday.
        #expect(holiday(named: "Independence Day", inYear: 2026)?.date == date(2026, 7, 4))
        #expect(holiday(named: "New Year's Day", inYear: 2026)?.date == date(2026, 1, 1))
        #expect(holiday(named: "Juneteenth", inYear: 2026)?.date == date(2026, 6, 19))
        #expect(holiday(named: "Christmas Day", inYear: 2026)?.date == date(2026, 12, 25))
    }

    // MARK: - Nth-weekday holidays

    @Test func thanksgivingIsTheFourthThursdayOfNovember() {
        #expect(holiday(named: "Thanksgiving", inYear: 2026)?.date == date(2026, 11, 26))
        #expect(holiday(named: "Thanksgiving", inYear: 2025)?.date == date(2025, 11, 27))
        #expect(holiday(named: "Thanksgiving", inYear: 2027)?.date == date(2027, 11, 25))
    }

    @Test func nthWeekdayHolidaysAreCorrectAcrossYears() {
        #expect(holiday(named: "Martin Luther King Jr. Day", inYear: 2026)?.date == date(2026, 1, 19))
        #expect(holiday(named: "Martin Luther King Jr. Day", inYear: 2027)?.date == date(2027, 1, 18))

        // Memorial Day is the *last* Monday of May, not the fourth.
        #expect(holiday(named: "Memorial Day", inYear: 2026)?.date == date(2026, 5, 25))
        #expect(holiday(named: "Memorial Day", inYear: 2027)?.date == date(2027, 5, 31))

        #expect(holiday(named: "Labor Day", inYear: 2026)?.date == date(2026, 9, 7))
        #expect(holiday(named: "Labor Day", inYear: 2027)?.date == date(2027, 9, 6))
    }

    @Test func everyNthWeekdayHolidayFallsOnItsNamedWeekday() {
        for year in 2024...2030 {
            let holidays = provider.holidays(inYear: year)
            let mondays = ["Martin Luther King Jr. Day", "Memorial Day", "Labor Day"]

            for name in mondays {
                let match = holidays.first { $0.name == name }
                #expect(match != nil)
                #expect(calendar.component(.weekday, from: match!.date) == 2, "\(name) \(year)")
            }

            let thanksgiving = holidays.first { $0.name == "Thanksgiving" }!
            #expect(calendar.component(.weekday, from: thanksgiving.date) == 5)
        }
    }

    @Test func rangeQueryOnlyReturnsHolidaysInsideTheRange() async {
        let july = await provider.holidays(in: date(2026, 7, 1)...date(2026, 7, 31))

        #expect(july.count == 1)
        #expect(july.first?.name == "Independence Day")
    }

    // MARK: - HolidayService

    @Test func serviceDeduplicatesHolidaysReportedByBothProviders() async {
        let duplicate = Holiday(name: "Independence Day", date: date(2026, 7, 4))
        let service = HolidayService(providers: [provider, StubHolidayProvider([duplicate])])

        await service.loadYear(containing: date(2026, 7, 4), calendar: calendar)

        #expect(service.holidays(on: date(2026, 7, 4)).count == 1)
        #expect(service.holidays(on: date(2026, 7, 4)).first?.name == "Independence Day")
    }

    @Test func serviceMergesDistinctHolidaysOnTheSameDay() async {
        let extra = Holiday(name: "Company Offsite", date: date(2026, 7, 4))
        let service = HolidayService(providers: [provider, StubHolidayProvider([extra])])

        await service.loadYear(containing: date(2026, 7, 4), calendar: calendar)

        #expect(service.holidays(on: date(2026, 7, 4)).map(\.name) == ["Company Offsite", "Independence Day"])
    }

    @Test func aDeniedProviderLeavesTheUIHolidayFreeWithoutError() async {
        // An empty provider stands in for denied calendar access.
        let service = HolidayService(providers: [StubHolidayProvider()])

        await service.loadYear(containing: date(2026, 7, 4), calendar: calendar)

        #expect(service.holidays(on: date(2026, 7, 4)).isEmpty)
        #expect(service.holidays(on: date(2026, 12, 25)).isEmpty)
    }

    @Test func builtInHolidaysSurviveAlongsideADeniedProvider() async {
        let service = HolidayService(providers: [provider, StubHolidayProvider()])

        await service.loadYear(containing: date(2026, 7, 4), calendar: calendar)

        #expect(service.holidays(on: date(2026, 7, 4)).first?.name == "Independence Day")
        #expect(service.holidays(on: date(2026, 7, 3)).isEmpty)
    }

    @Test func lookupIgnoresTimeOfDay() async {
        let service = HolidayService(providers: [provider])
        await service.loadYear(containing: date(2026, 7, 4), calendar: calendar)

        let afternoon = calendar.date(byAdding: .hour, value: 15, to: date(2026, 7, 4))!
        #expect(service.holidays(on: afternoon).first?.name == "Independence Day")
    }
}
