import SwiftUI

struct RootView: View {
    @Environment(AppSession.self) private var session
    @Environment(LocalStore.self) private var store
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    var body: some View {
        Group {
            switch session.identityState {
            case .loading:
                ZStack {
                    Color.white.ignoresSafeArea()
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
                DebugSeed.enterDemoEmpty(store: store, session: session, activeWorkout: activeWorkout)
                return
            }
            if CommandLine.arguments.contains("-demo") {
                DebugSeed.enterDemo(store: store, session: session)
                if CommandLine.arguments.contains("-demo-active") {
                    DebugSeed.startDemoActiveWorkout(store: store, activeWorkout: activeWorkout)
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

    #if DEBUG
    @State private var debugShowAdminUsers = false
    @State private var debugShowManageAccount = false
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
            }
        }
        .animation(.snappy(duration: 0.22), value: tabChrome.isHidden)
        .safeAreaInset(edge: .top, spacing: 0) {
            Color.clear
                .frame(height: 0)
                .background {
                    ZStack {
                        Rectangle().fill(.ultraThinMaterial)
                        Theme.screenBackground.opacity(0.75)
                    }
                    .ignoresSafeArea(edges: .top)
                }
        }
        .ignoresSafeArea(.keyboard, edges: .bottom)
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
        #endif
        .onScenePhaseActive {
            Task { await syncEngine.sync() }
        }
        .onAppear {
            #if DEBUG
            if let tab = UserDefaults.standard.string(forKey: "tab"),
               let target = AppTab(rawValue: tab) {
                selection = target
            }
            switch UserDefaults.standard.string(forKey: "open") {
            case "active", "picker", "settings": showActiveWorkout = true
            case "start": showStartWorkout = true
            case "admin-users": debugShowAdminUsers = true
            case "admin-account": debugShowManageAccount = true
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
                onOpenHistory: { selection = .history }
            )
        case .history:
            HistoryView()
        case .stats:
            StatsView()
        case .coach:
            CoachView()
        }
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
