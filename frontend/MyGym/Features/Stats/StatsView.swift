import SwiftUI

struct StatsView: View {
    @Environment(LocalStore.self) private var store

    @State private var tab: ProgressTab = .statistics
    @State private var range: StatsMath.Range = .threeMonths
    @State private var drillRoute: StatsDrillRoute?
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

                    switch tab {
                    case .statistics:
                        StatsStatisticsBody(range: $range, onOpenWeek: openWeek)
                    case .calendar:
                        StatsCalendarBody(onOpenWorkout: { drillRoute = .workout(workoutId: $0) })
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
            .sheet(item: $drillRoute) { route in
                StatsDrillSheet(route: route, onOpenExercise: openExercise)
            }
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
                case "workout-sheet":
                    if let workout = store.workouts.first {
                        drillRoute = .workout(workoutId: workout.id)
                    }
                case "week-sheet":
                    if let week = StatsMath.weeklyVolumes(workouts: store.workouts, weekCount: 1).first {
                        openWeek(week)
                    }
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
        HStack(spacing: 6) {
            ForEach(ProgressTab.allCases, id: \.self) { candidate in
                Button {
                    tab = candidate
                } label: {
                    Text(candidate.rawValue)
                        .font(Theme.font(13, .bold))
                        .foregroundStyle(tab == candidate ? Theme.ink : Theme.muted)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(
                            tab == candidate ? Theme.surface : .clear,
                            in: RoundedRectangle(cornerRadius: 9, style: .continuous)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .background(Theme.fieldFill, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func openWeek(_ week: StatsMath.WeekVolume) {
        let inWeek = store.workouts
            .filter { $0.startedAt >= week.start && $0.startedAt < week.end }
            .sorted { $0.startedAt < $1.startedAt }
        guard !inWeek.isEmpty else { return }
        if inWeek.count == 1 {
            drillRoute = .workout(workoutId: inWeek[0].id)
        } else {
            drillRoute = .week(start: week.start, workoutIds: inWeek.map(\.id))
        }
    }

    private func openExercise(_ exerciseId: String) {
        drillRoute = nil
        Task {
            try? await Task.sleep(for: .milliseconds(350))
            pushedExercise = PushedExercise(id: exerciseId)
        }
    }
}

struct StatsRangeChips: View {
    @Binding var selection: StatsMath.Range

    var body: some View {
        HStack(spacing: 6) {
            ForEach(StatsMath.Range.allCases) { candidate in
                Button {
                    selection = candidate
                } label: {
                    Text(candidate.rawValue)
                        .font(Theme.font(12, .bold))
                        .foregroundStyle(selection == candidate ? .white : Theme.muted)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 7)
                        .background(
                            selection == candidate ? Theme.ink : Theme.fieldFill,
                            in: RoundedRectangle(cornerRadius: 10, style: .continuous)
                        )
                }
                .buttonStyle(.plain)
            }
        }
    }
}

struct StatsEmptyNote: View {
    var height: CGFloat = 90

    var body: some View {
        Text("No data yet")
            .font(Theme.font(13))
            .foregroundStyle(Theme.muted2)
            .frame(maxWidth: .infinity, minHeight: height)
    }
}
