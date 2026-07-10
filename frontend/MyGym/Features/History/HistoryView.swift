import SwiftUI

struct HistoryWorkoutRoute: Identifiable, Hashable {
    let workoutId: String

    var id: String { workoutId }
}

struct HistoryView: View {
    @Environment(LocalStore.self) private var store
    @Environment(ApplicationSession.self) private var session
    @Environment(SyncEngine.self) private var syncEngine

    @Binding var workoutRoute: HistoryWorkoutRoute?

    @State private var selectedGymId: String?
    @State private var thisMonthOnly = false
    @State private var debugShowDetail = false

    init(workoutRoute: Binding<HistoryWorkoutRoute?> = .constant(nil)) {
        _workoutRoute = workoutRoute
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header
                ScrollView {
                    listContent
                        .padding(.top, 4)
                        .padding(.horizontal, Theme.screenPadding)
                }
                .contentMargins(.bottom, Theme.tabBarClearance, for: .scrollContent)
                .refreshable { await syncEngine.sync() }
            }
            .background(Theme.screenBackground.ignoresSafeArea())
            .navigationTitle("History")
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(item: $workoutRoute) { route in
                HistoryWorkoutDetailView(workoutId: route.workoutId)
            }
            .navigationDestination(isPresented: $debugShowDetail) {
                if let id = store.workouts.first(where: { $0.endedAt != nil })?.id {
                    HistoryWorkoutDetailView(workoutId: id)
                }
            }
            .onAppear {
                #if DEBUG
                if UserDefaults.standard.string(forKey: "open") == "workout-detail" {
                    debugShowDetail = true
                }
                #endif
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("History")
                    .font(Theme.font(26, .heavy))
                    .tracking(-0.4)
                    .foregroundStyle(Theme.ink)
                Spacer()
                Menu {
                    gymMenuContent
                } label: {
                    Image(systemName: "line.3.horizontal.decrease")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(Theme.muted)
                        .frame(width: 44, height: 44)
                        .background(
                            Theme.surface,
                            in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
                                .strokeBorder(Theme.hairline, lineWidth: 1)
                        )
                }
                .accessibilityLabel("Filter by gym")
            }
            HStack(spacing: 8) {
                Menu {
                    gymMenuContent
                } label: {
                    FilterChipLabel(
                        title: selectedGymName ?? "All gyms",
                        isActive: selectedGymId != nil
                    )
                }
                .accessibilityLabel("Gym filter: \(selectedGymName ?? "All gyms")")
                FilterChip(title: "This month", isActive: thisMonthOnly) {
                    thisMonthOnly.toggle()
                }
                Spacer()
            }
        }
        .padding(.top, 8)
        .padding(.horizontal, Theme.screenPadding)
        .padding(.bottom, 14)
    }

    @ViewBuilder
    private var gymMenuContent: some View {
        Picker("Gym", selection: $selectedGymId) {
            Text("All gyms").tag(String?.none)
            ForEach(store.gyms) { gym in
                Text(gym.name).tag(String?.some(gym.id))
            }
        }
    }

    private var selectedGymName: String? {
        store.gym(id: selectedGymId)?.name
    }

    @ViewBuilder
    private var listContent: some View {
        let filtered = filteredWorkouts
        if filtered.isEmpty {
            emptyCard
        } else {
            let personalRecordIndex = HistoryPersonalRecordIndex(workouts: store.workouts)
            LazyVStack(alignment: .leading, spacing: 0) {
                ForEach(monthGroups(filtered)) { group in
                    Text(Formatting.monthLabel(group.month))
                        .font(Theme.mono(11, .medium))
                        .kerning(0.5)
                        .foregroundStyle(Theme.muted2)
                        .padding(.vertical, 10)
                        .padding(.horizontal, 2)
                    VStack(spacing: 10) {
                        ForEach(group.workouts) { workout in
                            NavigationLink {
                                HistoryWorkoutDetailView(workoutId: workout.id)
                            } label: {
                                HistoryWorkoutCard(
                                    workout: workout,
                                    gymName: store.gym(id: workout.gymId)?.name,
                                    personalRecordCount: personalRecordIndex.personalRecordCount(for: workout.id),
                                    unit: session.weightUnit
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }

    private var filteredWorkouts: [LocalWorkout] {
        store.workouts.filter { workout in
            guard workout.endedAt != nil else { return false }
            if let selectedGymId, workout.gymId != selectedGymId { return false }
            if thisMonthOnly,
               !Calendar.current.isDate(workout.startedAt, equalTo: .now, toGranularity: .month) {
                return false
            }
            return true
        }
    }

    private var hasAnyFinishedWorkouts: Bool {
        store.workouts.contains { $0.endedAt != nil }
    }

    private func monthGroups(_ workouts: [LocalWorkout]) -> [HistoryMonthGroup] {
        let calendar = Calendar.current
        var groups: [HistoryMonthGroup] = []
        for workout in workouts {
            let components = calendar.dateComponents([.year, .month], from: workout.startedAt)
            let month = calendar.date(from: components) ?? workout.startedAt
            if let last = groups.indices.last, groups[last].month == month {
                groups[last].workouts.append(workout)
            } else {
                groups.append(HistoryMonthGroup(month: month, workouts: [workout]))
            }
        }
        return groups
    }

    private var emptyCard: some View {
        VStack(spacing: 10) {
            Image(systemName: "figure.strengthtraining.traditional")
                .font(.system(size: 30, weight: .medium))
                .foregroundStyle(Theme.muted2)
            Text(hasAnyFinishedWorkouts ? "No matching workouts" : "No workouts yet")
                .font(Theme.font(16, .bold))
                .foregroundStyle(Theme.ink)
            Text(hasAnyFinishedWorkouts
                 ? "Try a different gym or time filter."
                 : "Finished sessions land here.\nTap Start to log your first workout.")
                .font(Theme.font(13))
                .foregroundStyle(Theme.muted2)
                .multilineTextAlignment(.center)
                .lineSpacing(3)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 36)
        .padding(.horizontal, 20)
        .card()
        .padding(.top, 20)
    }
}

private struct HistoryMonthGroup: Identifiable {
    let month: Date
    var workouts: [LocalWorkout]

    var id: Date { month }
}

private struct HistoryWorkoutCard: View {
    let workout: LocalWorkout
    let gymName: String?
    let personalRecordCount: Int
    let unit: WeightUnit

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Text(workout.name ?? "Workout")
                    .font(Theme.font(16, .bold))
                    .foregroundStyle(Theme.ink)
                Spacer()
                Text(Formatting.shortDate(workout.startedAt))
                    .font(Theme.mono(12))
                    .foregroundStyle(Theme.muted2)
            }
            Text(subtitle)
                .font(Theme.font(12))
                .foregroundStyle(Theme.muted2)
                .padding(.top, 4)
                .padding(.bottom, 12)
            HStack(spacing: 18) {
                metric(number: "\(workout.exercises.count)", unit: "ex")
                metric(
                    number: Formatting.compactVolume(workout.totalVolume, unit: unit),
                    unit: unit.suffix
                )
                if personalRecordCount > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 11, weight: .semibold))
                        Text("\(personalRecordCount) record\(personalRecordCount > 1 ? "s" : "")")
                            .font(Theme.font(13, .bold))
                    }
                    .foregroundStyle(Theme.accentBlue)
                }
                Spacer()
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
        .contentShape(Rectangle())
    }

    private var subtitle: String {
        let duration = workout.duration.map(Formatting.duration)
        return [gymName, duration].compactMap { $0 }.joined(separator: " · ")
    }

    private func metric(number: String, unit: String) -> Text {
        let value = Text(number)
            .font(Theme.font(13, .bold))
            .foregroundStyle(Theme.ink)
        let suffix = Text(unit)
            .font(Theme.font(13))
            .foregroundStyle(Theme.muted)
        return Text("\(value) \(suffix)")
    }
}
