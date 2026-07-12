import SwiftUI
import WatchKit

struct WatchRootView: View {
    @Environment(WatchSessionStore.self) private var mirror
    @Environment(\.scenePhase) private var scenePhase

    @State private var page = 1

    var body: some View {
        Group {
            if let summary = mirror.summary {
                SummaryView(summary: summary)
            } else if mirror.session != nil {
                activeSession
            } else {
                IdleView()
            }
        }
        .animation(.snappy(duration: 0.3), value: mirror.session != nil)
        .animation(.snappy(duration: 0.3), value: mirror.summary != nil)
        .overlay {
            if let record = mirror.personalRecord {
                PRCelebrationView(record: record)
                    .transition(.opacity)
            }
        }
        .animation(.easeOut(duration: 0.2), value: mirror.personalRecord != nil)
        .onAppear {
            if mirror.initialControlsPage {
                page = 0
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                mirror.requestSync()
            }
        }
    }

    private var activeSession: some View {
        TabView(selection: $page) {
            ControlsView()
                .tag(0)
            MainPageView()
                .tag(1)
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
    }
}

struct MainPageView: View {
    @Environment(WatchSessionStore.self) private var mirror

    @State private var lastRemaining: Int?

    var body: some View {
        TimelineView(.periodic(from: .now, by: 0.5)) { context in
            content(now: context.date)
                .onChange(of: restRemaining(at: context.date)) { previous, current in
                    handleRestTick(previous: previous, current: current)
                }
        }
    }

    @ViewBuilder
    private func content(now: Date) -> some View {
        if let session = mirror.session, let rest = session.rest, !session.isPaused, rest.remainingSeconds(at: now) > 0 {
            RestView(session: session, rest: rest, now: now)
                .transition(.opacity)
        } else if let session = mirror.session {
            DashboardView(session: session, now: now)
                .transition(.opacity)
        }
    }

    private func restRemaining(at date: Date) -> Int? {
        guard let session = mirror.session, let rest = session.rest, !session.isPaused else { return nil }
        return rest.remainingSeconds(at: date)
    }

    private func handleRestTick(previous: Int?, current: Int?) {
        guard let current, let previous, current < previous else { return }
        if current == 10 {
            WatchHaptics.play(.notification)
        }
        if current == 0 {
            WatchHaptics.doubleSuccess()
            mirror.send(.expireRest)
        }
    }
}

enum WatchHaptics {
    static func play(_ type: WKHapticType) {
        WKInterfaceDevice.current().play(type)
    }

    static func doubleSuccess() {
        play(.success)
        Task {
            try? await Task.sleep(for: .seconds(0.25))
            play(.success)
        }
    }
}
