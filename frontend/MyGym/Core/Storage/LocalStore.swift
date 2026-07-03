import Foundation
import Observation

@MainActor
@Observable
final class LocalStore {
    private(set) var brands: [Brand] = []
    private(set) var exerciseGroups: [ExerciseGroup] = []
    private(set) var exercises: [Exercise] = []
    private(set) var gyms: [Gym] = []

    private(set) var workouts: [LocalWorkout] = []
    private(set) var exerciseSettings: [LocalExerciseSetting] = []

    private(set) var lastSyncAt: Date?
    private(set) var dirtyWorkoutIds: Set<String> = []
    private(set) var dirtySettingIds: Set<String> = []
    private(set) var pendingDeletions: [SyncPush.DeletionRequest] = []

    var hasPendingChanges: Bool {
        !dirtyWorkoutIds.isEmpty || !dirtySettingIds.isEmpty || !pendingDeletions.isEmpty
    }

    init() {
        load()
    }

    func applyCatalog(_ catalog: SyncPull.Catalog) {
        brands = merge(brands, with: catalog.brands)
        exerciseGroups = merge(exerciseGroups, with: catalog.exerciseGroups)
        exercises = merge(exercises, with: catalog.exercises)
        gyms = merge(gyms, with: catalog.gyms)
        sortCatalog()
        save()
    }

    func insert(brand: Brand) { brands = merge(brands, with: [brand]); sortCatalog(); save() }
    func insert(group: ExerciseGroup) { exerciseGroups = merge(exerciseGroups, with: [group]); sortCatalog(); save() }
    func insert(exercise: Exercise) { exercises = merge(exercises, with: [exercise]); sortCatalog(); save() }
    func insert(gym: Gym) { gyms = merge(gyms, with: [gym]); sortCatalog(); save() }

    func removeBrand(id: String) { brands.removeAll { $0.id == id }; save() }
    func removeGroup(id: String) { exerciseGroups.removeAll { $0.id == id }; save() }
    func removeExercise(id: String) { exercises.removeAll { $0.id == id }; save() }
    func removeGym(id: String) { gyms.removeAll { $0.id == id }; save() }

    func brand(id: String?) -> Brand? {
        id.flatMap { id in brands.first { $0.id == id } }
    }

    func exercise(id: String) -> Exercise? {
        exercises.first { $0.id == id }
    }

    func gym(id: String?) -> Gym? {
        id.flatMap { id in gyms.first { $0.id == id } }
    }

    func brandLine(for exercise: Exercise) -> (text: String, isBranded: Bool) {
        if let brand = brand(id: exercise.brandId) {
            return (brand.name.uppercased(), true)
        }
        return ("\(exercise.equipment.rawValue) · no brand", false)
    }

    func upsertWorkout(_ workout: LocalWorkout, markDirty: Bool = true) {
        var updated = workout
        if markDirty {
            updated.updatedAt = .now
            dirtyWorkoutIds.insert(workout.id)
        }
        if let index = workouts.firstIndex(where: { $0.id == workout.id }) {
            workouts[index] = updated
        } else {
            workouts.append(updated)
        }
        workouts.sort { $0.startedAt > $1.startedAt }
        save()
    }

    func deleteWorkout(id: String) {
        workouts.removeAll { $0.id == id }
        dirtyWorkoutIds.remove(id)
        pendingDeletions.append(.init(entityType: .workout, entityId: id))
        save()
    }

    func workout(id: String) -> LocalWorkout? {
        workouts.first { $0.id == id }
    }

    func upsertSetting(exerciseId: String, settings: [String: JSONValue]) {
        if let index = exerciseSettings.firstIndex(where: { $0.exerciseId == exerciseId }) {
            exerciseSettings[index].settings = settings
            exerciseSettings[index].updatedAt = .now
            dirtySettingIds.insert(exerciseSettings[index].id)
        } else {
            let setting = LocalExerciseSetting(exerciseId: exerciseId, settings: settings)
            exerciseSettings.append(setting)
            dirtySettingIds.insert(setting.id)
        }
        save()
    }

    func deleteSetting(exerciseId: String) {
        guard let setting = setting(exerciseId: exerciseId) else { return }
        exerciseSettings.removeAll { $0.id == setting.id }
        dirtySettingIds.remove(setting.id)
        pendingDeletions.append(.init(entityType: .exerciseSetting, entityId: setting.id))
        save()
    }

    func setting(exerciseId: String) -> LocalExerciseSetting? {
        exerciseSettings.first { $0.exerciseId == exerciseId }
    }

    func snapshotForPush() -> SyncPush {
        SyncPush(
            workouts: workouts.filter { dirtyWorkoutIds.contains($0.id) },
            exerciseSettings: exerciseSettings.filter { dirtySettingIds.contains($0.id) },
            deletions: pendingDeletions
        )
    }

