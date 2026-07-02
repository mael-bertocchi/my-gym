import SwiftUI

struct AdministratorExercisesView: View {
    @Environment(LocalStore.self) private var store

    @State private var showsNewGroupAlert = false
    @State private var newGroupName = ""
    @State private var alert: AdministratorAlert?
    @State private var deleteConflict: AdministratorExerciseDeleteConflict?

    private struct AdministratorExerciseBucket: Identifiable {
        let id: String
        let name: String
        let exercises: [Exercise]
    }

    private var buckets: [AdministratorExerciseBucket] {
        let groups = store.exerciseGroups.sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
        let groupIds = Set(groups.map(\.id))
        var result: [AdministratorExerciseBucket] = groups.map { group in
            AdministratorExerciseBucket(
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
            result.append(AdministratorExerciseBucket(id: "administrator-ungrouped", name: "Other", exercises: others))
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
            AdministratorScreenTitle(title: "Exercises", subtitle: countLine)
                .administratorTitleRow()

            if buckets.isEmpty {
                AdministratorInfoNote(text: "The exercise catalog is empty — tap + to create a movement group.")
                    .administratorNoteRow()
            } else {
                ForEach(buckets) { bucket in
                    bucketHeader(bucket.name)
                    if bucket.exercises.isEmpty {
                        Text("No exercises yet")
                            .font(Theme.font(12))
                            .foregroundStyle(Theme.muted2)
                            .administratorListRow()
                            .listRowSeparator(.hidden)
                    } else {
                        ForEach(bucket.exercises) { exercise in
                            row(exercise)
                                .administratorListRow()
                                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                    Button(role: .destructive) {
                                        delete(exercise)
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                    Button {
                                        setArchived(exercise, !exercise.isArchived)
                                    } label: {
                                        Label(
                                            exercise.isArchived ? "Unarchive" : "Archive",
                                            systemImage: exercise.isArchived ? "tray.and.arrow.up" : "archivebox"
                                        )
                                    }
                                    .tint(Color(hex: 0x8A9099))
                                }
                        }
                    }
                }
            }
        }
        .administratorPlainList()
        .administratorNavigationChrome("Exercises")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                AdministratorAddButton {
                    newGroupName = ""
                    showsNewGroupAlert = true
                }
            }
        }
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
        .administratorInfoAlert($alert)
    }

    private var countLine: String {
        let exerciseCount = store.exercises.count
        let groupCount = store.exerciseGroups.count
        return "\(exerciseCount) \(exerciseCount == 1 ? "exercise" : "exercises") · \(groupCount) \(groupCount == 1 ? "group" : "groups")"
    }

    private func bucketHeader(_ name: String) -> some View {
        EyebrowText(name)
            .listRowInsets(EdgeInsets(top: 18, leading: 22, bottom: 6, trailing: 22))
            .listRowBackground(Color.white)
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
        }
    }

    private func createGroup() {
        let name = newGroupName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        Task {
            do {
                let group = try await API.createExerciseGroup(name: name)
                store.insert(group: group)
            } catch {
                alert = AdministratorAlert(
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
                alert = AdministratorAlert(
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
                deleteConflict = AdministratorExerciseDeleteConflict(
                    exercise: exercise,
                    message: error.message
                )
            } catch {
                alert = AdministratorAlert(
                    title: "Couldn\u{2019}t delete exercise",
                    message: ProfileSupport.message(for: error)
                )
            }
        }
    }
}

struct AdministratorExerciseDeleteConflict: Identifiable {
    let id = UUID()
    var exercise: Exercise
    var message: String
}
