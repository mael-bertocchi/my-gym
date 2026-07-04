import SwiftUI

struct StatsView: View {
    var onStartWorkout: () -> Void = {}
    var onOpenWorkoutInHistory: (String) -> Void = { _ in }

    @Environment(LocalStore.self) private var store

    @State private var tab: ProgressTab = .statistics
    @State private var range: StatsMath.Range = .threeMonths
    @State private var pushedExercise: PushedExercise?

    private enum ProgressTab: String, CaseIterable {
        case statistics = "Statistics"
        case calendar = "Calendar"
    }

    private struct PushedExercise: Identifiable, Hashable {
        let id: String
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Progress")
                        .font(Theme.font(26, .heavy))
                        .tracking(-0.4)
                        .foregroundStyle(Theme.ink)
                        .padding(.bottom, 16)

                    tabPicker
                        .padding(.bottom, 16)

                    if !store.workouts.contains(where: { $0.endedAt != nil }) {
                        statsEmptyCard
                            .padding(.bottom, 16)
                    }

                    switch tab {
                    case .statistics:
                        StatsStatisticsBody(range: $range)
                    case .calendar:
                        StatsCalendarBody(onOpenWorkout: onOpenWorkoutInHistory)
                    }
                }
                .padding(.top, 8)
                .padding(.horizontal, Theme.screenPadding)
            }
            .contentMargins(.bottom, Theme.tabBarClearance, for: .scrollContent)
            .defaultScrollAnchor(debugScrollToBottom ? .bottom : .top)
            .background(Theme.screenBackground.ignoresSafeArea())
            .navigationTitle("Progress")
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(item: $pushedExercise) { pushed in
                ExerciseDetailView(exerciseId: pushed.id)
            }
            .onAppear {
                #if DEBUG
                switch UserDefaults.standard.string(forKey: "open") {
                case "exercise-detail":
                    if let exercise = store.exercises.first(where: { $0.name == "Chest Press" }) ?? store.exercises.first {
                        pushedExercise = PushedExercise(id: exercise.id)
                    }
                case "calendar":
                    tab = .calendar
                default:
                    break
                }
                #endif
            }
        }
    }

    private var debugScrollToBottom: Bool {
        #if DEBUG
        return UserDefaults.standard.string(forKey: "open") == "bottom"
        #else
        return false
        #endif
    }

    private var tabPicker: some View {
        SegmentedPicker(
            options: ProgressTab.allCases.map { (value: $0, label: $0.rawValue) },
            selection: $tab
        )
    }

    private var statsEmptyCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Finish a workout and your progress starts charting here.")
                .font(Theme.font(13))
                .foregroundStyle(Theme.muted)
                .lineSpacing(3)
            InlineLink(title: "Start a workout", systemImage: "plus", action: onStartWorkout)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 14)
        .padding(.horizontal, 16)
        .tintedCard()
    }

}

struct StatsRangeChips: View {
    @Binding var selection: StatsMath.Range

    var body: some View {
        HStack(spacing: 6) {
            ForEach(StatsMath.Range.allCases) { candidate in
                FilterChip(
                    title: candidate.rawValue,
                    isActive: selection == candidate,
                    expands: true
                ) {
                    selection = candidate
                }
            }
        }
    }
}

struct StatsEmptyNote: View {
    var text: String = "No data yet"
    var height: CGFloat = 90

    var body: some View {
        Text(text)
            .font(Theme.font(13))
            .foregroundStyle(Theme.muted2)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity, minHeight: height)
    }
}
