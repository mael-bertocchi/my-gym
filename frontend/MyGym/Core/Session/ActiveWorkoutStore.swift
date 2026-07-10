import Foundation
import Observation

@MainActor
@Observable
final class ActiveWorkoutStore {
    struct RestTimer: Codable, Equatable {
        var endsAt: Date
        var totalSeconds: Int

        var remainingSeconds: Int {
            max(0, Int(endsAt.timeIntervalSinceNow.rounded()))
        }

        var isExpired: Bool { remainingSeconds <= 0 }

        var progress: Double {
            guard totalSeconds > 0 else { return 1 }
            return 1 - Double(remainingSeconds) / Double(totalSeconds)
        }
    }

    struct RestContext: Codable, Equatable {
        var supersetId: String
        var round: Int
    }

    struct PersonalRecordCelebration: Equatable {
        var setId: String
        var exerciseName: String
        var weightKg: Double
        var reps: Int?
    }

    private(set) var workout: LocalWorkout?
    private(set) var restTimer: RestTimer?
    private(set) var restContext: RestContext?
    private(set) var pausedAt: Date?
    private(set) var pausedSeconds: TimeInterval = 0
    private(set) var personalRecordCelebration: PersonalRecordCelebration?

    var isActive: Bool { workout != nil }
    var isPaused: Bool { pausedAt != nil }

    private let store: LocalStore
    private let syncEngine: SyncEngine
    private let healthKit: HealthKitService
    private let restNotifications: RestNotificationService

    init(store: LocalStore, syncEngine: SyncEngine, healthKit: HealthKitService, restNotifications: RestNotificationService) {
        self.store = store
        self.syncEngine = syncEngine
        self.healthKit = healthKit
        self.restNotifications = restNotifications
        restore()
    }

    func start(gymId: String?, name: String? = nil) {
        let started = LocalWorkout(
            gymId: gymId,
            name: name ?? Self.defaultName(for: .now),
            startedAt: .now
        )
        workout = started
        restTimer = nil
        restContext = nil
        pausedAt = nil
        pausedSeconds = 0
        restNotifications.cancel()
        healthKit.startHeartRateStream(from: started.startedAt)
        persist()
    }

    func pause() {
        guard workout != nil, pausedAt == nil else { return }
        pausedAt = .now
        restNotifications.cancel()
        persist()
    }

    func resume() {
        guard let pausedAt else { return }
        let pausedSpan = Date.now.timeIntervalSince(pausedAt)
        pausedSeconds += pausedSpan
        if var timer = restTimer {
            timer.endsAt = timer.endsAt.addingTimeInterval(pausedSpan)
            restTimer = timer
            restNotifications.schedule(endsAt: timer.endsAt)
        }
        self.pausedAt = nil
        persist()
    }

    func repeatLast() {
        guard let last = store.workouts.first(where: { $0.endedAt != nil }) else { return }
        let gymId = workout?.gymId ?? last.gymId
        var seeded = LocalWorkout(gymId: gymId, name: last.name, startedAt: workout?.startedAt ?? .now)
        var remappedSupersetIds: [String: String] = [:]
        seeded.exercises = last.exercises.map { entry in
            LocalWorkoutExercise(
                exerciseId: entry.exerciseId,
                position: entry.position,
                settings: entry.settings,
                supersetId: entry.supersetId.map { original in
                    if let remapped = remappedSupersetIds[original] { return remapped }
                    let fresh = UUID().uuidString.lowercased()
                    remappedSupersetIds[original] = fresh
                    return fresh
                },
                brandId: entry.brandId,
                sets: entry.sets.map { set in
                    LocalSet(
                        setNumber: set.setNumber,
                        setType: set.setType,
                        side: set.side,
                        weightKg: set.weightKg,
                        reps: set.reps,
                        isCompleted: false
                    )
                }
            )
        }
        if let current = workout {
            seeded.id = current.id
            seeded.name = current.name
        }
        workout = seeded
        persist()
    }

    func rename(_ name: String) {
        workout?.name = name
        persist()
    }

    func elapsed(at date: Date = .now) -> TimeInterval {
        guard let workout else { return 0 }
        let reference = pausedAt ?? date
        return max(0, reference.timeIntervalSince(workout.startedAt) - pausedSeconds)
    }

