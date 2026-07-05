import SwiftUI

struct CatalogBrandsView: View {
    @Environment(LocalStore.self) private var store

    @State private var showsNewBrandAlert = false
    @State private var newBrandName = ""
    @State private var alert: ManageAlert?
    @State private var deleteCandidate: Brand?

    private var brands: [Brand] {
        store.brands.sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }

    var body: some View {
        List {
            ManageScreenTitle(title: "Brands", subtitle: countLine) {
                ManageAddButton {
                    newBrandName = ""
                    showsNewBrandAlert = true
                }
            }
            .manageTitleRow()

            if brands.isEmpty {
                ManageInfoNote(text: "No brands yet.")
                    .manageNoteRow()
            } else {
                ForEach(brands) { brand in
                    RevealActionsRow(actions: [
                        RevealAction(title: "Delete") { deleteCandidate = brand }
                    ]) {
                        Text(brand.name)
                            .font(Theme.font(15))
                            .foregroundStyle(Theme.ink)
                            .frame(maxWidth: .infinity, minHeight: 38, alignment: .leading)
                            .contentShape(Rectangle())
                    }
                    .manageListRow()
                }
            }
        }
        .managePlainList()
        .manageNavigationChrome("Brands")
        .alert("New brand", isPresented: $showsNewBrandAlert) {
            TextField("Brand name", text: $newBrandName)
            Button("Cancel", role: .cancel) {}
            Button("Create") { createBrand() }
        } message: {
            Text("Exercises reference a brand for cross-machine comparisons.")
        }
        .confirmationDialog(
            "Delete \(deleteCandidate?.name ?? "brand")?",
            isPresented: Binding(
                get: { deleteCandidate != nil },
                set: { if !$0 { deleteCandidate = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Delete brand", role: .destructive) {
                if let brand = deleteCandidate {
                    delete(brand)
                }
                deleteCandidate = nil
            }
            Button("Cancel", role: .cancel) { deleteCandidate = nil }
        } message: {
            Text("Exercises using this brand keep working but lose the brand label.")
        }
        .manageInfoAlert($alert)
    }

    private var countLine: String {
        let count = store.brands.count
        return "\(count) \(count == 1 ? "brand" : "brands")"
    }

    private func createBrand() {
        let name = newBrandName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        Task {
            do {
                let brand = try await API.createBrand(name: name)
                store.insert(brand: brand)
            } catch {
                alert = ManageAlert(
                    title: "Couldn\u{2019}t create brand",
                    message: ProfileSupport.message(for: error)
                )
            }
        }
    }

    private func delete(_ brand: Brand) {
        Task {
            do {
                try await API.deleteBrand(id: brand.id)
                store.removeBrand(id: brand.id)
            } catch {
                alert = ManageAlert(
                    title: "Couldn\u{2019}t delete brand",
                    message: ProfileSupport.message(for: error)
                )
            }
        }
    }
}
