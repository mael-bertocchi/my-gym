import Foundation

struct SyncPull: Codable {
    struct Catalog: Codable {
        var brands: [Brand]
        var equipment: [Equipment]
        var exerciseGroups: [ExerciseGroup]
        var exercises: [Exercise]
        var gyms: [Gym]
    }

    struct Deletion: Codable {
        var entityType: SyncEntityType
        var entityId: String
        var deletedAt: Date
    }

    var serverTime: Date
    var catalog: Catalog
    var workouts: [WorkoutDetail]
    var exerciseSettings: [ExerciseSetting]
    var deletions: [Deletion]
}

struct SyncPush: Codable {
    struct DeletionRequest: Codable {
        var entityType: SyncEntityType
        var entityId: String
    }

    var workouts: [LocalWorkout]
    var exerciseSettings: [LocalExerciseSetting]
    var deletions: [DeletionRequest]
}

struct SyncPushResult: Codable {
    struct WorkoutResult: Codable {
        var id: String
        var status: String
        var workout: WorkoutDetail?
        var message: String?
    }

    struct SettingResult: Codable {
        var id: String
        var status: String
        var setting: ExerciseSetting?
        var message: String?
    }

    struct DeletionResult: Codable {
        var entityType: SyncEntityType
        var entityId: String
        var status: String
    }

    struct Results: Codable {
        var workouts: [WorkoutResult]
        var exerciseSettings: [SettingResult]
        var deletions: [DeletionResult]
    }

    var serverTime: Date
    var results: Results
}
