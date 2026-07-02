import Foundation
import SwiftUI
import UniformTypeIdentifiers

struct ProfileExportDocument: FileDocument {
    static var readableContentTypes: [UTType] = [.json, .commaSeparatedText]

    var data: Data

    init(data: Data) {
        self.data = data
    }

    init(configuration: ReadConfiguration) throws {
        data = configuration.file.regularFileContents ?? Data()
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

enum ProfileDataExporter {
    static func dateStamp() -> String {
        dayFormatter.string(from: .now)
    }

    private struct ExportUser: Encodable {
        var email: String
        var displayName: String
        var weightUnit: WeightUnit
    }

    private struct ExportEnvelope: Encodable {
        var exportedAt: Date
        var user: ExportUser?
        var gyms: [Gym]
        var brands: [Brand]
        var equipment: [Equipment]
        var exerciseGroups: [ExerciseGroup]
        var exercises: [Exercise]
        var workouts: [LocalWorkout]
        var exerciseSettings: [LocalExerciseSetting]
    }

    @MainActor
    static func jsonData(store: LocalStore, user: UserProfile?) throws -> Data {
        let envelope = ExportEnvelope(
            exportedAt: .now,
            user: user.map {
                ExportUser(email: $0.email, displayName: $0.displayName, weightUnit: $0.weightUnit)
            },
            gyms: store.gyms,
            brands: store.brands,
            equipment: store.equipment,
            exerciseGroups: store.exerciseGroups,
            exercises: store.exercises,
            workouts: store.workouts,
            exerciseSettings: store.exerciseSettings
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        return try encoder.encode(envelope)
    }

    @MainActor
    static func csvData(store: LocalStore) -> Data {
        var lines = ["date,workout,gym,exercise,brand,set_number,set_type,weight_kg,reps,completed"]
        let finished = store.workouts
            .filter { $0.endedAt != nil }
            .sorted { $0.startedAt < $1.startedAt }
        for workout in finished {
            let date = dayFormatter.string(from: workout.startedAt)
            let workoutName = csvField(workout.name ?? "")
            let gymName = csvField(store.gym(id: workout.gymId)?.name ?? "")
            for entry in workout.exercises.sorted(by: { $0.position < $1.position }) {
                let exercise = store.exercise(id: entry.exerciseId)
                let exerciseName = csvField(exercise?.name ?? entry.exerciseId)
                let brand = csvField(exercise.map { store.brandLine(for: $0).text } ?? "")
                for set in entry.sets.sorted(by: { $0.setNumber < $1.setNumber }) {
                    lines.append([
                        date,
                        workoutName,
                        gymName,
                        exerciseName,
                        brand,
                        String(set.setNumber),
                        set.setType.rawValue,
                        csvNumber(set.weightKg),
                        set.reps.map { String($0) } ?? "",
                        set.isCompleted ? "true" : "false",
                    ].joined(separator: ","))
                }
            }
        }
        return Data((lines.joined(separator: "\n") + "\n").utf8)
    }

    private static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static func csvField(_ raw: String) -> String {
        guard raw.contains(",") || raw.contains("\"") || raw.contains("\n") || raw.contains("\r") else {
            return raw
        }
        return "\"" + raw.replacingOccurrences(of: "\"", with: "\"\"") + "\""
    }

    private static func csvNumber(_ value: Double?) -> String {
        guard let value else { return "" }
        if value.truncatingRemainder(dividingBy: 1) == 0 {
            return String(format: "%.0f", value)
        }
        return String(value)
    }
}
