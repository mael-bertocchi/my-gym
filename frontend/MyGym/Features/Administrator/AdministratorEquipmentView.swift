import SwiftUI

struct AdministratorEquipmentView: View {
    @Environment(LocalStore.self) private var store

    @State private var showsAddSheet = false
    @State private var alert: AdministratorAlert?

    private var items: [Equipment] {
        store.equipment.sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }

    var body: some View {
        List {
            AdministratorScreenTitle(title: "Equipment", subtitle: countLine)
                .administratorTitleRow()

            if items.isEmpty {
                AdministratorInfoNote(text: "No equipment yet.")
                    .administratorNoteRow()
            } else {
                ForEach(items) { item in
                    row(item)
                        .administratorListRow()
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button(role: .destructive) {
                                delete(item)
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                }
            }
        }
        .administratorPlainList()
        .administratorNavigationChrome("Equipment")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                AdministratorAddButton { showsAddSheet = true }
            }
            .sharedBackgroundVisibility(.hidden)
        }
        .sheet(isPresented: $showsAddSheet) {
            AdministratorEquipmentAddSheet()
        }
        .administratorInfoAlert($alert)
    }

    private var countLine: String {
        let count = store.equipment.count
        return "\(count) \(count == 1 ? "item" : "items")"
    }

    private func row(_ item: Equipment) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(item.name)
                .font(Theme.font(15, .bold))
                .foregroundStyle(Theme.ink)
                .lineLimit(1)
            Text("\(item.type.label) · \(store.brand(id: item.brandId)?.name ?? "No brand")")
                .font(Theme.font(12))
                .foregroundStyle(Theme.muted2)
                .lineLimit(1)
        }
    }

    private func delete(_ item: Equipment) {
        Task {
            do {
                try await API.deleteEquipment(id: item.id)
                store.removeEquipment(id: item.id)
            } catch {
                alert = AdministratorAlert(
                    title: "Couldn\u{2019}t delete equipment",
                    message: ProfileSupport.message(for: error)
                )
            }
        }
    }
}

struct AdministratorEquipmentAddSheet: View {
    @Environment(LocalStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var type: EquipmentType = .machine
    @State private var brandId: String?
    @State private var isCreating = false
    @State private var alert: AdministratorAlert?

    var body: some View {
        VStack(spacing: 0) {
            AdministratorModalHeader(title: "New equipment") { dismiss() }

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    LabeledField(
                        label: "NAME",
                        placeholder: "e.g. Seated Chest Press",
                        text: $name
                    )

                    VStack(alignment: .leading, spacing: 8) {
                        EyebrowText("TYPE")
                        AdministratorDropdownField(text: type.label) {
                            Picker("Type", selection: $type) {
                                ForEach(EquipmentType.allCases) { option in
                                    Text(option.label).tag(option)
                                }
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        EyebrowText("BRAND")
                        AdministratorDropdownField(text: selectedBrand?.name ?? "No brand") {
                            Button("No brand") { brandId = nil }
                            if !sortedBrands.isEmpty {
                                Divider()
                            }
                            ForEach(sortedBrands) { brand in
                                Button(brand.name) { brandId = brand.id }
                            }
                        }
                    }
                }
                .padding(.horizontal, 22)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)

            PrimaryButton(
                title: "Add equipment",
                isLoading: isCreating,
                isDisabled: trimmedName.isEmpty
            ) {
                create()
            }
            .padding(.horizontal, 22)
            .padding(.top, 12)
            .padding(.bottom, 8)
        }
        .background(Color.white.ignoresSafeArea())
        .administratorInfoAlert($alert)
        .interactiveDismissDisabled(isCreating)
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var sortedBrands: [Brand] {
        store.brands.sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }

    private var selectedBrand: Brand? {
        store.brand(id: brandId)
    }

    private func create() {
        guard !trimmedName.isEmpty, !isCreating else { return }
        isCreating = true
        Task {
            do {
                let created = try await API.createEquipment(.init(
                    name: trimmedName,
                    type: type,
                    brandId: brandId
                ))
                store.insert(equipment: created)
                isCreating = false
                dismiss()
            } catch {
                isCreating = false
                alert = AdministratorAlert(
                    title: "Couldn\u{2019}t add equipment",
                    message: ProfileSupport.message(for: error)
                )
            }
        }
    }
}
