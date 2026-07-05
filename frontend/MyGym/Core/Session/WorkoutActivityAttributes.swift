import ActivityKit
import Foundation

struct WorkoutActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var workoutName: String
        var timerStart: Date
        var pausedAt: Date?
        var exerciseCount: Int
        var completedSets: Int
        var totalSets: Int
        var restEndsAt: Date?
        var exerciseName: String?
        var setDetail: String?
    }
}
