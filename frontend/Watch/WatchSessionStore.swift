import Foundation
import Observation
import WatchConnectivity
import WatchKit

@MainActor
@Observable
final class WatchSessionStore: NSObject {
    private(set) var session: WorkoutSessionState?
    private(set) var lastWorkoutName: String?
    private(set) var summary: WorkoutSessionSummary?
    private(set) var personalRecord: WorkoutSessionState.PersonalRecord?
    private(set) var liveHeartRate: Int?
    private(set) var isStartingWorkout = false

    var initialControlsPage = false
    var autoOpenAdjust = false

    private let relay = Relay()
    private let workoutController = WatchWorkoutController()
    private var recordDismissTask: Task<Void, Never>?
    private var startTimeoutTask: Task<Void, Never>?
    private var lastSentHeartRate: Int?
    private var lastSentHeartRateAt: Date?
    private var lastSentCalories: Int?
    private var lastSentCaloriesAt: Date?

    private var seenRecordSetId: String? {
        get { UserDefaults.standard.string(forKey: "seenRecordSetId") }
        set { UserDefaults.standard.set(newValue, forKey: "seenRecordSetId") }
    }

    private var dismissedSummaryId: String? {
        get { UserDefaults.standard.string(forKey: "dismissedSummaryId") }
        set { UserDefaults.standard.set(newValue, forKey: "dismissedSummaryId") }
    }

    override init() {
        super.init()
        #if DEBUG
        if seedDemoIfRequested() { return }
        #endif
        relay.store = self
        workoutController.onHeartRate = { [weak self] bpm in
            self?.receiveHeartRate(bpm)
        }
        workoutController.onCalories = { [weak self] kilocalories in
            self?.receiveCalories(kilocalories)
        }
        WatchWorkoutLaunch.drain { [weak self] in
            self?.workoutController.ensureStarted()
        }
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = relay
        WCSession.default.activate()
        apply(dictionary: WCSession.default.receivedApplicationContext)
        #if DEBUG
        if CommandLine.arguments.contains("-auto-log-once") {
            Task { [weak self] in
                try? await Task.sleep(for: .seconds(5))
                guard let self, let target = self.session?.target else { return }
                self.send(.logTarget(
                    entryId: target.entryId,
                    setId: target.setId,
                    weightKg: target.isWeighted ? target.weightKg : nil,
                    reps: target.reps ?? 0
                ))
            }
        }
        if CommandLine.arguments.contains("-auto-start-once") {
            Task { [weak self] in
                try? await Task.sleep(for: .seconds(5))
                guard let self, self.session == nil else { return }
                self.startWorkout()
            }
        }
        #endif
    }

