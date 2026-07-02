import SwiftUI

enum StatsDrillRoute: Identifiable, Equatable {
    case week(start: Date, workoutIds: [String])
    case workout(workoutId: String)

    var id: String {
        switch self {
        case .week(let start, _): return "week-\(start.timeIntervalSinceReferenceDate)"
        case .workout(let workoutId): return "workout-\(workoutId)"
        }
    }
}

struct StatsDrillSheet: View {
    var onOpenExercise: ((String) -> Void)?

    @Environment(LocalStore.self) private var store
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss

    private struct WeekRef: Equatable {
        let start: Date
        let workoutIds: [String]
    }

    private enum Screen: Equatable {
        case week(WeekRef)
        case workout(workoutId: String, fromWeek: WeekRef?)
    }

    @State private var screen: Screen

    init(route: StatsDrillRoute, onOpenExercise: ((String) -> Void)? = nil) {
        self.onOpenExercise = onOpenExercise
        switch route {
        case .week(let start, let workoutIds):
            _screen = State(initialValue: .week(WeekRef(start: start, workoutIds: workoutIds)))
        case .workout(let workoutId):
            _screen = State(initialValue: .workout(workoutId: workoutId, fromWeek: nil))
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
                .padding(.bottom, 6)
            Text(subtitle)
                .font(Theme.mono(11))
                .foregroundStyle(Theme.muted2)
                .padding(.bottom, 14)
            ScrollView {
                content
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.bottom, 28)
            }
        }
        .padding(.top, 18)
        .padding(.horizontal, 20)
        .presentationDetents([.medium, .fraction(0.78)])
        .presentationDragIndicator(.visible)
    }

    private var header: some View {
        HStack(spacing: 10) {
            if case .workout(_, .some(let weekRef)) = screen {
                Button {
                    screen = .week(weekRef)
                } label: {
                    Text("←")
                        .font(Theme.font(16, .bold))
                        .foregroundStyle(Theme.accentBlue)
                }
                .buttonStyle(.plain)
            }
            Text(title)
                .font(Theme.font(16, .heavy))
                .foregroundStyle(Theme.ink)
            Spacer()
            Button {
                dismiss()
            } label: {
                Text("Close")
                    .font(Theme.font(14, .bold))
                    .foregroundStyle(Theme.muted2)
            }
            .buttonStyle(.plain)
        }
    }

    private var title: String {
        switch screen {
        case .week(let weekRef):
            return "Week of \(Formatting.shortDate(weekRef.start))"
        case .workout(let workoutId, _):
            return store.workout(id: workoutId)?.name ?? "Workout"
        }
    }

    private var subtitle: String {
        switch screen {
        case .week(let weekRef):
            let count = weekRef.workoutIds.count
            return count == 1 ? "1 workout" : "\(count) workouts"
        case .workout(let workoutId, _):
            guard let workout = store.workout(id: workoutId) else { return "" }
            return [
                Formatting.monoDate(workout.startedAt),
                workout.duration.map(Formatting.duration),
                Formatting.weight(workout.totalVolume, unit: session.weightUnit),
            ]
            .compactMap { $0 }
            .joined(separator: " · ")
        }
    }

    @ViewBuilder
    private var content: some View {
        switch screen {
        case .week(let weekRef):
            weekList(weekRef)
        case .workout(let workoutId, _):
            if let workout = store.workout(id: workoutId) {
                entryList(for: workout)
            } else {
                missingNote("This workout is no longer on this device.")
            }
        }
    }

    private func weekList(_ weekRef: WeekRef) -> some View {
        VStack(spacing: 10) {
            ForEach(weekRef.workoutIds.compactMap { store.workout(id: $0) }) { workout in
                Button {
                    screen = .workout(workoutId: workout.id, fromWeek: weekRef)
                } label: {
                    weekRow(for: workout)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func weekRow(for workout: LocalWorkout) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(workout.name ?? "Workout")
                    .font(Theme.font(14, .bold))
                    .foregroundStyle(Theme.ink)
                Text(weekRowSubtitle(for: workout))
                    .font(Theme.mono(10))
                    .foregroundStyle(Theme.muted2)
            }
            Spacer(minLength: 0)
            Text(Formatting.weight(workout.totalVolume, unit: session.weightUnit))
                .font(Theme.mono(13))
                .foregroundStyle(Theme.ink)
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 14)
        .background(Theme.screenBackground, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .contentShape(Rectangle())
    }

    private func weekRowSubtitle(for workout: LocalWorkout) -> String {
        [Formatting.monoDate(workout.startedAt), workout.duration.map(Formatting.duration)]
            .compactMap { $0 }
            .joined(separator: " · ")
    }

    private func entryList(for workout: LocalWorkout) -> some View {
        let entries = workout.exercises.sorted { $0.position < $1.position }
        return VStack(alignment: .leading, spacing: 16) {
            ForEach(entries) { entry in
                VStack(alignment: .leading, spacing: 8) {
                    exerciseName(for: entry)
                    setList(for: entry)
                }
            }
        }
    }

    @ViewBuilder
    private func exerciseName(for entry: LocalWorkoutExercise) -> some View {
        let name = store.exercise(id: entry.exerciseId)?.name ?? "Exercise"
        if let onOpenExercise {
            Button {
                onOpenExercise(entry.exerciseId)
            } label: {
                Text(name)
                    .font(Theme.font(14, .bold))
                    .foregroundStyle(Theme.ink)
            }
            .buttonStyle(.plain)
        } else {
            Text(name)
                .font(Theme.font(14, .bold))
                .foregroundStyle(Theme.ink)
        }
    }

    private func setList(for entry: LocalWorkoutExercise) -> some View {
        let sets = entry.sets
            .filter(\.isCompleted)
            .sorted { $0.setNumber < $1.setNumber }
        return VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(sets.enumerated()), id: \.element.id) { index, set in
                HStack(spacing: 8) {
                    Text("\(index + 1)")
                        .font(Theme.mono(12))
                        .foregroundStyle(Theme.muted2)
                        .frame(width: 16, alignment: .leading)
                    Text(setLabel(for: set))
                        .font(Theme.mono(12))
                        .foregroundStyle(Theme.inkSecondary)
                    Spacer(minLength: 0)
                    Text(set.setType.label.uppercased())
                        .font(Theme.font(10, .bold))
                        .foregroundStyle(typeColor(for: set.setType))
                }
            }
        }
    }

    private func setLabel(for set: LocalSet) -> String {
        if let weight = set.weightKg {
            let label = Formatting.weight(weight, unit: session.weightUnit)
            guard let reps = set.reps else { return label }
            return "\(label) × \(reps)"
        }
        if let reps = set.reps {
            return "\(reps) reps"
        }
        return "—"
    }

    private func typeColor(for type: SetType) -> Color {
        switch type {
        case .warmup: return Theme.warning
        case .failure: return Theme.danger
        case .normal, .drop: return Theme.muted2
        }
    }

    private func missingNote(_ message: String) -> some View {
        Text(message)
            .font(Theme.font(13))
            .foregroundStyle(Theme.muted2)
            .frame(maxWidth: .infinity, minHeight: 60)
    }
}
