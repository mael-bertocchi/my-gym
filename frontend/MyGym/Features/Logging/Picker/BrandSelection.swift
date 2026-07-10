import SwiftUI

struct PickerBrandStep: View {
    let exercise: Exercise
    var onPick: (String?) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalStore.self) private var store

    var body: some View {
        VStack(spacing: 0) {
            ModalHeader(title: "Select brand", dismissTitle: "Back", onDismiss: { dismiss() })
                .padding(.top, 18)
                .padding(.horizontal, 24)
                .padding(.bottom, 14)

            VStack(alignment: .leading, spacing: 4) {
                Text(exercise.name)
                    .font(Theme.font(20, .heavy))
                    .tracking(-0.3)
                    .foregroundStyle(Theme.ink)
                Text("Recorded on this session for history and stats.")
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.muted2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)
            .padding(.bottom, 20)

            BrandOptionList(
                suggestedBrandId: store.lastUsedBrandId(exerciseId: exercise.id),
                includesNoBrand: false,
                onPick: onPick
            )
        }
        .background(Theme.surface.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
    }
}

struct EntryBrandSheet: View {
    let entry: LocalWorkoutExercise

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalStore.self) private var store
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    var body: some View {
        VStack(spacing: 0) {
            ModalHeader(title: "Select brand")
                .padding(.top, 24)
                .padding(.horizontal, 24)
                .padding(.bottom, 4)

            Text(store.exercise(id: entry.exerciseId)?.name ?? "Exercise")
                .font(Theme.font(13))
                .foregroundStyle(Theme.muted2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 24)
                .padding(.bottom, 18)

            BrandOptionList(
                selectedBrandId: entry.brandId,
                showsSelection: true,
                suggestedBrandId: store.lastUsedBrandId(exerciseId: entry.exerciseId),
                includesNoBrand: false,
                onPick: { brandId in
                    activeWorkout.updateEntryBrand(entryId: entry.id, brandId: brandId)
                    dismiss()
                }
            )
        }
        .background(Theme.surface.ignoresSafeArea())
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

struct BrandOptionList: View {
    var selectedBrandId: String? = nil
    var showsSelection = false
    var suggestedBrandId: String? = nil
    var includesNoBrand = true
    var onPick: (String?) -> Void

    @Environment(LocalStore.self) private var store

    @State private var showNewBrand = false
    @State private var newBrandName = ""
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if includesNoBrand {
                    optionRow(brandId: nil, name: "No brand", subtitle: "Free weights or unbranded machine")
                }
                ForEach(orderedBrands) { brand in
                    optionRow(
                        brandId: brand.id,
                        name: brand.name,
                        subtitle: brand.id == suggestedBrandId ? "Last used for this exercise" : nil
                    )
                }
                newBrandLink
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
        .alert("New brand", isPresented: $showNewBrand) {
            TextField("e.g. Technogym", text: $newBrandName)
            Button("Cancel", role: .cancel) { newBrandName = "" }
            Button("Add") { Task { await createBrand() } }
        }
        .alert("Couldn't add brand", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private var orderedBrands: [Brand] {
        store.brands.sorted { a, b in
            if a.id == suggestedBrandId { return true }
            if b.id == suggestedBrandId { return false }
            return a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
        }
    }

    private func optionRow(brandId: String?, name: String, subtitle: String?) -> some View {
        let isSelected = showsSelection && brandId == selectedBrandId
        return Button {
            onPick(brandId)
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(name)
                        .font(Theme.font(16, isSelected ? .bold : .semibold))
                        .foregroundStyle(Theme.ink)
                    if let subtitle {
                        Text(subtitle)
                            .font(Theme.font(12))
                            .foregroundStyle(brandId == suggestedBrandId ? Theme.accentBlueSoft : Theme.muted2)
                    }
                }
                Spacer(minLength: 8)
                if isSelected {
                    ZStack {
                        Circle()
                            .fill(Theme.accentBlue)
                            .frame(width: 22, height: 22)
                        Circle()
                            .fill(.white)
                            .frame(width: 8, height: 8)
                    }
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                isSelected ? Theme.accentBlueTint : Theme.surface,
                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(
                        isSelected ? Theme.accentBlue : Theme.hairline,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    private var newBrandLink: some View {
        Button {
            showNewBrand = true
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "plus.circle")
                    .font(.system(size: 18, weight: .semibold))
                Text("Add a new brand")
                    .font(Theme.font(14, .semibold))
            }
            .foregroundStyle(Theme.accentBlue)
            .frame(minHeight: Theme.minHitTarget)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func createBrand() async {
        let trimmed = newBrandName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        newBrandName = ""
        do {
            let brand = try await API.createBrand(name: trimmed)
            store.insert(brand: brand)
            onPick(brand.id)
        } catch let error as APIError {
            errorMessage = error.message
        } catch is NetworkError {
            errorMessage = "You're offline — connect to add a brand."
        } catch {
            errorMessage = "Something went wrong. Try again."
        }
    }
}
