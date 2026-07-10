import SwiftUI

struct EditExerciseFormView: View {
    let exercise: Exercise

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalStore.self) private var store
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    @State private var name: String
    @State private var equipment: EquipmentType
    @State private var requiresBrand: Bool
    @State private var primaryMuscle: MuscleGroup
    @State private var secondaryMuscles: Set<MuscleGroup>
    @State private var isUnilateral: Bool

    @State private var isSaving = false
    @State private var alert: ManageAlert?

    init(exercise: Exercise) {
        self.exercise = exercise
        _name = State(initialValue: exercise.name)
        _equipment = State(initialValue: exercise.equipment)
        _requiresBrand = State(initialValue: exercise.requiresBrand)
        _primaryMuscle = State(initialValue: exercise.primaryMuscle)
        _secondaryMuscles = State(initialValue: Set(exercise.secondaryMuscles))
        _isUnilateral = State(initialValue: exercise.isUnilateral)
    }

    var body: some View {
        VStack(spacing: 0) {
            ManageModalHeader(title: "Edit exercise")
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    nameField
                    equipmentField
                    brandField
                    muscleField
                    secondaryMuscleField
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
            SegmentedPicker(
                options: [(value: false, label: "No brand"), (value: true, label: "Branded")],
                selection: $requiresBrand
            )
            Text("Branded asks which brand you used each time you add this exercise to a workout.")
                .font(Theme.font(12))
                .foregroundStyle(Theme.muted2)
        }
    }

    private var muscleField: some View {
        VStack(alignment: .leading, spacing: 8) {
            EyebrowText("PRIMARY MUSCLE")
            ManageDropdownField(text: primaryMuscle.label, isPlaceholder: false) {
                ForEach(MuscleGroup.allCases) { muscle in
                    Button(muscle.label) {
                        primaryMuscle = muscle
                        secondaryMuscles.remove(muscle)
                    }
                }
            }
        }
    }

    private var secondaryMuscleField: some View {
        VStack(alignment: .leading, spacing: 8) {
            EyebrowText("SECONDARY MUSCLES")
            PickerWrapLayout(spacing: 8) {
                ForEach(MuscleGroup.allCases.filter { $0 != primaryMuscle }) { muscle in
                    FilterChip(title: muscle.label, isActive: secondaryMuscles.contains(muscle)) {
                        if secondaryMuscles.contains(muscle) {
                            secondaryMuscles.remove(muscle)
                        } else {
                            secondaryMuscles.insert(muscle)
                        }
                    }
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
            isDisabled: trimmedName.isEmpty || !hasEdits
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

    private var hasEdits: Bool {
        trimmedName != exercise.name
            || equipment != exercise.equipment
            || requiresBrand != exercise.requiresBrand
            || primaryMuscle != exercise.primaryMuscle
            || secondaryMuscles != Set(exercise.secondaryMuscles)
            || isUnilateral != exercise.isUnilateral
    }

    private func save() {
        let name = trimmedName
        guard !name.isEmpty, !isSaving else { return }
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
                    secondaryMuscles: Array(secondaryMuscles),
                    equipment: equipment,
                    requiresBrand: requiresBrand,
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
}
