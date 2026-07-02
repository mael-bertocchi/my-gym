import Foundation

enum EquipmentType: String, Codable, CaseIterable, Identifiable {
    case machine = "MACHINE"
    case barbell = "BARBELL"
    case dumbbell = "DUMBBELL"
    case cable = "CABLE"
    case smith = "SMITH"
    case bodyweight = "BODYWEIGHT"
    case kettlebell = "KETTLEBELL"
    case cardio = "CARDIO"
    case other = "OTHER"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .machine: return "Machine"
        case .barbell: return "Barbell"
        case .dumbbell: return "Dumbbell"
        case .cable: return "Cable"
        case .smith: return "Smith"
        case .bodyweight: return "Bodyweight"
        case .kettlebell: return "Kettlebell"
        case .cardio: return "Cardio"
        case .other: return "Other"
        }
    }
}

enum MuscleGroup: String, Codable, CaseIterable, Identifiable {
    case chest = "CHEST"
    case upperBack = "UPPER_BACK"
    case lats = "LATS"
    case lowerBack = "LOWER_BACK"
    case trapezius = "TRAPEZIUS"
    case frontDelts = "FRONT_DELTS"
    case sideDelts = "SIDE_DELTS"
    case rearDelts = "REAR_DELTS"
    case biceps = "BICEPS"
    case triceps = "TRICEPS"
    case forearms = "FOREARMS"
    case quadriceps = "QUADRICEPS"
    case hamstrings = "HAMSTRINGS"
    case glutes = "GLUTES"
    case calves = "CALVES"
    case abs = "ABS"
    case obliques = "OBLIQUES"
    case adductors = "ADDUCTORS"
    case abductors = "ABDUCTORS"
    case neck = "NECK"
    case fullBody = "FULL_BODY"

    var id: String { rawValue }

    var label: String {
        rawValue.split(separator: "_")
            .map { $0.prefix(1) + $0.dropFirst().lowercased() }
            .joined(separator: " ")
    }
}

enum SetType: String, Codable, CaseIterable, Identifiable {
    case warmup = "WARMUP"
    case normal = "NORMAL"
    case drop = "DROP"
    case failure = "FAILURE"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .warmup: return "Warmup"
        case .normal: return "Normal"
        case .drop: return "Drop"
        case .failure: return "Failure"
        }
    }
}

enum MessageRole: String, Codable {
    case user = "USER"
    case assistant = "ASSISTANT"
}

enum SyncEntityType: String, Codable {
    case workout = "WORKOUT"
    case exerciseSetting = "EXERCISE_SETTING"
}

struct UserProfile: Codable, Identifiable, Equatable, Hashable {
    var id: String
    var email: String
    var displayName: String
    var isAdministrator: Bool
    var isActive: Bool
    var weightUnit: WeightUnit
    var defaultGymId: String?
    var createdAt: Date
    var updatedAt: Date
}

struct TokenPair: Codable {
    var accessToken: String
    var refreshToken: String
}

struct Brand: Codable, Identifiable, Equatable, Hashable {
    var id: String
    var name: String
    var createdAt: Date
    var updatedAt: Date
}

struct Equipment: Codable, Identifiable, Equatable, Hashable {
    var id: String
    var name: String
    var type: EquipmentType
    var brandId: String?
    var createdAt: Date
    var updatedAt: Date
}

struct ExerciseGroup: Codable, Identifiable, Equatable, Hashable {
    var id: String
    var name: String
    var createdAt: Date
    var updatedAt: Date
}

struct Exercise: Codable, Identifiable, Equatable, Hashable {
    var id: String
    var name: String
    var primaryMuscle: MuscleGroup
    var secondaryMuscles: [MuscleGroup]
    var equipmentId: String?
    var groupId: String?
    var isFavorite: Bool
    var isArchived: Bool
    var createdAt: Date
    var updatedAt: Date
}

