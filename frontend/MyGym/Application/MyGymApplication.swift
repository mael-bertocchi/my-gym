import SwiftUI

@main
struct MyGymApplication: App {
    @State private var store: LocalStore
    @State private var syncEngine: SyncEngine
    @State private var session: ApplicationSession
    @State private var healthKit: HealthKitService
    @State private var activeWorkout: ActiveWorkoutStore
    @State private var sessionCoordinator: WorkoutSessionCoordinator
    @State private var tabChrome = TabChromeState()

    init() {
        let store = LocalStore()
        let syncEngine = SyncEngine(store: store)
        let healthKit = HealthKitService()
        let restNotifications = RestNotificationService()
        let activeWorkout = ActiveWorkoutStore(
            store: store,
            syncEngine: syncEngine,
            healthKit: healthKit,
            restNotifications: restNotifications
        )
        let session = ApplicationSession(
            store: store,
            syncEngine: syncEngine,
            activeWorkout: activeWorkout
        )
        _store = State(initialValue: store)
        _syncEngine = State(initialValue: syncEngine)
        _healthKit = State(initialValue: healthKit)
        _activeWorkout = State(initialValue: activeWorkout)
        _session = State(initialValue: session)
        _sessionCoordinator = State(initialValue: WorkoutSessionCoordinator(
            store: store,
            activeWorkout: activeWorkout,
            healthKit: healthKit,
            session: session
        ))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .environment(syncEngine)
                .environment(session)
                .environment(healthKit)
                .environment(activeWorkout)
                .environment(tabChrome)
                .tint(Theme.accentBlue)
                .dynamicTypeSize(...DynamicTypeSize.accessibility2)
        }
    }
}
