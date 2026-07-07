import SwiftUI

struct AddExercisePicker: View {
    var onSelect: (Exercise) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalStore.self) private var store
    @Environment(ApplicationSession.self) private var session
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    @State private var searchText = ""
    @State private var filter: PickerFilter = .all
    @State private var path: [PickerFormDestination] = []

    var body: some View {
        NavigationStack(path: $path) {
            VStack(spacing: 0) {
                navRow
                    .padding(.top, 18)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 10)
                PickerSearchField(text: $searchText)
                    .padding(.horizontal, 24)
                filterChips
                    .padding(.top, 14)
                exerciseList
            }
            .background(Theme.surface.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: PickerFormDestination.self) { _ in
                NewExerciseFormView { exercise in
                    onSelect(exercise)
                    dismiss()
                }
            }
        }
        .presentationDragIndicator(.visible)
        .interactiveDismissDisabled(!path.isEmpty)
    }

    private var navRow: some View {
        ModalHeader(
            title: "Add exercise",
            trailingTitle: "New",
            trailingAction: { path.append(PickerFormDestination()) }
        )
    }

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChip(title: "All", isActive: filter == .all) {
                    filter = .all
                }
                FilterChip(title: "Favorites", systemImage: "star.fill", isActive: filter == .favorites) {
                    filter = filter == .favorites ? .all : .favorites
                }
                ForEach(occurringMuscles) { muscle in
                    FilterChip(title: muscle.label, isActive: filter == .muscle(muscle)) {
                        filter = filter == .muscle(muscle) ? .all : .muscle(muscle)
                    }
                }
            }
            .padding(.horizontal, 24)
        }
    }

    private var exerciseList: some View {
        let sections = listSections
        let bests = bestCompletedSets()
        let query = trimmedQuery
        return ScrollView {
            LazyVStack(alignment: .leading, spacing: 10) {
                if activeExercises.isEmpty {
                    PickerEmptyState()
                    PickerCreateRow(title: endCreateTitle) {
                        path.append(PickerFormDestination())
                    }
                } else {
                    ForEach(sections) { section in
                        sectionView(section, bests: bests)
                    }
                    if sections.isEmpty {
                        Text(query.isEmpty
                             ? "Nothing matches this filter."
                             : "No exercises match \u{201C}\(query)\u{201D}.")
                            .font(Theme.font(13))
                            .foregroundStyle(Theme.muted)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 24)
                    }
                    PickerCreateRow(title: endCreateTitle) {
                        path.append(PickerFormDestination())
                    }
                }
            }
            .padding(.top, 8)
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private func sectionView(_ section: PickerListSection, bests: [String: LocalSet]) -> some View {
        VStack(spacing: 10) {
            ForEach(section.exercises) { exercise in
                PickerExerciseRow(
                    exercise: exercise,
                    brandLine: store.brandLine(for: exercise),
                    prText: bests[exercise.id].flatMap(prLabel(for:))
                ) {
                    onSelect(exercise)
                    dismiss()
                }
            }
        }
        .padding(.top, 8)
    }

    private var trimmedQuery: String {
        searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var activeExercises: [Exercise] {
        let addedIds = Set(activeWorkout.workout?.exercises.map(\.exerciseId) ?? [])
        return store.exercises.filter { !addedIds.contains($0.id) }
    }

    private var occurringMuscles: [MuscleGroup] {
        let present = Set(activeExercises.map(\.primaryMuscle))
        return MuscleGroup.allCases.filter { present.contains($0) }
    }

    private var filteredExercises: [Exercise] {
        let query = trimmedQuery
        return activeExercises.filter { exercise in
            if !query.isEmpty, !exercise.name.localizedCaseInsensitiveContains(query) {
                return false
            }
            switch filter {
            case .all:
                return true
            case .favorites:
                return exercise.isFavorite
            case .muscle(let muscle):
                return exercise.primaryMuscle == muscle
            }
        }
    }

    private var listSections: [PickerListSection] {
        let filtered = filteredExercises
        guard !filtered.isEmpty else { return [] }
        return [PickerListSection(
            id: "picker-all",
            exercises: filtered.sorted {
                $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
            }
        )]
    }

    private var endCreateTitle: String {
        let query = trimmedQuery
        return query.isEmpty ? "New exercise" : "New \(query) exercise"
    }

    private func bestCompletedSets() -> [String: LocalSet] {
        var best: [String: LocalSet] = [:]
        for workout in store.workouts {
            for entry in workout.exercises {
                for set in entry.sets where set.isCompleted {
                    guard let weight = set.weightKg else { continue }
                    if let current = best[entry.exerciseId] {
                        let currentWeight = current.weightKg ?? 0
                        let heavier = weight > currentWeight
                        let sameWeightMoreReps = weight == currentWeight
                            && (set.reps ?? 0) > (current.reps ?? 0)
                        if heavier || sameWeightMoreReps {
                            best[entry.exerciseId] = set
                        }
                    } else {
                        best[entry.exerciseId] = set
                    }
                }
            }
        }
        return best
    }

    private func prLabel(for set: LocalSet) -> String? {
        guard let weightKg = set.weightKg else { return nil }
        var label = "Best " + Formatting.weight(weightKg, unit: session.weightUnit)
        if let reps = set.reps {
            label += "\n×\(reps)"
        }
        return label
    }
}

private enum PickerFilter: Hashable {
    case all
    case favorites
    case muscle(MuscleGroup)
}

struct PickerFormDestination: Hashable {}

private struct PickerListSection: Identifiable {
    var id: String
    var exercises: [Exercise]
}
