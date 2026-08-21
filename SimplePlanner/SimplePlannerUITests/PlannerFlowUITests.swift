import XCTest

final class PlannerFlowUITests: XCTestCase {

    func testWeekPagePersistenceAndHolidays() throws {
        let app = XCUIApplication()
        app.launch()

        // 7 dated day sections
        for weekday in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] {
            XCTAssertTrue(app.staticTexts[weekday].waitForExistence(timeout: 5), "missing \(weekday)")
        }
        XCTAssertEqual(app.textFields.count, 7, "expected one add field per day")

        // Add a task to the third day only
        let title = "Task-\(UUID().uuidString.prefix(6))"
        let field = app.textFields.element(boundBy: 2)
        field.tap()
        field.typeText(title)
        app.typeText("\n")
        XCTAssertTrue(app.staticTexts[title].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts.matching(identifier: title).count, 1, "task leaked into other days")

        // Persistence across relaunch
        app.terminate()
        app.launch()
        XCTAssertTrue(app.staticTexts[title].waitForExistence(timeout: 10), "task did not persist")

        // Mini calendar: page back one month and tap the 4th (July 2026)
        app.buttons["Previous month"].tap()
        XCTAssertTrue(app.staticTexts["July 2026"].waitForExistence(timeout: 5))
        app.buttons["4"].firstMatch.tap()

        XCTAssertTrue(app.staticTexts["Independence Day"].waitForExistence(timeout: 5),
                      "built-in holiday missing")
        XCTAssertTrue(app.staticTexts["Jun 29 – Jul 5, 2026"].waitForExistence(timeout: 5),
                      "week page did not follow the mini calendar")

        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.lifetime = .keepAlways
        shot.name = "planner-july-2026"
        add(shot)
    }
}