struct Gym: Codable, Identifiable, Equatable, Hashable {
    var id: String
    var name: String
    var address: String?
    var notes: String?
    var createdAt: Date
    var updatedAt: Date
}

struct WorkoutSummary: Codable, Identifiable, Equatable {
    var id: String
    var gymId: String?
    var name: String?
    var startedAt: Date
    var endedAt: Date?
    var notes: String?
    var createdAt: Date
    var updatedAt: Date
}

struct WorkoutSet: Codable, Identifiable, Equatable, Hashable {
    var id: String
    var setNumber: Int
    var setType: SetType
    var weightKg: LenientDouble?
    var reps: Int?
    var distanceM: LenientDouble?
    var durationSeconds: Int?
    var isCompleted: Bool
    var createdAt: Date?
}

struct WorkoutEntryExercise: Codable, Equatable, Hashable {
    var id: String
    var name: String
    var primaryMuscle: MuscleGroup
    var equipmentId: String?
    var groupId: String?
}

struct WorkoutEntry: Codable, Identifiable, Equatable {
    var id: String
    var exerciseId: String
    var position: Int
    var notes: String?
    var settings: [String: JSONValue]?
    var createdAt: Date
    var exercise: WorkoutEntryExercise
    var sets: [WorkoutSet]
}

struct WorkoutDetail: Codable, Identifiable, Equatable {
    var id: String
    var gymId: String?
    var name: String?
    var startedAt: Date
    var endedAt: Date?
    var notes: String?
    var createdAt: Date
    var updatedAt: Date
    var entries: [WorkoutEntry]
}

struct WorkoutExercise: Codable, Identifiable, Equatable {
    var id: String
    var workoutId: String
    var exerciseId: String
    var position: Int
    var notes: String?
    var settings: [String: JSONValue]?
    var createdAt: Date
}

struct SetWriteResult: Codable {
    var set: WorkoutSet
    var personalRecords: [PersonalRecordHit]
}

struct PersonalRecordHit: Codable, Equatable {
    var type: String
    var value: Double
}

struct ExerciseSetting: Codable, Identifiable, Equatable {
    var id: String
    var exerciseId: String
    var gymId: String
    var settings: [String: JSONValue]
    var createdAt: Date
    var updatedAt: Date
}

struct HistorySession: Codable, Identifiable, Equatable {
    var workoutExerciseId: String
    var workoutId: String
    var date: Date
    var gymId: String?
    var notes: String?
    var sets: [WorkoutSet]

    var id: String { workoutExerciseId }
}

struct ExerciseHistory: Codable {
    var exerciseId: String
    var sessions: [HistorySession]
}

struct ExerciseLast: Codable {
    var exerciseId: String
    var last: HistorySession?
    var settings: [String: JSONValue]?
}

struct Conversation: Codable, Identifiable, Equatable {
    var id: String
    var title: String?
    var createdAt: Date
    var updatedAt: Date
}

struct ConversationDetail: Codable, Identifiable, Equatable {
    var id: String
    var title: String?
    var createdAt: Date
    var updatedAt: Date
    var messages: [ChatMessage]
}

struct ChatMessage: Codable, Identifiable, Equatable {
    var id: String
    var role: MessageRole
    var content: String
    var createdAt: Date
}

extension WorkoutSet {
    var estimated1RM: Double? {
        guard let weight = weightKg.double, let reps, reps > 0 else { return nil }
        return weight * (1 + Double(reps) / 30)
    }

    var volume: Double {
        guard let weight = weightKg.double, let reps else { return 0 }
        return weight * Double(reps)
    }
}

extension WorkoutDetail {
    var totalVolume: Double {
        entries.flatMap(\.sets)
            .filter { $0.setType == .normal && $0.isCompleted }
            .reduce(0) { $0 + $1.volume }
    }

    var completedSetCount: Int {
        entries.flatMap(\.sets).filter(\.isCompleted).count
    }

    var duration: TimeInterval? {
        guard let endedAt else { return nil }
        return endedAt.timeIntervalSince(startedAt)
    }
}
