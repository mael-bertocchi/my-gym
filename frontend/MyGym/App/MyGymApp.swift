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
        _store = State(initialValue: store)
        _syncEngine = State(initialValue: syncEngine)
        _healthKit = State(initialValue: healthKit)
        _session = State(initialValue: AppSession(store: store, syncEngine: syncEngine))
        _activeWorkout = State(initialValue: ActiveWorkoutStore(store: store, syncEngine: syncEngine, healthKit: healthKit))
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
        }
    }
}
