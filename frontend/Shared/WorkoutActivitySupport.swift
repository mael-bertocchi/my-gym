#if os(iOS)
import ActivityKit
import AppIntents
import Foundation

struct WorkoutActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var session: WorkoutSessionState
    }

    var workoutId: String
}

@MainActor
enum WorkoutIntentBus {
    static var handler: ((WatchCommand) async -> Void)?

    static func dispatch(_ command: WatchCommand) async {
        await handler?(command)
    }
}

struct PauseWorkoutIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Pause Workout"

    func perform() async throws -> some IntentResult {
        await WorkoutIntentBus.dispatch(.pause)
        return .result()
    }
}

struct ResumeWorkoutIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Resume Workout"

    func perform() async throws -> some IntentResult {
        await WorkoutIntentBus.dispatch(.resume)
        return .result()
    }
}

struct SkipRestIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Skip Rest"

    func perform() async throws -> some IntentResult {
        await WorkoutIntentBus.dispatch(.skipRest)
        return .result()
    }
}
#endif
