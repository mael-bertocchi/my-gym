import SwiftUI

struct CatalogExercisesView: View {
    @Environment(LocalStore.self) private var store

    @State private var showsAddSheet = false
    @State private var alert: ManageAlert?
    @State private var deleteConflict: CatalogExerciseDeleteConflict?
    @State private var selectedExercise: Exercise?
    @State private var editingExercise: Exercise?
    @State private var searchText = ""
    @State private var filter: CatalogExerciseFilter = .all

    private var exercises: [Exercise] {
        store.exercises.sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }

    private var filteredExercises: [Exercise] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        return exercises.filter { exercise in
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

    private var occurringMuscles: [MuscleGroup] {
        let present = Set(store.exercises.map(\.primaryMuscle))
        return MuscleGroup.allCases.filter { present.contains($0) }
    }

    var body: some View {
        List {
            ManageScreenTitle(title: "Exercises", subtitle: countLine) {
                ManageAddButton { showsAddSheet = true }
            }
            .manageTitleRow()

            if exercises.isEmpty {
                ManageInfoNote(text: "The exercise catalog is empty — tap + to add your first exercise.")
                    .manageNoteRow()
            } else {
                SearchField(
                    text: $searchText,
                    prompt: "Search exercises…",
                    accessibilityLabel: "Search exercises"
                )
                .manageSearchRow()

                filterChips
                    .manageFilterRow()

                let results = filteredExercises
                if results.isEmpty {
                    ManageInfoNote(text: noResultsText)
                        .manageNoteRow()
                } else {
                    ForEach(results) { exercise in
                        RevealActionsRow(
                            actions: [
                                RevealAction(title: "Edit", tint: Theme.accentBlue) {
                                    editingExercise = exercise
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
        .managePlainList()
        .manageNavigationChrome("Exercises")
        .sheet(isPresented: $showsAddSheet) {
            CatalogExerciseAddSheet()
        }
        .alert(
            "Can\u{2019}t delete exercise",
            isPresented: Binding(
                get: { deleteConflict != nil },
                set: { if !$0 { deleteConflict = nil } }
            ),
            presenting: deleteConflict
        ) { _ in
            Button("OK", role: .cancel) {}
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
        let count = store.exercises.count
        return "\(count) \(count == 1 ? "exercise" : "exercises")"
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

    private var noResultsText: String {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !query.isEmpty {
            return "No exercises match \u{201C}\(query)\u{201D}."
        }
        return "No exercises match this filter."
    }

    private func row(_ exercise: Exercise) -> some View {
        let line = brandModeLine(exercise)
        return HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(exercise.name)
                    .font(Theme.font(15, .bold))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                Text(line.text)
                    .font(Theme.mono(11, .semibold))
                    .kerning(0.5)
                    .foregroundStyle(line.isBranded ? Theme.accentBlue : Theme.muted2)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Theme.tabInactive)
        }
        .frame(minHeight: 38)
        .contentShape(Rectangle())
    }

    private func brandModeLine(_ exercise: Exercise) -> (text: String, isBranded: Bool) {
        switch exercise.brandMode {
        case .none:
            return (exercise.equipment.rawValue, false)
        case .single:
            guard let brand = store.brand(id: exercise.brandId) else {
                return (exercise.equipment.rawValue, false)
            }
            return (brand.name.uppercased(), true)
        case .multiple:
            return ("\(exercise.equipment.rawValue) · multiple brands", false)
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

enum CatalogExerciseFilter: Hashable {
    case all
    case favorites
    case muscle(MuscleGroup)
}

struct CatalogExerciseDeleteConflict: Identifiable {
    let id = UUID()
    var exercise: Exercise
    var message: String
}

struct CatalogExerciseAddSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(LocalStore.self) private var store

    @State private var name = ""
    @State private var equipment: EquipmentType = .machine
    @State private var brandMode: ExerciseBrandMode = .none
    @State private var brandId: String?
    @State private var showsNewBrandAlert = false
    @State private var newBrandName = ""
    @State private var primaryMuscle: MuscleGroup?
    @State private var secondaryMuscles: Set<MuscleGroup> = []
    @State private var isUnilateral = false

    @State private var isCreating = false
    @State private var alert: ManageAlert?

    var body: some View {
        VStack(spacing: 0) {
            ManageModalHeader(title: "New exercise")
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
        .interactiveDismissDisabled(isCreating)
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
            ManageDropdownField(
                text: primaryMuscle?.label ?? "Select muscle",
                isPlaceholder: primaryMuscle == nil
            ) {
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
            title: "Add exercise",
            isLoading: isCreating,
            isDisabled: trimmedName.isEmpty || primaryMuscle == nil || (brandMode == .single && brandId == nil)
        ) {
            create()
        }
        .padding(.horizontal, 24)
        .padding(.top, 12)
        .padding(.bottom, 8)
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func create() {
        let name = trimmedName
        guard !name.isEmpty, let muscle = primaryMuscle, !isCreating else { return }
        guard !store.exercises.contains(where: {
            $0.name.caseInsensitiveCompare(name) == .orderedSame
        }) else {
            alert = ManageAlert(
                title: "Couldn\u{2019}t add exercise",
                message: "An exercise named \u{201C}\(name)\u{201D} already exists."
            )
            return
        }
        isCreating = true
        Task {
            do {
                let exercise = try await API.createExercise(.init(
                    name: name,
                    primaryMuscle: muscle,
                    secondaryMuscles: secondaryMuscles.isEmpty ? nil : Array(secondaryMuscles),
                    equipment: equipment,
                    brandMode: brandMode,
                    brandId: brandMode == .single ? brandId : nil,
                    isUnilateral: isUnilateral
                ))
                store.insert(exercise: exercise)
                isCreating = false
                dismiss()
            } catch let error as APIError where error.statusCode == 409 {
                isCreating = false
                alert = ManageAlert(
                    title: "Couldn\u{2019}t add exercise",
                    message: "An exercise named \u{201C}\(name)\u{201D} already exists."
                )
            } catch {
                isCreating = false
                alert = ManageAlert(
                    title: "Couldn\u{2019}t add exercise",
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
