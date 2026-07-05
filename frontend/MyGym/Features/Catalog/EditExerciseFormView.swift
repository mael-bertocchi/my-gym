import SwiftUI

struct EditExerciseFormView: View {
    let exercise: Exercise

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalStore.self) private var store
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    @State private var name: String
    @State private var groupId: String?
    @State private var equipment: EquipmentType
    @State private var brandId: String?
    @State private var primaryMuscle: MuscleGroup
    @State private var isUnilateral: Bool

    @State private var isSaving = false
    @State private var alert: ManageAlert?
    @State private var showsNewGroupAlert = false
    @State private var newGroupName = ""
    @State private var showsNewBrandAlert = false
    @State private var newBrandName = ""

    init(exercise: Exercise) {
        self.exercise = exercise
        _name = State(initialValue: exercise.name)
        _groupId = State(initialValue: exercise.groupId)
        _equipment = State(initialValue: exercise.equipment)
        _brandId = State(initialValue: exercise.brandId)
        _primaryMuscle = State(initialValue: exercise.primaryMuscle)
        _isUnilateral = State(initialValue: exercise.isUnilateral)
    }

    var body: some View {
        VStack(spacing: 0) {
            ManageModalHeader(title: "Edit exercise")
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    nameField
                    groupField
                    equipmentField
                    brandField
                    muscleField
                    unilateralField
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
            footer
        }
        .background(Theme.surface.ignoresSafeArea())
        .presentationDragIndicator(.visible)
        .interactiveDismissDisabled(isSaving)
        .manageInfoAlert($alert)
    }

    private var nameField: some View {
        LabeledField(
            label: "NAME",
            placeholder: "e.g. Chest Press",
            text: $name,
            autocapitalization: .words
        )
    }

    private var groupField: some View {
        VStack(alignment: .leading, spacing: 8) {
            EyebrowText("MOVEMENT GROUP")
            ManageDropdownField(
                text: selectedGroup?.name ?? "Select group",
                isPlaceholder: selectedGroup == nil
            ) {
                ForEach(sortedGroups) { group in
                    Button(group.name) { groupId = group.id }
                }
                if !sortedGroups.isEmpty {
                    Divider()
                }
                Button("New group…") {
                    newGroupName = ""
                    showsNewGroupAlert = true
                }
            }
            .alert("New group", isPresented: $showsNewGroupAlert) {
                TextField("Group name", text: $newGroupName)
                Button("Cancel", role: .cancel) {}
                Button("Create") { createGroup() }
            } message: {
                Text("Exercises in the same movement group are compared across machines.")
            }
        }
    }

    private var equipmentField: some View {
        VStack(alignment: .leading, spacing: 8) {
            EyebrowText("EQUIPMENT TYPE")
            PickerWrapLayout(spacing: 8) {
                ForEach(EquipmentType.allCases) { type in
                    FilterChip(title: type.label, isActive: equipment == type) {
                        equipment = type
                    }
                }
            }
        }
    }

    private var brandField: some View {
        VStack(alignment: .leading, spacing: 8) {
            EyebrowText("BRAND")
            ManageDropdownField(
                text: selectedBrand?.name ?? "No brand",
                isPlaceholder: false
            ) {
                Button("No brand") { brandId = nil }
                ForEach(sortedBrands) { brand in
                    Button(brand.name) { brandId = brand.id }
                }
                Divider()
                Button("New brand…") {
                    newBrandName = ""
                    showsNewBrandAlert = true
                }
            }
            .alert("New brand", isPresented: $showsNewBrandAlert) {
                TextField("Brand name", text: $newBrandName)
                Button("Cancel", role: .cancel) {}
                Button("Create") { createBrand() }
            }
        }
    }

    private var muscleField: some View {
        VStack(alignment: .leading, spacing: 8) {
            EyebrowText("PRIMARY MUSCLE")
            ManageDropdownField(text: primaryMuscle.label, isPlaceholder: false) {
                ForEach(MuscleGroup.allCases) { muscle in
                    Button(muscle.label) { primaryMuscle = muscle }
                }
            }
        }
    }

    private var unilateralField: some View {
        VStack(alignment: .leading, spacing: 8) {
            EyebrowText("SET LOGGING")
            ManageToggleRow(
                title: "Single-arm",
                subtitle: "Log each set for the left and right side.",
                isOn: $isUnilateral
            )
        }
    }

    private var footer: some View {
        PrimaryButton(
            title: "Save changes",
            isLoading: isSaving,
            isDisabled: trimmedName.isEmpty || selectedGroup == nil || !hasEdits
        ) {
            save()
        }
        .padding(.horizontal, 24)
        .padding(.top, 12)
        .padding(.bottom, 8)
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var sortedGroups: [ExerciseGroup] {
        store.exerciseGroups.sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }

    private var sortedBrands: [Brand] {
        store.brands.sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }

    private var selectedGroup: ExerciseGroup? {
        guard let groupId else { return nil }
        return store.exerciseGroups.first { $0.id == groupId }
    }

    private var selectedBrand: Brand? {
        guard let brandId else { return nil }
        return store.brands.first { $0.id == brandId }
    }

    private var hasEdits: Bool {
        trimmedName != exercise.name
            || groupId != exercise.groupId
            || equipment != exercise.equipment
            || brandId != exercise.brandId
            || primaryMuscle != exercise.primaryMuscle
            || isUnilateral != exercise.isUnilateral
    }

    private func save() {
        let name = trimmedName
        guard !name.isEmpty, let group = selectedGroup, !isSaving else { return }
        guard !store.exercises.contains(where: {
            $0.id != exercise.id && $0.name.caseInsensitiveCompare(name) == .orderedSame
        }) else {
            alert = ManageAlert(
                title: "Couldn\u{2019}t save changes",
                message: "An exercise named \u{201C}\(name)\u{201D} already exists."
            )
            return
        }
        isSaving = true
        Task {
            do {
                let updated = try await API.editExercise(id: exercise.id, .init(
                    name: name,
                    primaryMuscle: primaryMuscle,
                    equipment: equipment,
                    brandId: brandId,
                    groupId: group.id,
                    isUnilateral: isUnilateral
                ))
                store.insert(exercise: updated)
                isSaving = false
                dismiss()
            } catch let error as APIError where error.statusCode == 409 {
                isSaving = false
                alert = ManageAlert(
                    title: "Couldn\u{2019}t save changes",
                    message: "An exercise named \u{201C}\(name)\u{201D} already exists."
                )
            } catch {
                isSaving = false
                alert = ManageAlert(
                    title: "Couldn\u{2019}t save changes",
                    message: ProfileSupport.message(for: error)
                )
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
                groupId = group.id
            } catch let error as APIError where error.statusCode == 409 {
                if let existing = store.exerciseGroups.first(where: {
                    $0.name.caseInsensitiveCompare(name) == .orderedSame
                }) {
                    groupId = existing.id
                } else {
                    alert = ManageAlert(
                        title: "Couldn\u{2019}t create group",
                        message: ProfileSupport.message(for: error)
                    )
                }
            } catch {
                alert = ManageAlert(
                    title: "Couldn\u{2019}t create group",
                    message: ProfileSupport.message(for: error)
                )
            }
        }
    }

    private func createBrand() {
        let name = newBrandName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        Task {
            do {
                let brand = try await API.createBrand(name: name)
                store.insert(brand: brand)
                brandId = brand.id
            } catch let error as APIError where error.statusCode == 409 {
                if let existing = store.brands.first(where: {
                    $0.name.caseInsensitiveCompare(name) == .orderedSame
                }) {
                    brandId = existing.id
                } else {
                    alert = ManageAlert(
                        title: "Couldn\u{2019}t create brand",
                        message: ProfileSupport.message(for: error)
                    )
                }
            } catch {
                alert = ManageAlert(
                    title: "Couldn\u{2019}t create brand",
                    message: ProfileSupport.message(for: error)
                )
            }
        }
    }
}