    func finish(difficultyRating: Int? = nil, enjoymentRating: Int? = nil) {
        guard var finished = workout else { return }
        finished.endedAt = finished.startedAt.addingTimeInterval(elapsed())
        finished.averageHeartRate = healthKit.stopHeartRateStream()
        finished.difficultyRating = difficultyRating
        finished.enjoymentRating = enjoymentRating
        store.upsertWorkout(finished)
        let exerciseNames = finished.exercises.compactMap { store.exercise(id: $0.exerciseId)?.name }
        workout = nil
        restTimer = nil
        restContext = nil
        pausedAt = nil
        pausedSeconds = 0
        restNotifications.cancel()
        persist()
        Task { await syncEngine.sync() }
        Task { await healthKit.logWorkout(finished, exerciseNames: exerciseNames) }
    }

    func discard() {
        workout = nil
        restTimer = nil
        restContext = nil
        pausedAt = nil
        pausedSeconds = 0
        restNotifications.cancel()
        healthKit.stopHeartRateStream()
        persist()
    }

    @discardableResult
    func addExercise(_ exercise: Exercise, brandId: String? = nil) -> LocalWorkoutExercise? {
        guard var current = workout else { return nil }
        guard !current.exercises.contains(where: { $0.exerciseId == exercise.id }) else { return nil }

        var sets: [LocalSet] = []
        if let lastEntry = latestHistoryEntry(exerciseId: exercise.id) {
            sets = lastEntry.sets.map { set in
                LocalSet(
                    setNumber: set.setNumber,
                    setType: set.setType,
                    side: exercise.isUnilateral ? set.side : nil,
                    weightKg: set.weightKg,
                    reps: set.reps,
                    isCompleted: false
                )
            }
        }
        if exercise.isUnilateral, !sets.contains(where: { $0.side != nil }) {
            sets = [LocalSet(setNumber: 1, side: .left), LocalSet(setNumber: 1, side: .right)]
        } else if sets.isEmpty {
            sets = [LocalSet(setNumber: 1)]
        }

        let remembered = store.setting(exerciseId: exercise.id)
        let entry = LocalWorkoutExercise(
            exerciseId: exercise.id,
            position: (current.exercises.map(\.position).max() ?? 0) + 1,
            settings: remembered?.settings,
            brandId: brandId,
            sets: sets
        )
        current.exercises.append(entry)
        workout = current
        persist()
        return entry
    }

    func removeExercise(entryId: String) {
        guard let current = workout else { return }
        if let supersetId = current.exercises.first(where: { $0.id == entryId })?.supersetId {
            clearSuperset(supersetId)
        }
        workout?.exercises.removeAll { $0.id == entryId }
        persist()
    }

    func createSuperset(entryId: String, partnerId: String) {
        guard let current = workout,
              let anchor = current.exercises.first(where: { $0.id == entryId }),
              let partner = current.exercises.first(where: { $0.id == partnerId }),
              anchor.supersetId == nil,
              partner.supersetId == nil
        else { return }

        let supersetId = UUID().uuidString.lowercased()
        var ordered = current.exercises.sorted { $0.position < $1.position }
        ordered.removeAll { $0.id == partnerId }
        guard let anchorIndex = ordered.firstIndex(where: { $0.id == entryId }) else { return }
        ordered[anchorIndex].supersetId = supersetId
        var linkedPartner = partner
        linkedPartner.supersetId = supersetId
        ordered.insert(linkedPartner, at: anchorIndex + 1)
        for index in ordered.indices {
            ordered[index].position = index + 1
        }
        workout?.exercises = ordered
        persist()
    }

    func unlinkSuperset(supersetId: String) {
        guard workout != nil else { return }
        clearSuperset(supersetId)
        persist()
    }

    func reorderExercises(groupingIds: [String]) {
        guard let current = workout else { return }
        var byId = Dictionary(uniqueKeysWithValues: Superset.groupings(in: current).map { ($0.id, $0) })
        var ordered: [LocalWorkoutExercise] = []
        for id in groupingIds {
            switch byId.removeValue(forKey: id) {
            case .single(let entry):
                ordered.append(entry)
            case .pair(_, let members):
                ordered.append(contentsOf: members)
            case nil:
                continue
            }
        }
        guard ordered.count == current.exercises.count else { return }
        for index in ordered.indices {
            ordered[index].position = index + 1
        }
        workout?.exercises = ordered
        persist()
    }

