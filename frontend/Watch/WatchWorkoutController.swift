import Foundation
import HealthKit

private let heartRateType = HKQuantityType(.heartRate)
private let heartRateUnit = HKUnit.count().unitDivided(by: .minute())
private let activeEnergyType = HKQuantityType(.activeEnergyBurned)

@MainActor
final class WatchWorkoutController: NSObject {
    var onHeartRate: ((Int) -> Void)?
    var onCalories: ((Int) -> Void)?

    private let healthStore = HKHealthStore()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var isStarting = false

    func ensureStarted() {
        guard HKHealthStore.isHealthDataAvailable(), session == nil, !isStarting else { return }
        isStarting = true
        Task {
            await start()
            isStarting = false
        }
    }

    func setPaused(_ paused: Bool) {
        guard let session else { return }
        if paused, session.state == .running {
            session.pause()
        } else if !paused, session.state == .paused {
            session.resume()
        }
    }

    func stop() {
        guard let session, let builder else { return }
        self.session = nil
        self.builder = nil
        session.end()
        Task {
            try? await builder.endCollection(at: .now)
            builder.discardWorkout()
        }
    }

    private func start() async {
        do {
            try await healthStore.requestAuthorization(
                toShare: [HKObjectType.workoutType()],
                read: [heartRateType, activeEnergyType]
            )
            let configuration = HKWorkoutConfiguration()
            configuration.activityType = .traditionalStrengthTraining
            configuration.locationType = .indoor
            let session = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
            let builder = session.associatedWorkoutBuilder()
            builder.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: configuration)
            session.delegate = self
            builder.delegate = self
            session.startActivity(with: .now)
            try await builder.beginCollection(at: .now)
            self.session = session
            self.builder = builder
        } catch {
            session = nil
            builder = nil
        }
    }

    private func reset() {
        session = nil
        builder = nil
    }
}

extension WatchWorkoutController: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didChangeTo toState: HKWorkoutSessionState,
        from fromState: HKWorkoutSessionState,
        date: Date
    ) {}

    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: any Error) {
        Task { @MainActor [weak self] in
            self?.reset()
        }
    }
}

extension WatchWorkoutController: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        if collectedTypes.contains(heartRateType),
           let statistics = workoutBuilder.statistics(for: heartRateType),
           let quantity = statistics.mostRecentQuantity() {
            let bpm = Int(quantity.doubleValue(for: heartRateUnit).rounded())
            Task { @MainActor [weak self] in
                self?.onHeartRate?(bpm)
            }
        }
        if collectedTypes.contains(activeEnergyType),
           let statistics = workoutBuilder.statistics(for: activeEnergyType),
           let quantity = statistics.sumQuantity() {
            let kilocalories = Int(quantity.doubleValue(for: .kilocalorie()).rounded())
            Task { @MainActor [weak self] in
                self?.onCalories?(kilocalories)
            }
        }
    }

    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}
}
