import SwiftUI

struct NewExerciseFormView: View {
    var prefilledGroup: ExerciseGroup?
    var suggestedGroupName: String?
    var onCreated: (Exercise) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalStore.self) private var store

    @State private var exerciseName: String
    @State private var selectedGroupId: String?
    @State private var equipmentType: EquipmentType = .machine
    @State private var selectedBrandId: String?
    @State private var primaryMuscle: MuscleGroup?
    @State private var isUnilateral = false

    @State private var isCreating = false
    @State private var errorMessage: String?
    @State private var showsError = false

    @State private var showsNewGroupAlert = false
    @State private var newGroupName = ""
    @State private var showsNewBrandAlert = false
    @State private var newBrandName = ""
    @State private var showsDiscardConfirm = false

    private let initialName: String
    private let initialGroupId: String?

    init(
        prefilledGroup: ExerciseGroup? = nil,
        suggestedGroupName: String? = nil,
        onCreated: @escaping (Exercise) -> Void
    ) {
        self.prefilledGroup = prefilledGroup
        self.suggestedGroupName = suggestedGroupName
        self.onCreated = onCreated
        let name = suggestedGroupName ?? prefilledGroup?.name ?? ""
        initialName = name
        initialGroupId = prefilledGroup?.id
        _exerciseName = State(initialValue: name)
        _selectedGroupId = State(initialValue: prefilledGroup?.id)
    }

    var body: some View {
        VStack(spacing: 0) {
            navRow
                .padding(.top, 6)
                .padding(.horizontal, 24)
                .padding(.bottom, 20)
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    if let group = selectedGroup {
                        infoBanner(groupName: group.name)
                            .padding(.bottom, 4)
                    }
                    nameField
                    groupField
                    equipmentTypeField
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
        .toolbar(.hidden, for: .navigationBar)
        .navigationBarBackButtonHidden(true)
        .alert("Couldn\u{2019}t create exercise", isPresented: $showsError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "Something went wrong.")
        }
        .confirmationDialog(
            "Discard this exercise?",
            isPresented: $showsDiscardConfirm,
            titleVisibility: .visible
        ) {
            Button("Discard", role: .destructive) { dismiss() }
            Button("Keep editing", role: .cancel) {}
        }
    }

    private var navRow: some View {
        ModalHeader(
            title: "New exercise",
            dismissTitle: "Back",
            onDismiss: {
                if hasEdits {
                    showsDiscardConfirm = true
                } else {
                    dismiss()
                }
            }
        )
    }

    private var hasEdits: Bool {
        trimmedName != initialName.trimmingCharacters(in: .whitespacesAndNewlines)
            || selectedGroupId != initialGroupId
            || equipmentType != .machine
            || selectedBrandId != nil
            || primaryMuscle != nil
            || isUnilateral
    }

    private var footer: some View {
        PrimaryButton(
            title: "Create & add to workout",
            isLoading: isCreating,
            isDisabled: trimmedName.isEmpty || selectedGroup == nil || primaryMuscle == nil
        ) {
            create()
        }
        .padding(.top, 16)
        .padding(.horizontal, 24)
        .padding(.bottom, 8)
    }

    private func infoBanner(groupName: String) -> some View {
        Text("Reuses the \(Text(groupName).fontWeight(.bold)) movement group, so it joins the cross-machine comparison automatically.")
            .font(Theme.font(12))
            .foregroundStyle(Theme.inkSecondary)
            .lineSpacing(4)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .tintedCard(radius: 14)
    }

    private var nameField: some View {
        VStack(alignment: .leading, spacing: 8) {
            NewExerciseFieldLabel("NAME")
            TextField("e.g. Chest Press", text: $exerciseName)
                .font(Theme.font(15, .semibold))
                .foregroundStyle(Theme.ink)
                .textInputAutocapitalization(.words)
                .submitLabel(.done)
                .padding(.horizontal, 16)
                .frame(minHeight: 54)
                .background(Theme.fieldFill, in: RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous)
                        .strokeBorder(Theme.fieldBorder, lineWidth: 1)
                )
        }
    }

    private var groupField: some View {
        VStack(alignment: .leading, spacing: 8) {
            NewExerciseFieldLabel("MOVEMENT GROUP")
            NewExerciseDropdown(
                text: selectedGroup?.name ?? "Select group",
                isPlaceholder: selectedGroup == nil
            ) {
                ForEach(sortedGroups) { group in
                    Button(group.name) { selectedGroupId = group.id }
                }
                if !sortedGroups.isEmpty {
                    Divider()
                }
                Button("New group…") {
                    if newGroupName.isEmpty {
                        newGroupName = suggestedGroupName ?? ""
                    }
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

    private var equipmentTypeField: some View {
        VStack(alignment: .leading, spacing: 8) {
            NewExerciseFieldLabel("EQUIPMENT TYPE")
            PickerWrapLayout(spacing: 8) {
                ForEach(EquipmentType.allCases) { type in
                    FilterChip(title: type.label, isActive: equipmentType == type) {
                        equipmentType = type
                    }
                }
            }
        }
    }

    private var brandField: some View {
        VStack(alignment: .leading, spacing: 8) {
            NewExerciseFieldLabel("BRAND")
            NewExerciseDropdown(
                text: selectedBrand?.name ?? "No brand",
                isPlaceholder: false
            ) {
                Button("No brand") { selectedBrandId = nil }
                ForEach(sortedBrands) { brand in
                    Button(brand.name) { selectedBrandId = brand.id }
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
            NewExerciseFieldLabel("PRIMARY MUSCLE")
            NewExerciseDropdown(
                text: primaryMuscle?.label ?? "Select muscle",
                isPlaceholder: primaryMuscle == nil
            ) {
                ForEach(MuscleGroup.allCases) { muscle in
                    Button(muscle.label) { primaryMuscle = muscle }
                }
            }
        }
    }

    private var unilateralField: some View {
        VStack(alignment: .leading, spacing: 8) {
            NewExerciseFieldLabel("SET LOGGING")
            ManageToggleRow(
                title: "Single-arm",
                subtitle: "Log each set for the left and right side.",
                isOn: $isUnilateral
            )
        }
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
        guard let selectedGroupId else { return nil }
        if let group = store.exerciseGroups.first(where: { $0.id == selectedGroupId }) {
            return group
        }
        return prefilledGroup?.id == selectedGroupId ? prefilledGroup : nil
    }

    private var selectedBrand: Brand? {
        guard let selectedBrandId else { return nil }
        return store.brands.first { $0.id == selectedBrandId }
    }

    private func createGroup() {
        let name = newGroupName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        Task {
            do {
                let group = try await API.createExerciseGroup(name: name)
                store.insert(group: group)
                selectedGroupId = group.id
            } catch let error as APIError where error.statusCode == 409 {
                if let existing = store.exerciseGroups.first(where: {
                    $0.name.caseInsensitiveCompare(name) == .orderedSame
                }) {
                    selectedGroupId = existing.id
                } else {
                    presentError(error)
                }
            } catch {
                presentError(error)
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
                selectedBrandId = brand.id
            } catch let error as APIError where error.statusCode == 409 {
                if let existing = store.brands.first(where: {
                    $0.name.caseInsensitiveCompare(name) == .orderedSame
                }) {
                    selectedBrandId = existing.id
                } else {
                    presentError(error)
                }
            } catch {
                presentError(error)
            }
        }
    }

    private var trimmedName: String {
        exerciseName.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func create() {
        let name = trimmedName
        guard !name.isEmpty, let group = selectedGroup, let muscle = primaryMuscle, !isCreating else { return }
        guard !store.exercises.contains(where: { $0.name.caseInsensitiveCompare(name) == .orderedSame }) else {
            errorMessage = "An exercise named \u{201C}\(name)\u{201D} already exists."
            showsError = true
            return
        }
        let brand = selectedBrand
        isCreating = true
        Task {
            do {
                let exercise = try await API.createExercise(
                    .init(
                        name: name,
                        primaryMuscle: muscle,
                        secondaryMuscles: nil,
                        equipment: equipmentType,
                        brandId: brand?.id,
                        groupId: group.id,
                        isUnilateral: isUnilateral
                    )
                )
                store.insert(exercise: exercise)
                isCreating = false
                onCreated(exercise)
            } catch let error as APIError where error.statusCode == 409 {
                isCreating = false
                errorMessage = "An exercise named \u{201C}\(name)\u{201D} already exists."
                showsError = true
            } catch {
                isCreating = false
                presentError(error)
            }
        }
    }

    private func presentError(_ error: Error) {
        if let apiError = error as? APIError {
            errorMessage = apiError.statusCode == 403
                ? "Only the administrator can extend the catalog."
                : apiError.message
        } else if let networkError = error as? NetworkError, case .offline = networkError {
            errorMessage = "You\u{2019}re offline. Connect to the internet to add to the catalog."
        } else {
            errorMessage = error.localizedDescription
        }
        showsError = true
    }
}

private struct NewExerciseFieldLabel: View {
    let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        EyebrowText(text)
    }
}

private struct NewExerciseDropdown<Content: View>: View {
    let text: String
    var isPlaceholder = false
    @ViewBuilder let menuContent: () -> Content

    var body: some View {
        Menu {
            menuContent()
        } label: {
            HStack {
                Text(text)
                    .font(Theme.font(15, .semibold))
                    .foregroundStyle(isPlaceholder ? Theme.muted : Theme.ink)
                    .lineLimit(1)
                Spacer()
                Image(systemName: "chevron.down")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.tabInactive)
            }
            .padding(.horizontal, 16)
            .frame(minHeight: 54)
            .background(Theme.fieldFill, in: RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous)
                    .strokeBorder(Theme.fieldBorder, lineWidth: 1)
            )
            .contentShape(RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous))
        }
        .menuOrder(.fixed)
        .buttonStyle(.plain)
    }
}

struct PickerWrapLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var rowWidth: CGFloat = 0
        var rowHeight: CGFloat = 0
        var totalWidth: CGFloat = 0
        var totalHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if rowWidth > 0, rowWidth + spacing + size.width > maxWidth {
                totalWidth = max(totalWidth, rowWidth)
                totalHeight += rowHeight + spacing
                rowWidth = 0
                rowHeight = 0
            }
            rowWidth += (rowWidth > 0 ? spacing : 0) + size.width
            rowHeight = max(rowHeight, size.height)
        }
        totalWidth = max(totalWidth, rowWidth)
        totalHeight += rowHeight
        return CGSize(
            width: maxWidth.isFinite ? maxWidth : totalWidth,
            height: totalHeight
        )
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > bounds.minX, x + size.width > bounds.maxX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(
                at: CGPoint(x: x, y: y),
                anchor: .topLeading,
                proposal: ProposedViewSize(size)
            )
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
