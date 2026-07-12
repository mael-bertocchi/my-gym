import ActivityKit
import Foundation
import WatchConnectivity

@MainActor
final class WorkoutSessionCoordinator {
    static let openActiveWorkoutNotification = Notification.Name("fr.mael-bertocchi.my-gym.open-active-workout")

    private let store: LocalStore
    private let activeWorkout: ActiveWorkoutStore
    private let healthKit: HealthKitService
    private let session: ApplicationSession
    private let relay = Relay()

    private var lastState: WorkoutSessionState?
    private var lastSummary: WorkoutSessionSummary?
    private var lastSentContext: Data?
    private var lastWatchLaunchWorkoutId: String?
    private var activityTask: Task<Void, Never>?
    private var heartRateTask: Task<Void, Never>?

    init(store: LocalStore, activeWorkout: ActiveWorkoutStore, healthKit: HealthKitService, session: ApplicationSession) {
        self.store = store
        self.activeWorkout = activeWorkout
        self.healthKit = healthKit
        self.session = session
        relay.coordinator = self
        activeWorkout.onMutation = { [weak self] mutation in
            self?.apply(mutation)
        }
        WorkoutIntentBus.handler = { [weak self] command in
            self?.handle(command)
        }
        if WCSession.isSupported() {
            WCSession.default.delegate = relay
            WCSession.default.activate()
        }
        refresh()
    }

    func apply(_ mutation: ActiveWorkoutStore.SessionMutation) {
        if case .finished(let workout, let records) = mutation {
            lastSummary = WorkoutSessionSummary(
                workoutId: workout.id,
                name: workout.name ?? "Workout",
                endedAt: workout.endedAt ?? .now,
                durationSeconds: Int(workout.duration ?? 0),
                sets: workout.completedSetCount,
                volumeKg: workout.totalVolume,
                records: records
            )
        }
        refresh()
    }

    func handle(_ command: WatchCommand) {
        switch command {
        case .logTarget(let entryId, let setId, let weightKg, let reps):
            logTarget(entryId: entryId, setId: setId, weightKg: weightKg, reps: reps)
        case .adjustRest(let seconds):
            activeWorkout.adjustRest(by: seconds)
        case .skipRest:
            activeWorkout.skipRest()
        case .expireRest:
            activeWorkout.expireRestIfNeeded()
        case .pause:
            activeWorkout.pause()
        case .resume:
            activeWorkout.resume()
        case .finish:
            activeWorkout.finish()
        case .discard:
            activeWorkout.discard()
        case .startWorkout:
            guard !activeWorkout.isActive else {
                pushContext(force: true)
                break
            }
            activeWorkout.start(gymId: session.defaultGymId)
        case .repeatLast:
            if !activeWorkout.isActive {
                activeWorkout.start(gymId: session.defaultGymId)
            }
            activeWorkout.repeatLast()
        case .openPhone:
            NotificationCenter.default.post(name: Self.openActiveWorkoutNotification, object: nil)
        case .heartRate(let bpm):
            guard activeWorkout.isActive else { break }
            healthKit.ingestExternalHeartRate(bpm)
            refresh()
        case .calories(let kcal):
            guard activeWorkout.isActive else { break }
            healthKit.ingestExternalCalories(kcal)
        case .requestSync:
            pushContext(force: true)
        }
    }

    private func logTarget(entryId: String, setId: String, weightKg: Double?, reps: Int) {
        guard let workout = activeWorkout.workout else { return }
        var resolvedEntryId = entryId
        var resolvedSetId = setId
        let requested = workout.exercises
            .first { $0.id == entryId }?
            .sets.first { $0.id == setId && !$0.isCompleted }
        if requested == nil {
            guard let fallback = computeTarget(workout) else { return }
            resolvedEntryId = fallback.entryId
            resolvedSetId = fallback.setId
        }
        guard let entry = activeWorkout.workout?.exercises.first(where: { $0.id == resolvedEntryId }),
              var set = entry.sets.first(where: { $0.id == resolvedSetId })
        else { return }
        let isWeighted = store.exercise(id: entry.exerciseId)?.isWeighted ?? true
        set.weightKg = isWeighted ? weightKg : nil
        set.reps = reps
        activeWorkout.updateSet(entryId: resolvedEntryId, set: set)
        activeWorkout.setCompleted(
            entryId: resolvedEntryId,
            setId: resolvedSetId,
            completed: true,
            restSeconds: session.restTimerSeconds
        )
    }