    func startWorkout() {
        isStartingWorkout = true
        startTimeoutTask?.cancel()
        startTimeoutTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(12))
            guard !Task.isCancelled else { return }
            self?.isStartingWorkout = false
        }
        send(.startWorkout)
    }

    func requestSync() {
        #if DEBUG
        guard !isDemo else { return }
        #endif
        guard WCSession.default.activationState == .activated else { return }
        send(.requestSync)
    }

    func send(_ command: WatchCommand) {
        #if DEBUG
        if isDemo {
            reduceDemo(command)
            return
        }
        #endif
        guard let dictionary = WatchEnvelope.encode(command, key: WatchEnvelope.commandKey) else { return }
        let wcSession = WCSession.default
        if wcSession.isReachable {
            wcSession.sendMessage(dictionary, replyHandler: nil) { _ in
                wcSession.transferUserInfo(dictionary)
            }
        } else {
            wcSession.transferUserInfo(dictionary)
        }
    }

    func dismissSummary() {
        dismissedSummaryId = summary?.workoutId
        summary = nil
    }

    func dismissPersonalRecord() {
        seenRecordSetId = personalRecord?.setId
        personalRecord = nil
        recordDismissTask?.cancel()
        recordDismissTask = nil
    }

    fileprivate func apply(dictionary: [String: Any]) {
        guard let payload = WatchEnvelope.decode(WatchContextPayload.self, from: dictionary, key: WatchEnvelope.contextKey) else { return }
        apply(payload)
    }

    private func apply(_ payload: WatchContextPayload) {
        session = payload.session
        lastWorkoutName = payload.lastWorkoutName
        if payload.session != nil {
            isStartingWorkout = false
            startTimeoutTask?.cancel()
            startTimeoutTask = nil
        }
        if let incoming = payload.summary, payload.session == nil, incoming.workoutId != dismissedSummaryId {
            summary = incoming
        } else if payload.session != nil {
            summary = nil
        }
        if let record = payload.session?.personalRecord, record.setId != seenRecordSetId {
            presentPersonalRecord(record)
        }
        syncWorkoutSession(with: payload.session)
    }

    private func syncWorkoutSession(with state: WorkoutSessionState?) {
        if let state {
            workoutController.ensureStarted()
            workoutController.setPaused(state.isPaused)
        } else {
            workoutController.stop()
            liveHeartRate = nil
            lastSentHeartRate = nil
            lastSentHeartRateAt = nil
            lastSentCalories = nil
            lastSentCaloriesAt = nil
        }
    }

    private func receiveHeartRate(_ bpm: Int) {
        liveHeartRate = bpm
        guard session != nil else { return }
        let now = Date.now
        let stale = lastSentHeartRateAt.map { now.timeIntervalSince($0) > 10 } ?? true
        guard bpm != lastSentHeartRate || stale else { return }
        lastSentHeartRate = bpm
        lastSentHeartRateAt = now
        send(.heartRate(bpm: bpm))
    }

    private func receiveCalories(_ kilocalories: Int) {
        guard session != nil else { return }
        let now = Date.now
        let stale = lastSentCaloriesAt.map { now.timeIntervalSince($0) > 15 } ?? true
        guard kilocalories != lastSentCalories, stale else { return }
        lastSentCalories = kilocalories
        lastSentCaloriesAt = now
        send(.calories(kcal: kilocalories))
    }

    private func presentPersonalRecord(_ record: WorkoutSessionState.PersonalRecord) {
        guard personalRecord?.setId != record.setId else { return }
        personalRecord = record
        WKInterfaceDevice.current().play(.success)
        Task {
            try? await Task.sleep(for: .seconds(0.25))
            WKInterfaceDevice.current().play(.success)
        }
        recordDismissTask?.cancel()
        recordDismissTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(3))
            guard !Task.isCancelled else { return }
            self?.dismissPersonalRecord()
        }
    }

    private final class Relay: NSObject, WCSessionDelegate {
        weak var store: WatchSessionStore?

        func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: (any Error)?) {
            receive(session.receivedApplicationContext)
            Task { @MainActor [weak self] in
                self?.store?.requestSync()
            }
        }

        func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
            receive(applicationContext)
        }

        func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
            receive(message)
        }

        func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
            receive(userInfo)
        }

        private func receive(_ dictionary: [String: Any]) {
            guard !dictionary.isEmpty else { return }
            Task { @MainActor [weak self] in
                self?.store?.apply(dictionary: dictionary)
            }
        }
    }

    #if DEBUG
    private var isDemo = false

    private func seedDemoIfRequested() -> Bool {
        let arguments = CommandLine.arguments
        guard arguments.contains(where: { $0.hasPrefix("-demo") }) else { return false }
        isDemo = true
        lastWorkoutName = "Push Day"
        if arguments.contains("-demo-idle") {
            return true
        }
        if arguments.contains("-demo-summary") {
            summary = Self.demoSummary
            return true
        }
        var state = Self.demoState
        if arguments.contains("-demo-rest") {
            state.rest = WorkoutSessionState.Rest(endsAt: .now.addingTimeInterval(84), totalSeconds: 150, roundDone: 2)
        }
        if arguments.contains("-demo-controls") {
            state.pausedAt = .now
            initialControlsPage = true
        }
        if arguments.contains("-demo-adjust") {
            autoOpenAdjust = true
        }
        session = state
        if arguments.contains("-demo-pr") {
            personalRecord = WorkoutSessionState.PersonalRecord(setId: "pr", exerciseName: "Bench Press", weightKg: 85, reps: 6)
        }
        return true
    }

    private func reduceDemo(_ command: WatchCommand) {
        switch command {
        case .logTarget(_, _, let weightKg, let reps):
            guard var state = session, var target = state.target else { return }
            state.completedSets += 1
            target.completedNumbers.append(target.setNumber)
            target.weightKg = weightKg ?? target.weightKg
            target.reps = reps
            if target.setNumber < target.setCount {
                target.setNumber += 1
            }
            state.target = target
            state.rest = WorkoutSessionState.Rest(endsAt: .now.addingTimeInterval(90), totalSeconds: 90, roundDone: target.supersetLetter == nil ? nil : 2)
            session = state
        case .adjustRest(let seconds):
            guard var state = session, var rest = state.rest else { return }
            rest.endsAt = rest.endsAt.addingTimeInterval(TimeInterval(seconds))
            rest.totalSeconds = max(1, rest.totalSeconds + seconds)
            state.rest = rest.remainingSeconds() > 0 ? rest : nil
            session = state
        case .skipRest, .expireRest:
            session?.rest = nil
        case .pause:
            session?.pausedAt = .now
        case .resume:
            guard var state = session, let pausedAt = state.pausedAt else { return }
            let span = Date.now.timeIntervalSince(pausedAt)
            state.pausedSeconds += span
            if var rest = state.rest {
                rest.endsAt = rest.endsAt.addingTimeInterval(span)
                state.rest = rest
            }
            state.pausedAt = nil
            session = state
        case .finish:
            summary = Self.demoSummary
            session = nil
        case .discard:
            session = nil
        case .startWorkout, .repeatLast:
            var state = Self.demoState
            state.startedAt = .now
            state.completedSets = 0
            session = state
            isStartingWorkout = false
        case .openPhone, .heartRate, .calories, .requestSync:
            break
        }
    }

    private static var demoState: WorkoutSessionState {
        WorkoutSessionState(
            workoutId: "demo",
            workoutName: "Push Day",
            startedAt: .now.addingTimeInterval(-1472),
            pausedAt: nil,
            pausedSeconds: 0,
            completedSets: 12,
            totalSets: 20,
            heartRate: 128,
            rest: nil,
            target: WorkoutSessionState.TargetSet(
                entryId: "entry",
                setId: "set",
                exerciseName: "Incline Press",
                setNumber: 3,
                setCount: 4,
                completedNumbers: [1, 2],
                weightKg: 30,
                reps: 10,
                isWeighted: true,
                weightStep: 2.5,
                supersetLetter: "A",
                partnerLetter: "B",
                partnerName: "Seated Row"
            ),
            personalRecord: nil
        )
    }

    private static var demoSummary: WorkoutSessionSummary {
        WorkoutSessionSummary(
            workoutId: "demo",
            name: "Push Day",
            endedAt: .now,
            durationSeconds: 52 * 60 + 14,
            sets: 20,
            volumeKg: 4300,
            records: 2
        )
    }
    #endif
}
