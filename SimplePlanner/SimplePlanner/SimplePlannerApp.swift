//
//  SimplePlannerApp.swift
//  SimplePlanner
//
//  Created by David Do on 8/19/26.
//

import SwiftData
import SwiftUI

@main
struct SimplePlannerApp: App {
    var body: some Scene {
        WindowGroup {
            PlannerView()
        }
        .modelContainer(for: PlannerTask.self)
    }
}