    private func refresh() {
        let state = buildState()
        if state != lastState {
            lastState = state
            syncLiveActivity(state)
            setHeartRateLoop(active: state != nil)
            launchWatchAppIfNeeded(state)
        }
        pushContext()
    }

    private func launchWatchAppIfNeeded(_ state: WorkoutSessionState?) {
        guard let state, state.workoutId != lastWatchLaunchWorkoutId else { return }
        lastWatchLaunchWorkoutId = state.workoutId
        healthKit.launchWatchApp()
    }

    private func buildState() -> WorkoutSessionState? {
        guard let workout = activeWorkout.workout else { return nil }
        return WorkoutSessionState(
            workoutId: workout.id,
            workoutName: workout.name ?? "Workout",
            startedAt: workout.startedAt,
            pausedAt: activeWorkout.pausedAt,
            pausedSeconds: activeWorkout.pausedSeconds,
            completedSets: workout.completedSetCount,
            totalSets: workout.exercises.flatMap(\.sets).count,
            heartRate: healthKit.liveHeartRate(),
            rest: activeWorkout.restTimer.map { timer in
                WorkoutSessionState.Rest(
                    endsAt: timer.endsAt,
                    totalSeconds: timer.totalSeconds,
                    roundDone: activeWorkout.restContext?.round
                )
            },
            target: computeTarget(workout),
            personalRecord: activeWorkout.personalRecordCelebration.map { celebration in
                WorkoutSessionState.PersonalRecord(
                    setId: celebration.setId,
                    exerciseName: celebration.exerciseName,
                    weightKg: celebration.weightKg,
                    reps: celebration.reps
                )
            }
        )
    }

    private func computeTarget(_ workout: LocalWorkout) -> WorkoutSessionState.TargetSet? {
        if let context = activeWorkout.restContext,
           let next = Superset.nextIncompleteSet(in: Superset.members(of: context.supersetId, in: workout)) {
            return target(entryId: next.entryId, setId: next.setId, in: workout)
        }
        for grouping in Superset.groupings(in: workout) {
            switch grouping {
            case .single(let entry):
                if let set = entry.sets.first(where: { !$0.isCompleted }) {
                    return target(entryId: entry.id, setId: set.id, in: workout)
                }
            case .pair(_, let members):
                if let next = Superset.nextIncompleteSet(in: members) {
                    return target(entryId: next.entryId, setId: next.setId, in: workout)
                }
            }
        }
        return nil
    }

    private func target(entryId: String, setId: String, in workout: LocalWorkout) -> WorkoutSessionState.TargetSet? {
        guard let entry = workout.exercises.first(where: { $0.id == entryId }),
              let set = entry.sets.first(where: { $0.id == setId })
        else { return nil }
        let exercise = store.exercise(id: entry.exerciseId)
        let rounds = entry.setRounds
        let members = entry.supersetId.map { Superset.members(of: $0, in: workout) } ?? []
        let memberIndex = members.firstIndex { $0.id == entry.id }
        let partner = members.first { $0.id != entry.id }
        return WorkoutSessionState.TargetSet(
            entryId: entry.id,
            setId: set.id,
            exerciseName: exercise?.name ?? "Exercise",
            setNumber: set.setNumber,
            setCount: rounds.count,
            completedNumbers: rounds
                .filter { !$0.isEmpty && $0.allSatisfy(\.isCompleted) }
                .compactMap { $0.first?.setNumber },
            weightKg: set.weightKg,
            reps: set.reps,
            isWeighted: exercise?.isWeighted ?? (set.weightKg != nil),
            weightStep: weightStep(for: exercise),
            supersetLetter: memberIndex.map { $0 == 0 ? "A" : "B" },
            partnerLetter: memberIndex.map { $0 == 0 ? "B" : "A" },
            partnerName: partner.flatMap { store.exercise(id: $0.exerciseId)?.name }
        )
    }

