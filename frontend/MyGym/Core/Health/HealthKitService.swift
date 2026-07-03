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
    private static let bodyMassType = HKQuantityType(.bodyMass)

    private var uuidMap: [String: String] = [:]

    #if DEBUG
    var demoBodyweight: [BodyweightSample]?
    #endif

    init() {
        uuidMap = Self.loadUUIDMap()
    }

    func requestAuthorization() async {
        guard Self.isHealthDataAvailable else { return }
        do {
            try await healthStore.requestAuthorization(
                toShare: [Self.workoutType, Self.bodyMassType],
                read: [Self.bodyMassType]
            )
        } catch {
            logger.error("HealthKit authorization request failed: \(error.localizedDescription)")
        }
    }

    func enableSync() async -> Bool {
        guard Self.isHealthDataAvailable else {
            isEnabled = false
            return false
        }
        await requestAuthorization()
        let granted = healthStore.authorizationStatus(for: Self.workoutType) == .sharingAuthorized
        isEnabled = granted
        return granted
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

        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .traditionalStrengthTraining
        let builder = HKWorkoutBuilder(healthStore: healthStore, configuration: configuration, device: nil)

        do {
            try await builder.beginCollection(at: workout.startedAt)
            try await builder.addMetadata(metadata)
            try await builder.endCollection(at: endedAt)
            guard let hkWorkout = try await builder.finishWorkout() else {
                logger.error("HealthKit returned no workout for \(workout.id)")
                return
            }
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

    func bodyweightHistory() async -> [BodyweightSample] {
        #if DEBUG
        if let demoBodyweight {
            return Self.collapsePerDay(demoBodyweight)
        }
        #endif
        guard Self.isHealthDataAvailable else { return [] }
        await requestAuthorization()
        let descriptor = HKSampleQueryDescriptor(
            predicates: [.quantitySample(type: Self.bodyMassType)],
            sortDescriptors: [SortDescriptor(\.endDate, order: .reverse)],
            limit: 120
        )
        do {
            let samples = try await descriptor.result(for: healthStore)
            return Self.collapsePerDay(samples.map { sample in
                BodyweightSample(
                    date: sample.endDate,
                    weightKg: sample.quantity.doubleValue(for: .gramUnit(with: .kilo))
                )
            })
        } catch {
            logger.error("HealthKit body mass fetch failed: \(error.localizedDescription)")
            return []
        }
    }

    func saveBodyweight(kilograms: Double) async {
        #if DEBUG
        if demoBodyweight != nil {
            demoBodyweight?.append(BodyweightSample(date: .now, weightKg: kilograms))
            return
        }
        #endif
        guard Self.isHealthDataAvailable else { return }
        await requestAuthorization()
        let now = Date.now
        let sample = HKQuantitySample(
            type: Self.bodyMassType,
            quantity: HKQuantity(unit: .gramUnit(with: .kilo), doubleValue: kilograms),
            start: now,
            end: now
        )
        do {
            try await healthStore.save(sample)
        } catch {
            logger.error("HealthKit body mass save failed: \(error.localizedDescription)")
        }
    }

    private static func collapsePerDay(_ samples: [BodyweightSample]) -> [BodyweightSample] {
        let calendar = Calendar.current
        var latestByDay: [Date: BodyweightSample] = [:]
        for sample in samples {
            let day = calendar.startOfDay(for: sample.date)
            if let current = latestByDay[day], current.date > sample.date { continue }
            latestByDay[day] = sample
        }
        return latestByDay.values.sorted { $0.date < $1.date }
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

struct BodyweightSample: Identifiable, Equatable {
    let date: Date
    let weightKg: Double

    var id: Date { date }
}