    func applyPushResult(_ result: SyncPushResult, pushed: SyncPush) {
        for outcome in result.results.workouts {
            switch outcome.status {
            case "applied":
                dirtyWorkoutIds.remove(outcome.id)
            case "kept_server":
                dirtyWorkoutIds.remove(outcome.id)
                if let server = outcome.workout {
                    upsertWorkout(server.asLocalWorkout, markDirty: false)
                }
            default:
                dirtyWorkoutIds.remove(outcome.id)
            }
        }
        for outcome in result.results.exerciseSettings {
            dirtySettingIds.remove(outcome.id)
            if outcome.status == "kept_server", let server = outcome.setting {
                exerciseSettings.removeAll { $0.exerciseId == server.exerciseId }
                exerciseSettings.append(LocalExerciseSetting(
                    id: server.id,
                    exerciseId: server.exerciseId,
                    settings: server.settings,
                    updatedAt: server.updatedAt
                ))
            }
        }
        let resolved = Set(result.results.deletions.map(\.entityId))
        pendingDeletions.removeAll { resolved.contains($0.entityId) }
        save()
    }

    func applyPull(_ pull: SyncPull) {
        applyCatalog(pull.catalog)
        for workout in pull.workouts {
            guard !dirtyWorkoutIds.contains(workout.id) else { continue }
            upsertWorkout(workout.asLocalWorkout, markDirty: false)
        }
        for setting in pull.exerciseSettings {
            guard !dirtySettingIds.contains(setting.id) else { continue }
            exerciseSettings.removeAll { $0.exerciseId == setting.exerciseId }
            exerciseSettings.append(LocalExerciseSetting(
                id: setting.id,
                exerciseId: setting.exerciseId,
                settings: setting.settings,
                updatedAt: setting.updatedAt
            ))
        }
        for deletion in pull.deletions {
            switch deletion.entityType {
            case .workout:
                workouts.removeAll { $0.id == deletion.entityId }
            case .exerciseSetting:
                exerciseSettings.removeAll { $0.id == deletion.entityId }
            }
        }
        lastSyncAt = pull.serverTime
        save()
    }

    func clearAll() {
        brands = []
        exerciseGroups = []
        exercises = []
        gyms = []
        workouts = []
        exerciseSettings = []
        lastSyncAt = nil
        dirtyWorkoutIds = []
        dirtySettingIds = []
        pendingDeletions = []
        try? FileManager.default.removeItem(at: Self.fileURL)
    }

    private struct Snapshot: Codable {
        var brands: [Brand]
        var exerciseGroups: [ExerciseGroup]
        var exercises: [Exercise]
        var gyms: [Gym]
        var workouts: [LocalWorkout]
        var exerciseSettings: [LocalExerciseSetting]
        var lastSyncAt: Date?
        var dirtyWorkoutIds: Set<String>
        var dirtySettingIds: Set<String>
        var pendingDeletions: [SyncPush.DeletionRequest]
    }

    private static var fileURL: URL {
        let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory.appending(path: "local-store.json")
    }

    private func load() {
        guard let data = try? Data(contentsOf: Self.fileURL),
              let snapshot = try? APIClient.decoder.decode(Snapshot.self, from: data) else { return }
        brands = snapshot.brands
        exerciseGroups = snapshot.exerciseGroups
        exercises = snapshot.exercises
        gyms = snapshot.gyms
        workouts = snapshot.workouts
        exerciseSettings = snapshot.exerciseSettings
        lastSyncAt = snapshot.lastSyncAt
        dirtyWorkoutIds = snapshot.dirtyWorkoutIds
        dirtySettingIds = snapshot.dirtySettingIds
        pendingDeletions = snapshot.pendingDeletions
    }

    func save() {
        let snapshot = Snapshot(
            brands: brands,
            exerciseGroups: exerciseGroups,
            exercises: exercises,
            gyms: gyms,
            workouts: workouts,
            exerciseSettings: exerciseSettings,
            lastSyncAt: lastSyncAt,
            dirtyWorkoutIds: dirtyWorkoutIds,
            dirtySettingIds: dirtySettingIds,
            pendingDeletions: pendingDeletions
        )
        if let data = try? APIClient.encoder.encode(snapshot) {
            try? data.write(to: Self.fileURL, options: .atomic)
        }
    }

    private func merge<T: Identifiable & Equatable>(_ existing: [T], with incoming: [T]) -> [T] {
        var byId = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })
        for item in incoming {
            byId[item.id] = item
        }
        return Array(byId.values)
    }

    private func sortCatalog() {
        brands.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        exerciseGroups.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        exercises.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        gyms.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }
}