    private func clearSuperset(_ supersetId: String) {
        guard let current = workout else { return }
        for index in current.exercises.indices where current.exercises[index].supersetId == supersetId {
            workout?.exercises[index].supersetId = nil
        }
        if restContext?.supersetId == supersetId {
            restContext = nil
        }
    }

    func updateEntrySettings(entryId: String, settings: [String: JSONValue]?) {
        guard let index = entryIndex(entryId) else { return }
        workout?.exercises[index].settings = settings
        persist()
    }

    func updateEntryBrand(entryId: String, brandId: String?) {
        guard let index = entryIndex(entryId) else { return }
        workout?.exercises[index].brandId = brandId
        persist()
    }

    func addSet(entryId: String) {
        guard let index = entryIndex(entryId) else { return }
        let entry = workout!.exercises[index]
        let sets = entry.sets
        let nextNumber = (sets.map(\.setNumber).max() ?? 0) + 1
        if isUnilateral(exerciseId: entry.exerciseId) {
            let lastLeft = sets.last { $0.side == .left }
            let lastRight = sets.last { $0.side == .right }
            workout?.exercises[index].sets.append(contentsOf: [
                LocalSet(setNumber: nextNumber, setType: .normal, side: .left, weightKg: lastLeft?.weightKg, reps: lastLeft?.reps),
                LocalSet(setNumber: nextNumber, setType: .normal, side: .right, weightKg: lastRight?.weightKg, reps: lastRight?.reps),
            ])
        } else {
            let last = sets.last
            workout?.exercises[index].sets.append(
                LocalSet(setNumber: nextNumber, setType: .normal, weightKg: last?.weightKg, reps: last?.reps)
            )
        }
        persist()
    }

    func updateSet(entryId: String, set updated: LocalSet) {
        guard let entryIndex = entryIndex(entryId),
              let setIndex = workout?.exercises[entryIndex].sets.firstIndex(where: { $0.id == updated.id })
        else { return }
        let previous = workout!.exercises[entryIndex].sets[setIndex]
        workout?.exercises[entryIndex].sets[setIndex] = updated
        carryValueToFollowingSets(entryIndex: entryIndex, from: setIndex, previous: previous, updated: updated)
        persist()
    }

    private func carryValueToFollowingSets(entryIndex: Int, from setIndex: Int, previous: LocalSet, updated: LocalSet) {
        guard let sets = workout?.exercises[entryIndex].sets else { return }
        let carriesWeight = updated.weightKg != previous.weightKg
        let carriesReps = updated.reps != previous.reps
        guard carriesWeight || carriesReps else { return }
        for index in sets.indices where index > setIndex {
            guard sets[index].side == updated.side, !sets[index].isCompleted else { continue }
            if carriesWeight, sets[index].weightKg == previous.weightKg {
                workout?.exercises[entryIndex].sets[index].weightKg = updated.weightKg
            }
            if carriesReps, sets[index].reps == previous.reps {
                workout?.exercises[entryIndex].sets[index].reps = updated.reps
            }
        }
    }

    func removeSet(entryId: String, setId: String) {
        guard let entryIndex = entryIndex(entryId),
              let target = workout?.exercises[entryIndex].sets.first(where: { $0.id == setId })
        else { return }
        if isUnilateral(exerciseId: workout!.exercises[entryIndex].exerciseId) {
            workout?.exercises[entryIndex].sets.removeAll { $0.setNumber == target.setNumber }
            renumberRounds(entryIndex: entryIndex)
        } else {
            workout?.exercises[entryIndex].sets.removeAll { $0.id == setId }
            if let sets = workout?.exercises[entryIndex].sets {
                for setIndex in sets.indices {
                    workout?.exercises[entryIndex].sets[setIndex].setNumber = setIndex + 1
                }
            }
        }
        persist()
    }

    private func renumberRounds(entryIndex: Int) {
        guard let sets = workout?.exercises[entryIndex].sets else { return }
        var mapping: [Int: Int] = [:]
        var next = 0
        for set in sets where mapping[set.setNumber] == nil {
            next += 1
            mapping[set.setNumber] = next
        }
        for setIndex in sets.indices {
            workout?.exercises[entryIndex].sets[setIndex].setNumber = mapping[sets[setIndex].setNumber] ?? (setIndex + 1)
        }
    }

