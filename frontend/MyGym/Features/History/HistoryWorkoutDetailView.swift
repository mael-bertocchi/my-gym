import SwiftUI

struct HistoryWorkoutDetailView: View {
    let workoutId: String

    @Environment(LocalStore.self) private var store
    @Environment(ApplicationSession.self) private var session
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
        .background(Theme.screenBackground.ignoresSafeArea())
        .hidesApplicationTabBar()
        .manageNavigationChrome("")
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
        let personalRecordHits = HistoryPersonalRecordIndex(workouts: store.workouts).hits(for: workout.id)
        return ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .center, spacing: 12) {
                    Text(workout.name ?? "Workout")
                        .font(Theme.font(26, .heavy))
                        .tracking(-0.4)
                        .foregroundStyle(Theme.ink)
                    Spacer(minLength: 0)
                    Button {
                        isEditPresented = true
                    } label: {
                        Text("Edit")
                            .font(Theme.font(15))
                            .foregroundStyle(Theme.muted2)
                    }
                }
                Text(dateLine(for: workout))
                    .font(Theme.mono(12))
                    .foregroundStyle(Theme.muted2)
                    .padding(.top, 4)
                    .padding(.bottom, 18)

                let hasRatings = workout.difficultyRating != nil || workout.enjoymentRating != nil
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
                        value: "\(completedSetCount(for: workout))",
                        caption: "sets"
                    )
                }
                .padding(.bottom, hasRatings ? 12 : (personalRecordHits.isEmpty ? 20 : 18))

                if hasRatings {
                    ratingsLine(for: workout)
                        .padding(.bottom, personalRecordHits.isEmpty ? 20 : 18)
                }

                if !personalRecordHits.isEmpty {
                    personalRecordCallout(hits: personalRecordHits)
                        .padding(.bottom, 20)
                }

                exerciseList(for: workout)
            }
            .padding(.top, 8)
            .padding(.horizontal, Theme.screenPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func completedSetCount(for workout: LocalWorkout) -> Int {
        workout.exercises.reduce(0) { total, entry in
            let completed = entry.sets.filter(\.isCompleted)
            let unilateral = store.exercise(id: entry.exerciseId)?.isUnilateral ?? false
            return total + (unilateral ? Set(completed.map(\.setNumber)).count : completed.count)
        }
    }

    private func ratingsLine(for workout: LocalWorkout) -> some View {
        HStack(spacing: 16) {
            if let difficulty = workout.difficultyRating {
                HStack(spacing: 6) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Theme.warning)
                    Text("Difficulty \(difficulty)/10")
                        .font(Theme.font(12, .semibold))
                        .foregroundStyle(Theme.inkSecondary)
                }
                .accessibilityElement(children: .combine)
            }
            if let enjoyment = workout.enjoymentRating {
                HStack(spacing: 3) {
                    ForEach(1...5, id: \.self) { value in
                        Image(systemName: value <= enjoyment ? "star.fill" : "star")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(value <= enjoyment ? Theme.accentBlue : Theme.muted2)
                    }
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Enjoyment \(enjoyment) of 5")
            }
        }
    }

    private func dateLine(for workout: LocalWorkout) -> String {
        let gym = store.gym(id: workout.gymId)?.name.uppercased()
        return [Formatting.monoDate(workout.startedAt), gym]
            .compactMap { $0 }
            .joined(separator: " · ")
    }

    private func personalRecordCallout(hits: [HistoryPersonalRecordIndex.Hit]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 0) {
                EyebrowText("New records")
                Spacer(minLength: 0)
                Text("\(hits.count) this session")
                    .font(Theme.font(12))
                    .foregroundStyle(Theme.muted2)
            }
            .padding(.bottom, 12)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(hits) { hit in
                        NavigationLink {
                            ExerciseDetailView(exerciseId: hit.exerciseId)
                        } label: {
                            PersonalRecordCardView(hit: hit, unit: session.weightUnit)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .scrollTargetLayout()
            }
            .contentMargins(.horizontal, Theme.screenPadding, for: .scrollContent)
            .scrollTargetBehavior(.viewAligned)
            .padding(.horizontal, -Theme.screenPadding)
        }
    }

    private func exerciseList(for workout: LocalWorkout) -> some View {
        let items = Superset.groupings(in: workout)
        return VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                if index > 0 {
                    RowDivider()
                }
                switch item {
                case .single(let entry):
                    NavigationLink {
                        ExerciseDetailView(exerciseId: entry.exerciseId)
                    } label: {
                        WorkoutDetailExerciseRow(entry: entry, unit: session.weightUnit)
                    }
                    .buttonStyle(.plain)
                case .pair(_, let members):
                    HistorySupersetRows(members: members, unit: session.weightUnit)
                }
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
                .foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .card(radius: Theme.controlRadius)
        .accessibilityElement(children: .combine)
    }
}

