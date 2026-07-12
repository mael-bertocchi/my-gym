import HealthKit
import WatchKit

final class WatchAppDelegate: NSObject, WKApplicationDelegate {
    func handle(_ workoutConfiguration: HKWorkoutConfiguration) {
        Task { @MainActor in
            WatchWorkoutLaunch.receive()
        }
    }
}

@MainActor
enum WatchWorkoutLaunch {
    private static var handler: (() -> Void)?
    private static var pending = false

    static func receive() {
        if let handler {
            handler()
        } else {
            pending = true
        }
    }

    static func drain(into handler: @escaping () -> Void) {
        self.handler = handler
        if pending {
            pending = false
            handler()
        }
    }
}
