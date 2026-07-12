import Foundation

struct WorkoutSessionState: Codable, Hashable {
    struct Rest: Codable, Hashable {
        var endsAt: Date
        var totalSeconds: Int
        var roundDone: Int?

        var startedAt: Date {
            endsAt.addingTimeInterval(-TimeInterval(totalSeconds))
        }

        func remainingSeconds(at date: Date = .now) -> Int {
            max(0, Int(endsAt.timeIntervalSince(date).rounded()))
        }

        func progress(at date: Date = .now) -> Double {
            guard totalSeconds > 0 else { return 1 }
            return min(1, max(0, 1 - Double(remainingSeconds(at: date)) / Double(totalSeconds)))
        }

        var eyebrow: String {
            roundDone.map { "REST · ROUND \($0) DONE" } ?? "REST"
        }
    }

    struct TargetSet: Codable, Hashable {
        var entryId: String
        var setId: String
        var exerciseName: String
        var setNumber: Int
        var setCount: Int
        var completedNumbers: [Int]
        var weightKg: Double?
        var reps: Int?
        var isWeighted: Bool
        var weightStep: Double
        var supersetLetter: String?
        var partnerLetter: String?
        var partnerName: String?

        var valueLine: String {
            let repsPart = "\(reps ?? 0)"
            guard isWeighted, let weightKg else { return "\(repsPart) reps" }
            return "\(Formatting.spacedWeight(weightKg)) × \(repsPart)"
        }

        var supersetEyebrow: String? {
            supersetLetter.map { "SUPERSET \($0) · SET \(setNumber) OF \(setCount)" }
        }
    }

    struct PersonalRecord: Codable, Hashable {
        var setId: String
        var exerciseName: String
        var weightKg: Double
        var reps: Int?

        var valueLine: String {
            let weight = Formatting.spacedWeight(weightKg)
            return reps.map { "\(weight) × \($0)" } ?? weight
        }
    }

    var workoutId: String
    var workoutName: String
    var startedAt: Date
    var pausedAt: Date?
    var pausedSeconds: TimeInterval
    var completedSets: Int
    var totalSets: Int
    var heartRate: Int?
    var rest: Rest?
    var target: TargetSet?
    var personalRecord: PersonalRecord?

    var isPaused: Bool { pausedAt != nil }

    var isResting: Bool { rest != nil && !isPaused }

    var elapsedReferenceDate: Date {
        startedAt.addingTimeInterval(pausedSeconds)
    }

    func elapsed(at date: Date = .now) -> TimeInterval {
        max(0, (pausedAt ?? date).timeIntervalSince(startedAt) - pausedSeconds)
    }
}

struct WorkoutSessionSummary: Codable, Hashable {
    var workoutId: String
    var name: String
    var endedAt: Date
    var durationSeconds: Int
    var sets: Int
    var volumeKg: Double
    var records: Int
}

struct WatchContextPayload: Codable {
    var session: WorkoutSessionState?
    var lastWorkoutName: String?
    var summary: WorkoutSessionSummary?
}

enum WatchCommand: Codable {
    case logTarget(entryId: String, setId: String, weightKg: Double?, reps: Int)
    case adjustRest(seconds: Int)
    case skipRest
    case expireRest
    case pause
    case resume
    case finish
    case discard
    case startWorkout
    case repeatLast
    case openPhone
    case heartRate(bpm: Int)
    case calories(kcal: Int)
    case requestSync
}

enum WatchEnvelope {
    static let commandKey = "command"
    static let contextKey = "payload"

    private static var encoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .secondsSince1970
        return encoder
    }

    private static var decoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .secondsSince1970
        return decoder
    }

    static func encode<Value: Encodable>(_ value: Value, key: String) -> [String: Any]? {
        guard let data = try? encoder.encode(value) else { return nil }
        return [key: data]
    }

    static func decode<Value: Decodable>(_ type: Value.Type, from dictionary: [String: Any], key: String) -> Value? {
        guard let data = dictionary[key] as? Data else { return nil }
        return try? decoder.decode(type, from: data)
    }
}
