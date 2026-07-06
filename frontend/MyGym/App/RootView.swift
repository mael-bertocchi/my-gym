import SwiftUI

struct RootView: View {
    @Environment(AppSession.self) private var session
    @Environment(LocalStore.self) private var store
    @Environment(ActiveWorkoutStore.self) private var activeWorkout
    @Environment(HealthKitService.self) private var healthKit

    var body: some View {
        Group {
            switch session.identityState {
            case .loading:
                ZStack {
                    Theme.screenBackground.ignoresSafeArea()
                    LogoMark()
                }
            case .signedOut:
                SignInView()
            case .signedIn:
                MainShell()
            }
        }
        .task {
            #if DEBUG
            if CommandLine.arguments.contains("-demo-empty") {
                DebugSeed.enterDemoEmpty(store: store, session: session, healthKit: healthKit, activeWorkout: activeWorkout)
                return
            }
            if CommandLine.arguments.contains("-demo") {
                DebugSeed.enterDemo(store: store, session: session, healthKit: healthKit)
                if CommandLine.arguments.contains("-demo-active") {
                    DebugSeed.startDemoActiveWorkout(
                        store: store,
                        activeWorkout: activeWorkout,
                        supersetGo: CommandLine.arguments.contains("-demo-superset-go"),
                        singleArm: CommandLine.arguments.contains("-demo-single-arm")
                    )
                    if CommandLine.arguments.contains("-demo-paused") {
                        activeWorkout.pause()
                    }
                } else {
                    activeWorkout.discard()
                }
                return
            }
            #endif
            await session.bootstrap()
        }
    }
}

struct MainShell: View {
    @Environment(AppSession.self) private var session
    @Environment(ActiveWorkoutStore.self) private var activeWorkout
    @Environment(LocalStore.self) private var store
    @Environment(SyncEngine.self) private var syncEngine
    @Environment(TabChromeState.self) private var tabChrome

    @State private var selection: AppTab = .home
    @State private var showStartWorkout = false
    @State private var showActiveWorkout = false
    @State private var historyWorkoutRoute: HistoryWorkoutRoute?

    #if DEBUG
    @State private var debugShowAdminUsers = false
    @State private var debugShowManageAccount = false
    @State private var debugShowCatalog = false
    #endif

    var body: some View {
        ZStack(alignment: .bottom) {
            tabContent
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    Color.clear
                        .frame(height: bottomClearance)
                        .allowsHitTesting(false)
                }

            if !tabChrome.isHidden {
                VStack(spacing: 8) {
                    if let workout = activeWorkout.workout {
                        ResumeBanner(
                            workoutName: workout.name ?? "Workout",
                            gymName: store.gym(id: workout.gymId)?.name,
                            isPaused: activeWorkout.isPaused,
                            exerciseCount: workout.exercises.count,
                            elapsed: { activeWorkout.elapsed(at: $0) },
                            restRemaining: { activeWorkout.restTimer?.remainingSeconds },
                            onResume: { showActiveWorkout = true }
                        )
                        .padding(.horizontal, 14)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                    AppTabBar(
                        selection: $selection,
                        isWorkoutActive: activeWorkout.isActive,
                        onCenterTap: {
                            if activeWorkout.isActive {
                                showActiveWorkout = true
                            } else {
                                showStartWorkout = true
                            }
                        }
                    )
                }
                .animation(.snappy(duration: 0.25), value: activeWorkout.isActive)
                .animation(.snappy(duration: 0.25), value: activeWorkout.isPaused)
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .ignoresSafeArea(.keyboard, edges: .bottom)
            }
        }
        .animation(.snappy(duration: 0.22), value: tabChrome.isHidden)
        .safeAreaInset(edge: .top, spacing: 0) {
            Color.clear
                .frame(height: 0)
                .background {
                    Theme.screenBackground.ignoresSafeArea(edges: .top)
                }
        }
        .sheet(isPresented: $showStartWorkout) {
            StartWorkoutSheet(onStarted: {
                showStartWorkout = false
                showActiveWorkout = true
            })
        }
        .fullScreenCover(isPresented: $showActiveWorkout) {
            ActiveWorkoutView()
        }
        #if DEBUG
        .sheet(isPresented: $debugShowAdminUsers) {
            NavigationStack { AdministratorUsersView() }
        }
        .sheet(isPresented: $debugShowManageAccount) {
            if let user = session.currentUser {
                AdministratorManageUserSheet(user: user) { _ in }
            }
        }
        .sheet(isPresented: $debugShowCatalog) {
            NavigationStack {
                switch UserDefaults.standard.string(forKey: "open") {
                case "catalog-gyms": CatalogGymsView()
                case "catalog-exercises": CatalogExercisesView()
                default: CatalogView()
                }
            }
        }
        #endif
        .onScenePhaseActive {
            activeWorkout.expireRestIfNeeded()
            Task { await syncEngine.sync() }
        }
        .onAppear {
            #if DEBUG
            if let tab = UserDefaults.standard.string(forKey: "tab"),
               let target = AppTab(rawValue: tab) {
                selection = target
            }
            switch UserDefaults.standard.string(forKey: "open") {
            case "active", "picker", "settings", "superset-picker": showActiveWorkout = true
            case "start": showStartWorkout = true
            case "admin-users": debugShowAdminUsers = true
            case "admin-account": debugShowManageAccount = true
            case "catalog", "catalog-gyms", "catalog-exercises": debugShowCatalog = true
            default: break
            }
            #endif
        }
    }

    private var bottomClearance: CGFloat {
        activeWorkout.isActive && !tabChrome.isHidden ? Theme.resumeBannerClearance : 0
    }

    @ViewBuilder
    private var tabContent: some View {
        switch selection {
        case .home:
            HomeView(
                onOpenCoach: { selection = .coach },
                onOpenStats: { selection = .stats },
                onOpenHistory: { selection = .history },
                onStartWorkout: { showStartWorkout = true }
            )
        case .history:
            HistoryView(workoutRoute: $historyWorkoutRoute)
        case .stats:
            StatsView(
                onStartWorkout: { showStartWorkout = true },
                onOpenWorkoutInHistory: openWorkoutInHistory
            )
        case .coach:
            CoachView()
        }
    }

    private func openWorkoutInHistory(_ workoutId: String) {
        historyWorkoutRoute = HistoryWorkoutRoute(workoutId: workoutId)
        selection = .history
    }
}

private extension View {
    func onScenePhaseActive(_ action: @escaping () -> Void) -> some View {
        modifier(ScenePhaseActiveModifier(action: action))
    }
}

private struct ScenePhaseActiveModifier: ViewModifier {
    @Environment(\.scenePhase) private var scenePhase
    let action: () -> Void

    func body(content: Content) -> some View {
        content.onChange(of: scenePhase) { _, phase in
            if phase == .active {
                action()
            }
        }
    }
}
