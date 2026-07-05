import SwiftUI

struct CatalogGymsView: View {
    @Environment(LocalStore.self) private var store

    @State private var showsAddSheet = false
    @State private var alert: ManageAlert?
    @State private var deleteCandidate: Gym?

    private var gyms: [Gym] {
        store.gyms.sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }

    var body: some View {
        List {
            ManageScreenTitle(title: "Gyms", subtitle: countLine) {
                ManageAddButton { showsAddSheet = true }
            }
            .manageTitleRow()

            if gyms.isEmpty {
                ManageInfoNote(text: "No gyms yet.")
                    .manageNoteRow()
            } else {
                ForEach(gyms) { gym in
                    RevealActionsRow(actions: [
                        RevealAction(title: "Delete") { deleteCandidate = gym }
                    ]) {
                        row(gym)
                    }
                    .manageListRow()
                }
            }
        }
        .managePlainList()
        .manageNavigationChrome("Gyms")
        .sheet(isPresented: $showsAddSheet) {
            CatalogGymAddSheet()
        }
        .confirmationDialog(
            "Delete \(deleteCandidate?.name ?? "gym")?",
            isPresented: Binding(
                get: { deleteCandidate != nil },
                set: { if !$0 { deleteCandidate = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Delete gym", role: .destructive) {
                if let gym = deleteCandidate {
                    delete(gym)
                }
                deleteCandidate = nil
            }
            Button("Cancel", role: .cancel) { deleteCandidate = nil }
        } message: {
            Text("Workouts logged at this gym keep their history but lose the gym label.")
        }
        .manageInfoAlert($alert)
    }

    private var countLine: String {
        let count = store.gyms.count
        return "\(count) \(count == 1 ? "gym" : "gyms")"
    }

    private func row(_ gym: Gym) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(gym.name)
                .font(Theme.font(15, .bold))
                .foregroundStyle(Theme.ink)
                .lineLimit(1)
            if let address = gym.address, !address.isEmpty {
                Text(address)
                    .font(Theme.font(12))
                    .foregroundStyle(Theme.muted2)
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 38, alignment: .leading)
        .contentShape(Rectangle())
    }

    private func delete(_ gym: Gym) {
        Task {
            do {
                try await API.deleteGym(id: gym.id)
                store.removeGym(id: gym.id)
            } catch {
                alert = ManageAlert(
                    title: "Couldn\u{2019}t delete gym",
                    message: ProfileSupport.message(for: error)
                )
            }
        }
    }
}

struct CatalogGymAddSheet: View {
    @Environment(LocalStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var address = ""
    @State private var notes = ""
    @State private var isCreating = false
    @State private var alert: ManageAlert?

    var body: some View {
        VStack(spacing: 0) {
            ManageModalHeader(title: "New gym")

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    LabeledField(
                        label: "NAME",
                        placeholder: "e.g. Iron Temple",
                        text: $name,
                        autocapitalization: .words
                    )
                    LabeledField(
                        label: "ADDRESS",
                        placeholder: "Optional",
                        text: $address,
                        autocapitalization: .words
                    )
                    LabeledField(
                        label: "NOTES",
                        placeholder: "Optional",
                        text: $notes,
                        autocapitalization: .sentences
                    )
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)

            PrimaryButton(
                title: "Add gym",
                isLoading: isCreating,
                isDisabled: trimmedName.isEmpty
            ) {
                create()
            }
            .padding(.horizontal, 24)
            .padding(.top, 12)
            .padding(.bottom, 8)
        }
        .background(Theme.surface.ignoresSafeArea())
        .presentationDragIndicator(.visible)
        .manageInfoAlert($alert)
        .interactiveDismissDisabled(isCreating)
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func create() {
        guard !trimmedName.isEmpty, !isCreating else { return }
        let trimmedAddress = address.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        isCreating = true
        Task {
            do {
                let created = try await API.createGym(.init(
                    name: trimmedName,
                    address: trimmedAddress.isEmpty ? nil : trimmedAddress,
                    notes: trimmedNotes.isEmpty ? nil : trimmedNotes
                ))
                store.insert(gym: created)
                isCreating = false
                dismiss()
            } catch {
                isCreating = false
                alert = ManageAlert(
                    title: "Couldn\u{2019}t add gym",
                    message: ProfileSupport.message(for: error)
                )
            }
        }
    }
}