    private func weightStep(for exercise: Exercise?) -> Double {
        switch exercise?.equipment {
        case .dumbbell, .kettlebell: 2.0
        default: 2.5
        }
    }

    private func setHeartRateLoop(active: Bool) {
        if active, heartRateTask == nil {
            heartRateTask = Task { [weak self] in
                while !Task.isCancelled {
                    try? await Task.sleep(for: .seconds(5))
                    guard let self, !Task.isCancelled else { return }
                    if self.healthKit.liveHeartRate() != self.lastState?.heartRate {
                        self.refresh()
                    }
                }
            }
        } else if !active {
            heartRateTask?.cancel()
            heartRateTask = nil
        }
    }

    private func syncLiveActivity(_ state: WorkoutSessionState?) {
        let previous = activityTask
        activityTask = Task {
            await previous?.value
            await Self.applyActivity(state)
        }
    }

    private static func applyActivity(_ state: WorkoutSessionState?) async {
        let existing = Activity<WorkoutActivityAttributes>.activities
        guard let state else {
            for activity in existing {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            return
        }
        let content = ActivityContent(
            state: WorkoutActivityAttributes.ContentState(session: state),
            staleDate: state.isPaused ? nil : state.rest?.endsAt
        )
        if let activity = existing.first(where: { $0.attributes.workoutId == state.workoutId }) {
            for extra in existing where extra.id != activity.id {
                await extra.end(nil, dismissalPolicy: .immediate)
            }
            await activity.update(content)
        } else {
            for extra in existing {
                await extra.end(nil, dismissalPolicy: .immediate)
            }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
            _ = try? Activity.request(attributes: WorkoutActivityAttributes(workoutId: state.workoutId), content: content)
        }
    }

    private func pushContext(force: Bool = false) {
        let wcSession = WCSession.default
        guard WCSession.isSupported(),
              wcSession.activationState == .activated,
              wcSession.isPaired,
              wcSession.isWatchAppInstalled
        else { return }
        let payload = WatchContextPayload(
            session: lastState,
            lastWorkoutName: store.workouts.first { $0.endedAt != nil }?.name,
            summary: lastSummary
        )
        guard let dictionary = WatchEnvelope.encode(payload, key: WatchEnvelope.contextKey),
              let data = dictionary[WatchEnvelope.contextKey] as? Data
        else { return }
        guard force || data != lastSentContext else { return }
        lastSentContext = data
        try? wcSession.updateApplicationContext(dictionary)
        if wcSession.isReachable {
            wcSession.sendMessage(dictionary, replyHandler: nil, errorHandler: nil)
        }
    }

    fileprivate func receiveIncoming(_ dictionary: [String: Any]) {
        guard let command = WatchEnvelope.decode(WatchCommand.self, from: dictionary, key: WatchEnvelope.commandKey) else { return }
        handle(command)
    }

    fileprivate func watchLinkChanged() {
        pushContext(force: true)
    }

    private final class Relay: NSObject, WCSessionDelegate {
        weak var coordinator: WorkoutSessionCoordinator?

        func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: (any Error)?) {
            notifyLinkChanged()
        }

        func sessionDidBecomeInactive(_ session: WCSession) {}

        func sessionDidDeactivate(_ session: WCSession) {
            session.activate()
        }

        func sessionWatchStateDidChange(_ session: WCSession) {
            notifyLinkChanged()
        }

        func sessionReachabilityDidChange(_ session: WCSession) {
            notifyLinkChanged()
        }

        func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
            receive(message)
        }

        func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
            receive(userInfo)
        }

        private func receive(_ dictionary: [String: Any]) {
            Task { @MainActor [weak self] in
                self?.coordinator?.receiveIncoming(dictionary)
            }
        }

        private func notifyLinkChanged() {
            Task { @MainActor [weak self] in
                self?.coordinator?.watchLinkChanged()
            }
        }
    }
}
