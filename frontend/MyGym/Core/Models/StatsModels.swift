import Foundation

struct StatsOverview: Codable, Equatable {
    struct Totals: Codable, Equatable {
        var workouts: Int
        var volume: Double
        var sets: Int
        var reps: Int
        var durationSeconds: Int
    }

    struct Streak: Codable, Equatable {
        var currentWeeks: Int
        var longestWeeks: Int
    }

    struct Frequency: Codable, Equatable {
        var last7Days: Int
        var last30Days: Int
        var workoutsPerWeek: Double
    }

    struct RecentVolume: Codable, Equatable {
        var last7Days: Double
        var last30Days: Double
    }

    var totals: Totals
    var streak: Streak
    var frequency: Frequency
    var recentVolume: RecentVolume
}

struct VolumeStats: Codable, Equatable {
    struct Bucket: Codable, Equatable, Identifiable {
        var start: Date
        var workoutCount: Int
        var totalDurationSeconds: Int
        var totalVolume: Double
        var totalReps: Int
        var totalSets: Int

        var id: Date { start }
    }

    struct Summary: Codable, Equatable {
        var workoutCount: Int
        var totalDurationSeconds: Int
        var totalVolume: Double
        var totalReps: Int
        var totalSets: Int
    }

    var buckets: [Bucket]
    var summary: Summary
}

struct MuscleDistribution: Codable, Equatable {
    struct Entry: Codable, Equatable, Identifiable {
        var muscle: MuscleGroup
        var sets: Double
        var volume: Double

        var id: MuscleGroup { muscle }
    }

    var muscles: [Entry]
}

struct PersonalRecords: Codable, Equatable {
    struct Record: Codable, Equatable, Identifiable {
        var exerciseId: String
        var exerciseName: String
        var heaviestKg: Double?
        var bestEstimated1RM: Double?
        var bestVolume: Double?

        var id: String { exerciseId }
    }

    var records: [Record]
}

struct WorkoutCalendar: Codable, Equatable {
    struct Day: Codable, Equatable, Identifiable {
        var date: String
        var workoutCount: Int
        var totalVolume: Double

        var id: String { date }
    }

    var days: [Day]
}

struct ExerciseStats: Codable, Equatable {
    struct Session: Codable, Equatable, Identifiable {
        var date: Date
        var setCount: Int
        var totalReps: Int
        var totalVolume: Double
        var maxWeightKg: Double?
        var bestEstimated1RM: Double?

        var id: Date { date }
    }

    struct RepPR: Codable, Equatable, Identifiable {
        var reps: Int
        var weightKg: Double
        var estimated1RM: Double

        var id: Int { reps }
    }

    struct Summary: Codable, Equatable {
        var sessionCount: Int
        var maxWeightKg: Double?
        var bestEstimated1RM: Double?
        var bestTotalVolume: Double?
        var repPRs: [RepPR]
    }

    var exerciseId: String
    var sessions: [Session]
    var summary: Summary
}
