import SwiftUI

@main
struct MyGymApp: App {
    @State private var store: LocalStore
    @State private var syncEngine: SyncEngine
    @State private var session: AppSession
    @State private var healthKit: HealthKitService
    @State private var activeWorkout: ActiveWorkoutStore
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
        _store = State(initialValue: store)
        _syncEngine = State(initialValue: syncEngine)
        _healthKit = State(initialValue: healthKit)
        _activeWorkout = State(initialValue: activeWorkout)
        _session = State(initialValue: AppSession(
            store: store,
            syncEngine: syncEngine,
            activeWorkout: activeWorkout
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
                .preferredColorScheme(.light)
                .dynamicTypeSize(...DynamicTypeSize.accessibility2)
        }
    }
}
