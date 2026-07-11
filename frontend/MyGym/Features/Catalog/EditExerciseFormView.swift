import SwiftUI

struct EditExerciseFormView: View {
    let exercise: Exercise

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalStore.self) private var store
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    @State private var name: String
    @State private var equipment: EquipmentType
    @State private var brandMode: ExerciseBrandMode
    @State private var brandId: String?
    @State private var showsNewBrandAlert = false
    @State private var newBrandName = ""
    @State private var primaryMuscle: MuscleGroup
    @State private var secondaryMuscles: Set<MuscleGroup>
    @State private var isUnilateral: Bool
    @State private var isWeighted: Bool

    @State private var isSaving = false
    @State private var alert: ManageAlert?

    init(exercise: Exercise) {
        self.exercise = exercise
        _name = State(initialValue: exercise.name)
        _equipment = State(initialValue: exercise.equipment)
        _brandMode = State(initialValue: exercise.brandMode)
        _brandId = State(initialValue: exercise.brandId)
        _primaryMuscle = State(initialValue: exercise.primaryMuscle)
        _secondaryMuscles = State(initialValue: Set(exercise.secondaryMuscles))
        _isUnilateral = State(initialValue: exercise.isUnilateral)
        _isWeighted = State(initialValue: exercise.isWeighted)
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
                    setLoggingField
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
        .alert("New brand", isPresented: $showsNewBrandAlert) {
            TextField("e.g. Technogym", text: $newBrandName)
            Button("Cancel", role: .cancel) { newBrandName = "" }
            Button("Add") { Task { await createBrand() } }
        }
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
                options: [
                    (value: ExerciseBrandMode.none, label: "No brand"),
                    (value: ExerciseBrandMode.single, label: "Branded"),
                    (value: ExerciseBrandMode.multiple, label: "Multiple"),
                ],
                selection: $brandMode
            )
            if brandMode == .single {
                ManageDropdownField(
                    text: selectedBrand?.name ?? "Select brand",
                    isPlaceholder: selectedBrand == nil
                ) {
                    ForEach(sortedBrands) { brand in
                        Button(brand.name) { brandId = brand.id }
                    }
                    Button("New brand\u{2026}") { showsNewBrandAlert = true }
                }
            }
            Text(brandModeCaption)
                .font(Theme.font(12))
                .foregroundStyle(Theme.muted2)
        }
    }

    private var brandModeCaption: String {
        switch brandMode {
        case .none: "This exercise never asks for a brand."
        case .single: "Always logged with the brand picked here."
        case .multiple: "Asks which brand you used each time you add this exercise to a workout."
        }
    }

    private var sortedBrands: [Brand] {
        store.brands.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    private var selectedBrand: Brand? {
        store.brand(id: brandId)
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

    private var setLoggingField: some View {
        VStack(alignment: .leading, spacing: 8) {
            EyebrowText("SET LOGGING")
            ManageToggleRow(
                title: "Weighted",
                subtitle: "Log a weight for each set. Turn off for bodyweight-only exercises.",
                isOn: $isWeighted
            )
            ManageToggleRow(
                title: "Iso-Lateral",
                subtitle: "Log each set for the left and right side.",
                isOn: $isUnilateral
            )
        }
    }

    private var footer: some View {
        PrimaryButton(
            title: "Save changes",
            isLoading: isSaving,
            isDisabled: trimmedName.isEmpty || !hasEdits || (brandMode == .single && brandId == nil)
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
            || brandMode != exercise.brandMode
            || (brandMode == .single ? brandId : nil) != exercise.brandId
            || primaryMuscle != exercise.primaryMuscle
            || secondaryMuscles != Set(exercise.secondaryMuscles)
            || isUnilateral != exercise.isUnilateral
            || isWeighted != exercise.isWeighted
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
                    brandMode: brandMode,
                    brandId: brandMode == .single ? brandId : nil,
                    isUnilateral: isUnilateral,
                    isWeighted: isWeighted
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

    private func createBrand() async {
        let trimmed = newBrandName.trimmingCharacters(in: .whitespacesAndNewlines)
        newBrandName = ""
        guard !trimmed.isEmpty else { return }
        do {
            let brand = try await API.createBrand(name: trimmed)
            store.insert(brand: brand)
            brandId = brand.id
        } catch {
            alert = ManageAlert(
                title: "Couldn\u{2019}t add brand",
                message: ProfileSupport.message(for: error)
            )
        }
    }
}
