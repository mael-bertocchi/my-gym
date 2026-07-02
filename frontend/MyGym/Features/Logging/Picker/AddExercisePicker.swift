import SwiftUI

struct AddExercisePicker: View {
    var onSelect: (Exercise) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalStore.self) private var store
    @Environment(AppSession.self) private var session

    @State private var searchText = ""
    @State private var filter: PickerFilter = .all
    @State private var path: [PickerFormDestination] = []

    var body: some View {
        NavigationStack(path: $path) {
            VStack(spacing: 0) {
                navRow
                    .padding(.top, 6)
                    .padding(.horizontal, 22)
                    .padding(.bottom, 16)
                PickerSearchField(text: $searchText)
                    .padding(.horizontal, 22)
                filterChips
                    .padding(.top, 14)
                exerciseList
            }
            .background(Color.white.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: PickerFormDestination.self) { destination in
                NewExerciseFormView(
                    prefilledGroup: destination.group,
                    suggestedGroupName: destination.suggestedGroupName
                ) { exercise in
                    onSelect(exercise)
                    dismiss()
                }
            }
        }
    }

    private var navRow: some View {
        ZStack {
            Text("Add exercise")
                .font(Theme.font(16, .bold))
                .foregroundStyle(Theme.ink)
            HStack {
                Button {
                    dismiss()
                } label: {
                    Text("Cancel")
                        .font(Theme.font(15))
                        .foregroundStyle(Color(hex: 0x8A9099))
                }
                .buttonStyle(.plain)
                Spacer()
                Button {
                    path.append(PickerFormDestination())
                } label: {
                    Text("New")
                        .font(Theme.font(15, .bold))
                        .foregroundStyle(Theme.accentBlue)
                }
                .buttonStyle(.plain)
            }
        }
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
            .padding(.horizontal, 22)
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
                        path.append(endCreateDestination)
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
                        path.append(endCreateDestination)
                    }
                }
            }
            .padding(.top, 8)
            .padding(.horizontal, 22)
            .padding(.bottom, 40)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private func sectionView(_ section: PickerListSection, bests: [String: LocalSet]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            EyebrowText(section.title)
                .padding(.top, 8)
                .padding(.bottom, 12)
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
                if let group = section.group, hasFilterContext {
                    PickerCreateRow(title: "New \(group.name) machine") {
                        path.append(PickerFormDestination(group: group))
                    }
                }
            }
        }
    }

    private var trimmedQuery: String {
        searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var hasFilterContext: Bool {
        !trimmedQuery.isEmpty || filter != .all
    }

    private var activeExercises: [Exercise] {
        store.exercises.filter { !$0.isArchived }
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
        let grouped = Dictionary(grouping: filtered, by: \.groupId)
        let groups = store.exerciseGroups.sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
        var sections: [PickerListSection] = []
        for group in groups {
            guard let members = grouped[group.id], !members.isEmpty else { continue }
            sections.append(PickerListSection(
                id: group.id,
                group: group,
                title: sectionTitle(name: group.name, count: members.count),
                exercises: members.sorted {
                    $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
                }
            ))
        }
        let knownGroupIds = Set(groups.map(\.id))
        let ungrouped = filtered.filter { exercise in
            guard let groupId = exercise.groupId else { return true }
            return !knownGroupIds.contains(groupId)
        }
        if !ungrouped.isEmpty {
            sections.append(PickerListSection(
                id: "picker-other",
                group: nil,
                title: sectionTitle(name: "Other", count: ungrouped.count),
                exercises: ungrouped.sorted {
                    $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
                }
            ))
        }
        return sections
    }

    private func sectionTitle(name: String, count: Int) -> String {
        "\(name) — \(count) \(count == 1 ? "movement" : "movements")"
    }

    private var endCreateTitle: String {
        let query = trimmedQuery
        return query.isEmpty ? "New machine" : "New \(query) machine"
    }

    private var endCreateDestination: PickerFormDestination {
        let query = trimmedQuery
        guard !query.isEmpty else { return PickerFormDestination() }
        if let match = store.exerciseGroups.first(where: {
            $0.name.compare(query, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame
        }) {
            return PickerFormDestination(group: match)
        }
        return PickerFormDestination(suggestedGroupName: query)
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
        var label = "Record " + Formatting.weight(weightKg, unit: session.weightUnit)
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

struct PickerFormDestination: Hashable {
    var group: ExerciseGroup? = nil
    var suggestedGroupName: String? = nil
}

private struct PickerListSection: Identifiable {
    var id: String
    var group: ExerciseGroup?
    var title: String
    var exercises: [Exercise]
}
