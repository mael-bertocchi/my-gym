import Foundation

struct LocalWorkout: Codable, Identifiable, Equatable {
    var id: String
    var gymId: String?
    var name: String?
    var startedAt: Date
    var endedAt: Date?
    var notes: String?
    var updatedAt: Date
    var exercises: [LocalWorkoutExercise]

    init(
        id: String = UUID().uuidString.lowercased(),
        gymId: String? = nil,
        name: String? = nil,
        startedAt: Date = .now,
        endedAt: Date? = nil,
        notes: String? = nil,
        updatedAt: Date = .now,
        exercises: [LocalWorkoutExercise] = []
    ) {
        self.id = id
        self.gymId = gymId
        self.name = name
        self.startedAt = startedAt
        self.endedAt = endedAt
        self.notes = notes
        self.updatedAt = updatedAt
        self.exercises = exercises
    }
}

struct LocalWorkoutExercise: Codable, Identifiable, Equatable {
    var id: String
    var exerciseId: String
    var position: Int
    var notes: String?
    var settings: [String: JSONValue]?
    var sets: [LocalSet]

    init(
        id: String = UUID().uuidString.lowercased(),
        exerciseId: String,
        position: Int,
        notes: String? = nil,
        settings: [String: JSONValue]? = nil,
        sets: [LocalSet] = []
    ) {
        self.id = id
        self.exerciseId = exerciseId
        self.position = position
        self.notes = notes
        self.settings = settings
        self.sets = sets
    }
}

struct LocalSet: Codable, Identifiable, Equatable {
    var id: String
    var setNumber: Int
    var setType: SetType
    var weightKg: Double?
    var reps: Int?
    var distanceM: Double?
    var durationSeconds: Int?
    var isCompleted: Bool

    init(
        id: String = UUID().uuidString.lowercased(),
        setNumber: Int,
        setType: SetType = .normal,
        weightKg: Double? = nil,
        reps: Int? = nil,
        distanceM: Double? = nil,
        durationSeconds: Int? = nil,
        isCompleted: Bool = false
    ) {
        self.id = id
        self.setNumber = setNumber
        self.setType = setType
        self.weightKg = weightKg
        self.reps = reps
        self.distanceM = distanceM
        self.durationSeconds = durationSeconds
        self.isCompleted = isCompleted
    }
}

struct BodyweightEntry: Codable, Identifiable, Equatable {
    var id: String
    var date: Date
    var weightKg: Double

    init(
        id: String = UUID().uuidString.lowercased(),
        date: Date = .now,
        weightKg: Double
    ) {
        self.id = id
        self.date = date
        self.weightKg = weightKg
    }
}

struct LocalExerciseSetting: Codable, Identifiable, Equatable {
    var id: String
    var exerciseId: String
    var gymId: String
    var settings: [String: JSONValue]
    var updatedAt: Date

    init(
        id: String = UUID().uuidString.lowercased(),
        exerciseId: String,
        gymId: String,
        settings: [String: JSONValue],
        updatedAt: Date = .now
    ) {
        self.id = id
        self.exerciseId = exerciseId
        self.gymId = gymId
        self.settings = settings
        self.updatedAt = updatedAt
    }
}

extension LocalSet {
    var estimated1RM: Double? {
        guard let weightKg, let reps, reps > 0 else { return nil }
        return weightKg * (1 + Double(reps) / 30)
    }

    var volume: Double {
        guard let weightKg, let reps else { return 0 }
        return weightKg * Double(reps)
    }
}

extension LocalWorkout {
    var totalVolume: Double {
        exercises.flatMap(\.sets)
            .filter { $0.setType == .normal && $0.isCompleted }
            .reduce(0) { $0 + $1.volume }
    }

    var completedSetCount: Int {
        exercises.flatMap(\.sets).filter(\.isCompleted).count
    }

    var duration: TimeInterval? {
        guard let endedAt else { return nil }
        return endedAt.timeIntervalSince(startedAt)
    }
}

extension WorkoutDetail {
    var asLocalWorkout: LocalWorkout {
        LocalWorkout(
            id: id,
            gymId: gymId,
            name: name,
            startedAt: startedAt,
            endedAt: endedAt,
            notes: notes,
            updatedAt: updatedAt,
            exercises: entries
                .sorted { $0.position < $1.position }
                .map { entry in
                    LocalWorkoutExercise(
                        id: entry.id,
                        exerciseId: entry.exerciseId,
                        position: entry.position,
                        notes: entry.notes,
                        settings: entry.settings,
                        sets: entry.sets
                            .sorted { $0.setNumber < $1.setNumber }
                            .map { set in
                                LocalSet(
                                    id: set.id,
                                    setNumber: set.setNumber,
                                    setType: set.setType,
                                    weightKg: set.weightKg.double,
                                    reps: set.reps,
                                    distanceM: set.distanceM.double,
                                    durationSeconds: set.durationSeconds,
                                    isCompleted: set.isCompleted
                                )
                            }
                    )
                }
        )
    }
}
