import SwiftUI

struct HistoryView: View {
    @Environment(LocalStore.self) private var store
    @Environment(AppSession.self) private var session
    @Environment(SyncEngine.self) private var syncEngine

    @State private var selectedGymId: String?
    @State private var thisMonthOnly = false
    @State private var debugShowDetail = false

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
                    .kerning(-0.4)
                    .foregroundStyle(Theme.ink)
                Spacer()
                Menu {
                    gymMenuContent
                } label: {
                    Image(systemName: "line.3.horizontal.decrease")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(Theme.muted)
                        .frame(width: 38, height: 38)
                        .background(
                            Color.white,
                            in: RoundedRectangle(cornerRadius: 11, style: .continuous)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 11, style: .continuous)
                                .strokeBorder(Theme.hairline, lineWidth: 1)
                        )
                }
            }
            HStack(spacing: 8) {
                Menu {
                    gymMenuContent
                } label: {
                    HistoryFilterChipLabel(
                        title: selectedGymName ?? "All gyms",
                        isActive: true
                    )
                }
                Button {
                    thisMonthOnly.toggle()
                } label: {
                    HistoryFilterChipLabel(title: "This month", isActive: thisMonthOnly)
                }
                .buttonStyle(.plain)
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
            let prIndex = HistoryPRIndex(workouts: store.workouts)
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
                                    prCount: prIndex.prCount(for: workout.id),
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
        .card(radius: 18)
        .padding(.top, 20)
    }
}

private struct HistoryMonthGroup: Identifiable {
    let month: Date
    var workouts: [LocalWorkout]

    var id: Date { month }
}

private struct HistoryFilterChipLabel: View {
    let title: String
    var isActive = false

    var body: some View {
        Text(title)
            .font(Theme.font(12, .semibold))
            .foregroundStyle(isActive ? .white : Theme.muted)
            .padding(.vertical, 7)
            .padding(.horizontal, 13)
            .background(isActive ? Theme.accentBlue : Color.white, in: Capsule())
            .overlay(
                Capsule()
                    .strokeBorder(isActive ? Color.clear : Theme.hairline, lineWidth: 1)
            )
    }
}

private struct HistoryWorkoutCard: View {
    let workout: LocalWorkout
    let gymName: String?
    let prCount: Int
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
                if prCount > 0 {
                    Text("★ \(prCount) Record\(prCount > 1 ? "s" : "")")
                        .font(Theme.font(13, .bold))
                        .foregroundStyle(Theme.accentBlue)
                }
                Spacer()
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .card(radius: 18)
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
