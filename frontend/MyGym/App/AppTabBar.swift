import SwiftUI

enum AppTab: String, CaseIterable {
    case home
    case history
    case stats
    case coach

    var label: String {
        switch self {
        case .home: return "Home"
        case .history: return "History"
        case .stats: return "Stats"
        case .coach: return "Coach"
        }
    }

    var systemImage: String {
        switch self {
        case .home: return "house"
        case .history: return "clock.arrow.circlepath"
        case .stats: return "chart.bar.fill"
        case .coach: return "bubble.left"
        }
    }
}

extension Theme {
    static let tabBarClearance: CGFloat = 108
}

struct AppTabBar: View {
    @Binding var selection: AppTab
    var isWorkoutActive: Bool
    var onCenterTap: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            tabItem(.home)
            tabItem(.history)
            centerButton
            tabItem(.stats)
            tabItem(.coach)
        }
        .padding(.top, 11)
        .padding(.horizontal, 26)
        .frame(maxWidth: .infinity)
        .background {
            ZStack {
                Rectangle().fill(.ultraThinMaterial)
                Color.white.opacity(0.75)
            }
            .overlay(alignment: .top) {
                Rectangle().fill(Theme.canvas).frame(height: 1)
            }
            .ignoresSafeArea(edges: .bottom)
        }
    }

    private func tabItem(_ tab: AppTab) -> some View {
        let isActive = selection == tab
        return Button {
            selection = tab
        } label: {
            VStack(spacing: 5) {
                Image(systemName: tab.systemImage)
                    .font(.system(size: 20, weight: .medium))
                    .frame(height: 24)
                Text(tab.label)
                    .font(Theme.font(10, .semibold))
            }
            .foregroundStyle(isActive ? Theme.accentBlue : Theme.tabInactive)
            .frame(maxWidth: .infinity)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(tab.label)
        .accessibilityAddTraits(isActive ? [.isSelected] : [])
    }

    private var centerButton: some View {
        Button(action: onCenterTap) {
            VStack(spacing: 5) {
                ZStack {
                    if isWorkoutActive {
                        Circle()
                            .strokeBorder(Theme.resumeRing, lineWidth: 2)
                            .frame(width: 64, height: 64)
                    }
                    Circle()
                        .fill(Theme.accentBlue)
                        .frame(width: 56, height: 56)
                        .shadow(color: Theme.accentBlue.opacity(0.4), radius: 10, y: 8)
                    Image(systemName: isWorkoutActive ? "play.fill" : "plus")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(.white)
                        .offset(x: isWorkoutActive ? 2 : 0)
                }
                .frame(width: 64, height: 56, alignment: .center)
                Text(isWorkoutActive ? "Resume" : "Start")
                    .font(Theme.font(10, .bold))
                    .foregroundStyle(Theme.accentBlue)
            }
            .frame(maxWidth: .infinity)
            .offset(y: -22)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(isWorkoutActive ? "Resume workout" : "Start workout")
    }
}
