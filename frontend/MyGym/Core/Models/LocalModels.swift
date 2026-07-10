import Foundation

struct LocalWorkout: Codable, Identifiable, Equatable {
    var id: String
    var gymId: String?
    var name: String?
    var startedAt: Date
    var endedAt: Date?
    var notes: String?
    var averageHeartRate: Int?
    var difficultyRating: Int?
    var enjoymentRating: Int?
    var updatedAt: Date
    var exercises: [LocalWorkoutExercise]

    init(
        id: String = UUID().uuidString.lowercased(),
        gymId: String? = nil,
        name: String? = nil,
        startedAt: Date = .now,
        endedAt: Date? = nil,
        notes: String? = nil,
        averageHeartRate: Int? = nil,
        difficultyRating: Int? = nil,
        enjoymentRating: Int? = nil,
        updatedAt: Date = .now,
        exercises: [LocalWorkoutExercise] = []
    ) {
        self.id = id
        self.gymId = gymId
        self.name = name
        self.startedAt = startedAt
        self.endedAt = endedAt
        self.notes = notes
        self.averageHeartRate = averageHeartRate
        self.difficultyRating = difficultyRating
        self.enjoymentRating = enjoymentRating
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
    var supersetId: String?
    var brandId: String?
    var sets: [LocalSet]

    init(
        id: String = UUID().uuidString.lowercased(),
        exerciseId: String,
        position: Int,
        notes: String? = nil,
        settings: [String: JSONValue]? = nil,
        supersetId: String? = nil,
        brandId: String? = nil,
        sets: [LocalSet] = []
    ) {
        self.id = id
        self.exerciseId = exerciseId
        self.position = position
        self.notes = notes
        self.settings = settings
        self.supersetId = supersetId
        self.brandId = brandId
        self.sets = sets
    }
}

struct LocalSet: Codable, Identifiable, Equatable {
    var id: String
    var setNumber: Int
    var setType: SetType
    var side: SetSide?
    var weightKg: Double?
    var reps: Int?
    var distanceM: Double?
    var durationSeconds: Int?
    var isCompleted: Bool

    init(
        id: String = UUID().uuidString.lowercased(),
        setNumber: Int,
        setType: SetType = .normal,
        side: SetSide? = nil,
        weightKg: Double? = nil,
        reps: Int? = nil,
        distanceM: Double? = nil,
        durationSeconds: Int? = nil,
        isCompleted: Bool = false
    ) {
        self.id = id
        self.setNumber = setNumber
        self.setType = setType
        self.side = side
        self.weightKg = weightKg
        self.reps = reps
        self.distanceM = distanceM
        self.durationSeconds = durationSeconds
        self.isCompleted = isCompleted
    }
}

struct LocalExerciseSetting: Codable, Identifiable, Equatable {
    var id: String
    var exerciseId: String
    var settings: [String: JSONValue]
    var updatedAt: Date

    init(
        id: String = UUID().uuidString.lowercased(),
        exerciseId: String,
        settings: [String: JSONValue],
        updatedAt: Date = .now
    ) {
        self.id = id
        self.exerciseId = exerciseId
        self.settings = settings
        self.updatedAt = updatedAt
    }
}

extension LocalWorkoutExercise {
    var setRounds: [[LocalSet]] {
        var order: [Int] = []
        var groups: [Int: [LocalSet]] = [:]
        for set in sets {
            if groups[set.setNumber] == nil {
                order.append(set.setNumber)
            }
            groups[set.setNumber, default: []].append(set)
        }
        return order.map { groups[$0]! }
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

enum Superset {
    enum Grouping: Identifiable {
        case single(LocalWorkoutExercise)
        case pair(id: String, members: [LocalWorkoutExercise])

        var id: String {
            switch self {
            case .single(let entry): entry.id
            case .pair(let id, _): "superset-\(id)"
            }
        }
    }

    static func groupings(in workout: LocalWorkout) -> [Grouping] {
        var pairedIds: Set<String> = []
        var items: [Grouping] = []
        for entry in workout.exercises.sorted(by: { $0.position < $1.position }) {
            guard let supersetId = entry.supersetId else {
                items.append(.single(entry))
                continue
            }
            if pairedIds.contains(supersetId) { continue }
            let members = members(of: supersetId, in: workout)
            if members.count == 2 {
                pairedIds.insert(supersetId)
                items.append(.pair(id: supersetId, members: members))
            } else {
                items.append(.single(entry))
            }
        }
        return items
    }

    static func members(of supersetId: String, in workout: LocalWorkout) -> [LocalWorkoutExercise] {
        workout.exercises
            .filter { $0.supersetId == supersetId }
            .sorted { $0.position < $1.position }
    }

    static func nextIncompleteSet(in members: [LocalWorkoutExercise]) -> (entryId: String, round: Int, setId: String)? {
        for round in 0..<totalRounds(in: members) {
            for member in members {
                let rounds = member.setRounds
                guard round < rounds.count else { continue }
                if let set = rounds[round].first(where: { !$0.isCompleted }) {
                    return (member.id, round, set.id)
                }
            }
        }
        return nil
    }

    static func isRoundComplete(in members: [LocalWorkoutExercise], round: Int) -> Bool {
        members.allSatisfy { member in
            let rounds = member.setRounds
            return round >= rounds.count || rounds[round].allSatisfy(\.isCompleted)
        }
    }

    static func totalRounds(in members: [LocalWorkoutExercise]) -> Int {
        members.map { $0.setRounds.count }.max() ?? 0
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
            averageHeartRate: averageHeartRate,
            difficultyRating: difficultyRating,
            enjoymentRating: enjoymentRating,
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
                        supersetId: entry.supersetId,
                        brandId: entry.brandId,
                        sets: entry.sets
                            .sorted { $0.setNumber < $1.setNumber }
                            .map { set in
                                LocalSet(
                                    id: set.id,
                                    setNumber: set.setNumber,
                                    setType: set.setType,
                                    side: set.side,
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
