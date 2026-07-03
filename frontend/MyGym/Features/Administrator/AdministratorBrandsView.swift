import SwiftUI

struct AdministratorBrandsView: View {
    @Environment(LocalStore.self) private var store

    @State private var showsNewBrandAlert = false
    @State private var newBrandName = ""
    @State private var alert: AdministratorAlert?
    @State private var deleteCandidate: Brand?

    private var brands: [Brand] {
        store.brands.sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }

    var body: some View {
        List {
            AdministratorScreenTitle(title: "Brands", subtitle: countLine)
                .administratorTitleRow()

            if brands.isEmpty {
                AdministratorInfoNote(text: "No brands yet.")
                    .administratorNoteRow()
            } else {
                ForEach(brands) { brand in
                    Text(brand.name)
                        .font(Theme.font(15))
                        .foregroundStyle(Theme.ink)
                        .administratorListRow()
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) {
                                deleteCandidate = brand
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                }
            }
        }
        .administratorPlainList()
        .administratorNavigationChrome("Brands")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                AdministratorAddButton {
                    newBrandName = ""
                    showsNewBrandAlert = true
                }
            }
            .sharedBackgroundVisibility(.hidden)
        }
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
        .administratorInfoAlert($alert)
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
                alert = AdministratorAlert(
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
                alert = AdministratorAlert(
                    title: "Couldn\u{2019}t delete brand",
                    message: ProfileSupport.message(for: error)
                )
            }
        }
    }
}
