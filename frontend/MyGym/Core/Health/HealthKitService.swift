import Foundation
import HealthKit
import Observation
import os

@MainActor
@Observable
final class HealthKitService {
    private let healthStore = HKHealthStore()
    private let logger = Logger(subsystem: "fr.mael-bertocchi.my-gym", category: "HealthKit")

    var isEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: Self.enabledKey) }
        set { UserDefaults.standard.set(newValue, forKey: Self.enabledKey) }
    }

    static var isHealthDataAvailable: Bool { HKHealthStore.isHealthDataAvailable() }

    private static let enabledKey = "healthKitSyncEnabled"
    private static let workoutType = HKObjectType.workoutType()

    private var uuidMap: [String: String] = [:]

    init() {
        uuidMap = Self.loadUUIDMap()
    }

    func requestAuthorization() async {
        guard Self.isHealthDataAvailable else { return }
        do {
            try await healthStore.requestAuthorization(toShare: [Self.workoutType], read: [])
        } catch {
            logger.error("HealthKit authorization request failed: \(error.localizedDescription)")
        }
    }

    func logWorkout(_ workout: LocalWorkout, exerciseNames: [String]) async {
        guard isEnabled, Self.isHealthDataAvailable, let endedAt = workout.endedAt else { return }

        var metadata: [String: Any] = [
            HKMetadataKeyWorkoutBrandName: "MyGym",
            HKMetadataKeyExternalUUID: workout.id,
        ]
        if !exerciseNames.isEmpty {
            metadata["MyGymExercises"] = exerciseNames.joined(separator: ", ")
        }

        let hkWorkout = HKWorkout(
            activityType: .traditionalStrengthTraining,
            start: workout.startedAt,
            end: endedAt,
            duration: endedAt.timeIntervalSince(workout.startedAt),
            totalEnergyBurned: nil,
            totalDistance: nil,
            metadata: metadata
        )

        do {
            try await healthStore.save(hkWorkout)
            uuidMap[workout.id] = hkWorkout.uuid.uuidString
            saveUUIDMap()
        } catch {
            logger.error("HealthKit save failed for workout \(workout.id): \(error.localizedDescription)")
        }
    }

    func deleteWorkout(id: String) async {
        guard let uuidString = uuidMap[id], let uuid = UUID(uuidString: uuidString) else { return }
        let predicate = HKQuery.predicateForObject(with: uuid)
        do {
            let samples = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[HKSample], Error>) in
                let query = HKSampleQuery(sampleType: Self.workoutType, predicate: predicate, limit: 1, sortDescriptors: nil) { _, samples, error in
                    if let error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume(returning: samples ?? [])
                    }
                }
                healthStore.execute(query)
            }
            if let sample = samples.first {
                try await healthStore.delete(sample)
            }
            uuidMap.removeValue(forKey: id)
            saveUUIDMap()
        } catch {
            logger.error("HealthKit delete failed for workout \(id): \(error.localizedDescription)")
        }
    }

    private static var mapFileURL: URL {
        let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory.appending(path: "healthkit-workout-map.json")
    }

    private static func loadUUIDMap() -> [String: String] {
        guard let data = try? Data(contentsOf: mapFileURL),
              let decoded = try? JSONDecoder().decode([String: String].self, from: data) else { return [:] }
        return decoded
    }

    private func saveUUIDMap() {
        guard let data = try? JSONEncoder().encode(uuidMap) else { return }
        try? data.write(to: Self.mapFileURL, options: .atomic)
    }
}
