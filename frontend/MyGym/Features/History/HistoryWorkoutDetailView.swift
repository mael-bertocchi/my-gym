import SwiftUI

struct HistoryWorkoutDetailView: View {
    let workoutId: String

    @Environment(LocalStore.self) private var store
    @Environment(AppSession.self) private var session
    @Environment(HealthKitService.self) private var healthKit
    @Environment(\.dismiss) private var dismiss

    @State private var isEditPresented = false

    var body: some View {
        Group {
            if let workout = store.workout(id: workoutId) {
                detail(for: workout)
            } else {
                missingState
            }
        }
        .background(Color.white.ignoresSafeArea())
        .hidesAppTabBar()
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if store.workout(id: workoutId) != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isEditPresented = true
                    } label: {
                        Text("Edit")
                            .font(Theme.font(15))
                            .foregroundStyle(Color(hex: 0x8A9099))
                    }
                }
            }
        }
        .sheet(isPresented: $isEditPresented) {
            if let workout = store.workout(id: workoutId) {
                HistoryWorkoutEditSheet(workout: workout) {
                    isEditPresented = false
                    store.deleteWorkout(id: workoutId)
                    Task { await healthKit.deleteWorkout(id: workoutId) }
                    dismiss()
                }
            }
        }
    }

    private func detail(for workout: LocalWorkout) -> some View {
        let prHits = HistoryPRIndex(workouts: store.workouts).hits(for: workout.id)
        return ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text(workout.name ?? "Workout")
                    .font(Theme.font(26, .heavy))
                    .kerning(-0.4)
                    .foregroundStyle(Theme.ink)
                Text(dateLine(for: workout))
                    .font(Theme.mono(12))
                    .foregroundStyle(Theme.muted2)
                    .padding(.top, 4)
                    .padding(.bottom, 18)

                HStack(spacing: 10) {
                    WorkoutDetailStatTile(
                        value: workout.duration.map(Formatting.duration) ?? "—",
                        caption: "duration"
                    )
                    WorkoutDetailStatTile(
                        value: Formatting.compactVolume(workout.totalVolume, unit: session.weightUnit),
                        caption: "volume"
                    )
                    WorkoutDetailStatTile(
                        value: "\(workout.completedSetCount)",
                        caption: "sets"
                    )
                }
                .padding(.bottom, prHits.isEmpty ? 20 : 18)

                if !prHits.isEmpty {
                    prCallout(hits: prHits)
                        .padding(.bottom, 20)
                }

                exerciseList(for: workout)
            }
            .padding(.top, 8)
            .padding(.horizontal, 22)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func dateLine(for workout: LocalWorkout) -> String {
        let gym = store.gym(id: workout.gymId)?.name.uppercased()
        return [Formatting.monoDate(workout.startedAt), gym]
            .compactMap { $0 }
            .joined(separator: " · ")
    }

    private func prCallout(hits: [HistoryPRIndex.Hit]) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Text("★")
                .font(Theme.font(18))
                .foregroundStyle(Theme.inkSecondary)
            VStack(alignment: .leading, spacing: 4) {
                ForEach(hits) { hit in
                    prLine(for: hit)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 13)
        .padding(.horizontal, 15)
        .tintedCard(radius: 14)
    }

    private func prLine(for hit: HistoryPRIndex.Hit) -> Text {
        let exercise = store.exercise(id: hit.exerciseId)
        let brand = exercise
            .flatMap { store.equipment(id: $0.equipmentId) }
            .flatMap { store.brand(id: $0.brandId) }?
            .name
        var descriptor = exercise?.name ?? "Exercise"
        if let brand {
            descriptor += " · \(brand)"
        }
        var value = Formatting.weight(hit.weightKg, unit: session.weightUnit)
        if let reps = hit.reps {
            value += " × \(reps)"
        }
        return (
            Text("New Record").font(Theme.font(13, .bold))
            + Text(" · \(descriptor) with \(value)").font(Theme.font(13))
        )
        .foregroundStyle(Theme.inkSecondary)
    }

    private func exerciseList(for workout: LocalWorkout) -> some View {
        let entries = workout.exercises.sorted { $0.position < $1.position }
        return VStack(alignment: .leading, spacing: 0) {
            ForEach(entries) { entry in
                if entry.id != entries.first?.id {
                    RowDivider()
                }
                NavigationLink {
                    ExerciseDetailView(exerciseId: entry.exerciseId)
                } label: {
                    WorkoutDetailExerciseRow(entry: entry, unit: session.weightUnit)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var missingState: some View {
        VStack(spacing: 8) {
            Text("Workout unavailable")
                .font(Theme.font(15, .bold))
                .foregroundStyle(Theme.ink)
            Text("This workout is no longer on this device.")
                .font(Theme.font(13))
                .foregroundStyle(Theme.muted2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct WorkoutDetailStatTile: View {
    let value: String
    let caption: String

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(Theme.font(18, .heavy))
                .foregroundStyle(Theme.ink)
            Text(caption)
                .font(Theme.font(11))
                .foregroundStyle(Theme.muted2)
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(
            Theme.screenBackground,
            in: RoundedRectangle(cornerRadius: 14, style: .continuous)
        )
    }
}

private struct WorkoutDetailExerciseRow: View {
    @Environment(LocalStore.self) private var store

    let entry: LocalWorkoutExercise
    let unit: WeightUnit

    var body: some View {
        let exercise = store.exercise(id: entry.exerciseId)
        let completed = entry.sets
            .filter(\.isCompleted)
            .sorted { $0.setNumber < $1.setNumber }
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Text(exercise?.name ?? "Exercise")
                    .font(Theme.font(15, .bold))
                    .foregroundStyle(Theme.ink)
                Spacer()
                Text(setCountLabel)
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.muted2)
            }
            if let exercise {
                let brand = store.brandLine(for: exercise)
                Text(brand.text)
                    .font(Theme.mono(11))
                    .foregroundStyle(brand.isBranded ? Theme.accentBlue : Theme.muted2)
                    .padding(.top, 2)
            }
            if !completed.isEmpty {
                Text(setLog(completed))
                    .font(Theme.mono(12))
                    .foregroundStyle(Theme.muted2)
                    .padding(.top, 8)
            }
        }
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
    }

    private var setCountLabel: String {
        let count = entry.sets.count
        return count == 1 ? "1 set" : "\(count) sets"
    }

    private func setLog(_ sets: [LocalSet]) -> String {
        sets.map { set in
            let weight = Formatting.weightNumber(set.weightKg ?? 0, unit: unit)
            return "\(weight)×\(set.reps ?? 0)"
        }
        .joined(separator: " · ")
    }
}