    @discardableResult
    func setCompleted(entryId: String, setId: String, completed: Bool, restSeconds: Int) -> String? {
        guard let entryIndex = entryIndex(entryId),
              let setIndex = workout?.exercises[entryIndex].sets.firstIndex(where: { $0.id == setId })
        else { return nil }
        workout?.exercises[entryIndex].sets[setIndex].isCompleted = completed
        var focusEntryId: String?
        if completed {
            celebratePersonalRecord(entryIndex: entryIndex, setIndex: setIndex)
            if let current = workout, let supersetId = current.exercises[entryIndex].supersetId {
                let members = Superset.members(of: supersetId, in: current)
                let completedSetId = current.exercises[entryIndex].sets[setIndex].id
                let round = current.exercises[entryIndex].setRounds
                    .firstIndex { $0.contains { $0.id == completedSetId } } ?? setIndex
                if Superset.isRoundComplete(in: members, round: round) {
                    startRest(seconds: restSeconds, context: RestContext(supersetId: supersetId, round: round + 1))
                }
                focusEntryId = Superset.nextIncompleteSet(in: members)?.entryId
            } else if let current = workout, isUnilateral(exerciseId: current.exercises[entryIndex].exerciseId) {
                let round = current.exercises[entryIndex].sets[setIndex].setNumber
                let roundComplete = current.exercises[entryIndex].sets
                    .filter { $0.setNumber == round }
                    .allSatisfy(\.isCompleted)
                if roundComplete {
                    startRest(seconds: restSeconds)
                }
            } else {
                startRest(seconds: restSeconds)
            }
        }
        persist()
        return focusEntryId
    }

    func startRest(seconds: Int, context: RestContext? = nil) {
        let timer = RestTimer(endsAt: .now.addingTimeInterval(TimeInterval(seconds)), totalSeconds: seconds)
        restTimer = timer
        restContext = context
        restNotifications.schedule(endsAt: timer.endsAt)
        persist()
    }

    func adjustRest(by delta: Int) {
        guard var timer = restTimer else { return }
        timer.endsAt = timer.endsAt.addingTimeInterval(TimeInterval(delta))
        timer.totalSeconds = max(1, timer.totalSeconds + delta)
        restTimer = timer.isExpired ? nil : timer
        if restTimer == nil {
            restContext = nil
            restNotifications.cancel()
        } else {
            restNotifications.schedule(endsAt: timer.endsAt)
        }
        persist()
    }

    func skipRest() {
        restTimer = nil
        restContext = nil
        restNotifications.cancel()
        persist()
    }

    @discardableResult
    func expireRestIfNeeded() -> Bool {
        guard pausedAt == nil else { return false }
        guard let restTimer, restTimer.isExpired else { return false }
        let justEnded = abs(restTimer.endsAt.timeIntervalSinceNow) < 3
        self.restTimer = nil
        restContext = nil
        restNotifications.cancel()
        persist()
        return justEnded
    }

    #if DEBUG
    func debugBackdateStart(minutes: Int) {
        workout?.startedAt = .now.addingTimeInterval(-Double(minutes) * 60)
        persist()
    }
    #endif

    func isPersonalRecord(entryId: String, set: LocalSet) -> Bool {
        guard set.isCompleted,
              let exerciseId = workout?.exercises.first(where: { $0.id == entryId })?.exerciseId
        else { return false }
        return currentPersonalRecordSetId(exerciseId: exerciseId) == set.id
    }

    private func celebratePersonalRecord(entryIndex: Int, setIndex: Int) {
        guard let current = workout else { return }
        let entry = current.exercises[entryIndex]
        let set = entry.sets[setIndex]
        guard let weight = set.weightKg,
              currentPersonalRecordSetId(exerciseId: entry.exerciseId) == set.id
        else { return }
        personalRecordCelebration = PersonalRecordCelebration(
            setId: set.id,
            exerciseName: store.exercise(id: entry.exerciseId)?.name ?? "Exercise",
            weightKg: weight,
            reps: set.reps
        )
    }

