//
//  HolidayProviding.swift
//  SimplePlanner
//

import Foundation

/// The seam that keeps tests off real EventKit: anything that can name some days
/// in a date range. Implementations never throw — a provider that cannot answer
/// (denied permission, no subscribed calendar) returns an empty array.
protocol HolidayProviding: Sendable {
    func holidays(in range: ClosedRange<Date>) async -> [Holiday]
}
