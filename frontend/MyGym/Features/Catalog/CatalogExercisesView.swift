import SwiftUI

struct CatalogExercisesView: View {
    @Environment(LocalStore.self) private var store

    @State private var showsNewGroupAlert = false
    @State private var newGroupName = ""
    @State private var alert: ManageAlert?
    @State private var deleteConflict: CatalogExerciseDeleteConflict?
    @State private var selectedExercise: Exercise?
    @State private var editingExercise: Exercise?

    private struct CatalogExerciseBucket: Identifiable {
        let id: String
        let name: String
        let exercises: [Exercise]
    }

    private var buckets: [CatalogExerciseBucket] {
        let groups = store.exerciseGroups.sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
        let groupIds = Set(groups.map(\.id))
        var result: [CatalogExerciseBucket] = groups.map { group in
            CatalogExerciseBucket(
                id: group.id,
                name: group.name,
                exercises: sortedExercises { $0.groupId == group.id }
            )
        }
        let others = sortedExercises { exercise in
            guard let groupId = exercise.groupId else { return true }
            return !groupIds.contains(groupId)
        }
        if !others.isEmpty {
            result.append(CatalogExerciseBucket(id: "administrator-ungrouped", name: "Other", exercises: others))
        }
        return result
    }

    private func sortedExercises(where predicate: (Exercise) -> Bool) -> [Exercise] {
        store.exercises.filter(predicate).sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }

    var body: some View {
        List {
            ManageScreenTitle(title: "Exercises", subtitle: countLine) {
                ManageAddButton {
                    newGroupName = ""
                    showsNewGroupAlert = true
                }
            }
            .manageTitleRow()

            if buckets.isEmpty {
                ManageInfoNote(text: "The exercise catalog is empty — tap + to create a movement group.")
                    .manageNoteRow()
            } else {
                ForEach(buckets) { bucket in
                    bucketHeader(bucket.name)
                    if bucket.exercises.isEmpty {
                        Text("No exercises yet")
                            .font(Theme.font(12))
                            .foregroundStyle(Theme.muted2)
                            .manageListRow()
                            .listRowSeparator(.hidden)
                    } else {
                        ForEach(bucket.exercises) { exercise in
                            RevealActionsRow(
                                actions: [
                                    RevealAction(title: "Edit", tint: Theme.accentBlue) {
                                        editingExercise = exercise
                                    },
                                    RevealAction(title: exercise.isArchived ? "Unarchive" : "Archive", tint: Theme.muted2) {
                                        setArchived(exercise, !exercise.isArchived)
                                    },
                                    RevealAction(title: "Delete") { delete(exercise) },
                                ],
                                onTap: { selectedExercise = exercise }
                            ) {
                                row(exercise)
                            }
                            .manageListRow()
                        }
                    }
                }
            }
        }
        .managePlainList()
        .manageNavigationChrome("Exercises")
        .alert("New group", isPresented: $showsNewGroupAlert) {
            TextField("Group name", text: $newGroupName)
            Button("Cancel", role: .cancel) {}
            Button("Create") { createGroup() }
        } message: {
            Text("Exercises in the same movement group are compared across machines.")
        }
        .alert(
            "Can\u{2019}t delete exercise",
            isPresented: Binding(
                get: { deleteConflict != nil },
                set: { if !$0 { deleteConflict = nil } }
            ),
            presenting: deleteConflict
        ) { conflict in
            Button("Archive instead") { setArchived(conflict.exercise, true) }
            Button("Cancel", role: .cancel) {}
        } message: { conflict in
            Text(conflict.message)
        }
        .manageInfoAlert($alert)
        .navigationDestination(item: $selectedExercise) { exercise in
            ExerciseDetailView(exerciseId: exercise.id)
        }
        .sheet(item: $editingExercise) { exercise in
            EditExerciseFormView(exercise: exercise)
        }
    }

    private var countLine: String {
        let exerciseCount = store.exercises.count
        let groupCount = store.exerciseGroups.count
        return "\(exerciseCount) \(exerciseCount == 1 ? "exercise" : "exercises") · \(groupCount) \(groupCount == 1 ? "group" : "groups")"
    }

    private func bucketHeader(_ name: String) -> some View {
        EyebrowText(name)
            .listRowInsets(EdgeInsets(top: 18, leading: 22, bottom: 6, trailing: 22))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
    }

    private func row(_ exercise: Exercise) -> some View {
        let brandLine = store.brandLine(for: exercise)
        return HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(exercise.name)
                    .font(Theme.font(15, .bold))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                Text(brandLine.text)
                    .font(Theme.mono(11, .semibold))
                    .kerning(0.5)
                    .foregroundStyle(brandLine.isBranded ? Theme.accentBlue : Theme.muted2)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            if exercise.isArchived {
                Text("Archived")
                    .font(Theme.mono(11, .semibold))
                    .foregroundStyle(Theme.muted2)
            }
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Theme.tabInactive)
        }
        .frame(minHeight: 38)
        .contentShape(Rectangle())
    }

    private func createGroup() {
        let name = newGroupName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        Task {
            do {
                let group = try await API.createExerciseGroup(name: name)
                store.insert(group: group)
            } catch {
                alert = ManageAlert(
                    title: "Couldn\u{2019}t create group",
                    message: ProfileSupport.message(for: error)
                )
            }
        }
    }

    private func setArchived(_ exercise: Exercise, _ archived: Bool) {
        Task {
            do {
                let updated = try await API.updateExercise(id: exercise.id, .init(
                    name: nil,
                    primaryMuscle: nil,
                    secondaryMuscles: nil,
                    isFavorite: nil,
                    isArchived: archived
                ))
                store.insert(exercise: updated)
            } catch {
                alert = ManageAlert(
                    title: archived ? "Couldn\u{2019}t archive exercise" : "Couldn\u{2019}t unarchive exercise",
                    message: ProfileSupport.message(for: error)
                )
            }
        }
    }

    private func delete(_ exercise: Exercise) {
        Task {
            do {
                try await API.deleteExercise(id: exercise.id)
                store.removeExercise(id: exercise.id)
            } catch let error as APIError where error.statusCode == 409 {
                deleteConflict = CatalogExerciseDeleteConflict(
                    exercise: exercise,
                    message: error.message
                )
            } catch {
                alert = ManageAlert(
                    title: "Couldn\u{2019}t delete exercise",
                    message: ProfileSupport.message(for: error)
                )
            }
        }
    }
}

struct CatalogExerciseDeleteConflict: Identifiable {
    let id = UUID()
    var exercise: Exercise
    var message: String
}