private struct PersonalRecordCardView: View {
    @Environment(LocalStore.self) private var store

    let hit: HistoryPersonalRecordIndex.Hit
    let unit: WeightUnit

    var body: some View {
        let exercise = store.exercise(id: hit.exerciseId)
        let brand = store.brand(id: hit.brandId)?.name

        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 5) {
                Image(systemName: "star.fill")
                    .font(.system(size: 10))
                    .foregroundStyle(Theme.accentBlue)
                Text("PERSONAL RECORD")
                    .font(Theme.mono(10, .bold))
                    .kerning(1.5)
                    .foregroundStyle(Theme.accentBlueSoft)
            }

            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(Formatting.weightNumber(hit.weightKg, unit: unit))
                    .font(Theme.font(30, .heavy))
                    .foregroundStyle(Theme.ink)
                Text(unit.suffix)
                    .font(Theme.font(13, .semibold))
                    .foregroundStyle(Theme.muted)
            }
            .padding(.top, 14)

            if let reps = hit.reps {
                Text("× \(reps) reps")
                    .font(Theme.mono(11))
                    .foregroundStyle(Theme.muted2)
                    .padding(.top, 5)
            }

            Spacer(minLength: 0)

            Text(exercise?.name ?? "Exercise")
                .font(Theme.font(13, .semibold))
                .foregroundStyle(Theme.inkSecondary)
                .lineSpacing(3)
                .lineLimit(2)

            if let brand {
                Text(brand)
                    .font(Theme.mono(10))
                    .foregroundStyle(Theme.muted2)
                    .padding(.top, 4)
            }
        }
        .padding(14)
        .frame(width: 150, height: 176, alignment: .topLeading)
        .tintedCard(radius: 16)
    }
}

private struct HistorySupersetRows: View {
    let members: [LocalWorkoutExercise]
    let unit: WeightUnit

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            EyebrowText("SUPERSET · \(roundLabel)", color: Theme.accentBlue, size: 10)
                .padding(.top, 14)
            ForEach(members) { member in
                NavigationLink {
                    ExerciseDetailView(exerciseId: member.exerciseId)
                } label: {
                    WorkoutDetailExerciseRow(entry: member, unit: unit)
                }
                .buttonStyle(.plain)
            }
        }
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: 1.5, style: .continuous)
                .fill(Theme.accentBlue)
                .frame(width: 3)
                .padding(.vertical, 14)
                .offset(x: -12)
        }
    }

    private var roundLabel: String {
        let rounds = members.map { $0.sets.filter(\.isCompleted).count }.max() ?? 0
        return "\(rounds) \(rounds == 1 ? "ROUND" : "ROUNDS")"
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
                let brand = store.brandLine(brandId: entry.brandId, exercise: exercise)
                Text(brand.text)
                    .font(Theme.mono(11))
                    .foregroundStyle(brand.isBranded ? Theme.accentBlue : Theme.muted2)
                    .padding(.top, 2)
            }
            if !completed.isEmpty {
                Text(setLog(completed))
                    .font(Theme.mono(12))
                    .foregroundStyle(Theme.muted)
                    .padding(.top, 8)
            }
        }
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
    }

    private var setCountLabel: String {
        let unilateral = store.exercise(id: entry.exerciseId)?.isUnilateral ?? false
        let completed = entry.sets.filter(\.isCompleted)
        let count = unilateral ? Set(completed.map(\.setNumber)).count : completed.count
        return count == 1 ? "1 set" : "\(count) sets"
    }

    private func setLog(_ sets: [LocalSet]) -> String {
        let weighted = store.exercise(id: entry.exerciseId)?.isWeighted ?? true
        return sets.map { set in
            let side = set.side.map { "\($0.short) " } ?? ""
            guard weighted else {
                return "\(side)×\(set.reps ?? 0)"
            }
            let weight = Formatting.weightNumber(set.weightKg ?? 0, unit: unit)
            return "\(side)\(weight)×\(set.reps ?? 0)"
        }
        .joined(separator: " · ")
    }
}