    private func currentPersonalRecordSetId(exerciseId: String) -> String? {
        guard let current = workout else { return nil }
        let historicalBest = historicalBest(exerciseId: exerciseId)
        var winner: (id: String, weightKg: Double, reps: Int?)?
        for entry in current.exercises.sorted(by: { $0.position < $1.position }) where entry.exerciseId == exerciseId {
            for set in entry.sets where set.isCompleted {
                guard let weight = set.weightKg else { continue }
                if let best = historicalBest, !beats(weight: weight, reps: set.reps, best: best) { continue }
                if let leader = winner, !beats(weight: weight, reps: set.reps, best: (leader.weightKg, leader.reps)) { continue }
                winner = (set.id, weight, set.reps)
            }
        }
        return winner?.id
    }

    private func historicalBest(exerciseId: String) -> (weightKg: Double, reps: Int?)? {
        var best: (weightKg: Double, reps: Int?)?
        let currentId = workout?.id
        for workout in store.workouts where workout.endedAt != nil && workout.id != currentId {
            for entry in workout.exercises where entry.exerciseId == exerciseId {
                for set in entry.sets where set.isCompleted {
                    guard let weight = set.weightKg else { continue }
                    if best == nil || beats(weight: weight, reps: set.reps, best: best!) {
                        best = (weight, set.reps)
                    }
                }
            }
        }
        return best
    }

    private func beats(weight: Double, reps: Int?, best: (weightKg: Double, reps: Int?)) -> Bool {
        weight > best.weightKg || (weight == best.weightKg && (reps ?? 0) > (best.reps ?? 0))
    }

    private func latestHistoryEntry(exerciseId: String) -> LocalWorkoutExercise? {
        for workout in store.workouts.sorted(by: { $0.startedAt > $1.startedAt }) {
            if let entry = workout.exercises.first(where: { $0.exerciseId == exerciseId }),
               !entry.sets.isEmpty {
                return entry
            }
        }
        return nil
    }

    func lastSessionSummary(exerciseId: String) -> String? {
        guard let entry = latestHistoryEntry(exerciseId: exerciseId) else { return nil }
        let completed = entry.sets.filter(\.isCompleted)
        guard let last = completed.last, let weight = last.weightKg, let reps = last.reps else { return nil }
        let count = isUnilateral(exerciseId: exerciseId) ? Set(completed.map(\.setNumber)).count : completed.count
        let side = last.side.map { "\($0.short) " } ?? ""
        return "\(count) sets logged · last: \(side)\(Formatting.weight(weight)) × \(reps)"
    }

    private func entryIndex(_ entryId: String) -> Int? {
        workout?.exercises.firstIndex { $0.id == entryId }
    }

    private func isUnilateral(exerciseId: String) -> Bool {
        store.exercise(id: exerciseId)?.isUnilateral ?? false
    }

    private static func defaultName(for date: Date) -> String {
        switch Calendar.current.component(.hour, from: date) {
        case 5..<12: return "Morning workout"
        case 12..<18: return "Afternoon workout"
        default: return "Evening workout"
        }
    }

    private struct Snapshot: Codable {
        var workout: LocalWorkout?
        var restTimer: RestTimer?
        var restContext: RestContext?
        var pausedAt: Date?
        var pausedSeconds: TimeInterval?
    }

    private static var fileURL: URL {
        let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory.appending(path: "active-workout.json")
    }

    private func persist() {
        let snapshot = Snapshot(
            workout: workout,
            restTimer: restTimer,
            restContext: restContext,
            pausedAt: pausedAt,
            pausedSeconds: pausedSeconds
        )
        if let data = try? APIClient.encoder.encode(snapshot) {
            try? data.write(to: Self.fileURL, options: .atomic)
        }
    }

    private func restore() {
        guard let data = try? Data(contentsOf: Self.fileURL),
              let snapshot = try? APIClient.decoder.decode(Snapshot.self, from: data) else { return }
        workout = snapshot.workout
        if let restored = snapshot.workout {
            healthKit.startHeartRateStream(from: restored.startedAt)
        }
        pausedAt = snapshot.workout == nil ? nil : snapshot.pausedAt
        pausedSeconds = snapshot.workout == nil ? 0 : (snapshot.pausedSeconds ?? 0)
        if let timer = snapshot.restTimer, timer.endsAt > (pausedAt ?? .now) {
            restTimer = timer
            restContext = snapshot.restContext
        } else {
            restTimer = nil
            restContext = nil
            restNotifications.cancel()
        }
    }
}
