import SwiftUI

struct AdministratorUsersView: View {
    @Environment(AppSession.self) private var session

    @State private var users: [UserProfile] = []
    @State private var isLoading = true
    @State private var loadNote: String?
    @State private var showsCreateSheet = false
    @State private var managingUser: UserProfile?
    @State private var searchText = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                ManageScreenTitle(title: "Users", subtitle: subtitle) {
                    ManageAddButton { showsCreateSheet = true }
                }
                .padding(.bottom, 20)
                if showsSearch {
                    SearchField(
                        text: $searchText,
                        prompt: "Search accounts…",
                        accessibilityLabel: "Search accounts"
                    )
                    .padding(.bottom, 16)
                }
                content
            }
            .padding(.horizontal, 22)
            .padding(.top, 8)
            .padding(.bottom, 40)
        }
        .background(Theme.screenBackground.ignoresSafeArea())
        .manageNavigationChrome("Users")
        .sheet(isPresented: $showsCreateSheet) {
            AdministratorCreateUserSheet { created in
                users.insert(created, at: 0)
                loadNote = nil
            }
        }
        .sheet(item: $managingUser) { user in
            AdministratorManageUserSheet(user: user) { updated in
                applyUpdate(updated)
            }
        }
        .task(id: searchText) { await loadDebounced() }
        .refreshable { await load() }
    }

    private var showsSearch: Bool {
        if isLoading && users.isEmpty {
            return false
        }
        return !users.isEmpty || !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var subtitle: String {
        if isLoading && users.isEmpty {
            return "Invite-only"
        }
        let noun = users.count == 1 ? "account" : "accounts"
        return "Invite-only · \(users.count) \(noun)"
    }

    @ViewBuilder
    private var content: some View {
        if isLoading && users.isEmpty {
            HStack {
                Spacer()
                ProgressView()
                    .tint(Theme.muted2)
                Spacer()
            }
            .padding(.vertical, 48)
        } else if users.isEmpty {
            ManageInfoNote(text: emptyText)
        } else {
            VStack(spacing: 0) {
                ForEach(users) { user in
                    userRow(user)
                    if user.id != users.last?.id {
                        RowDivider()
                    }
                }
            }
        }
    }

    private func userRow(_ user: UserProfile) -> some View {
        Button {
            managingUser = user
        } label: {
            HStack(spacing: 13) {
                AvatarView(name: user.displayName, size: 42)
                VStack(alignment: .leading, spacing: 2) {
                    Text(user.displayName)
                        .font(Theme.font(15, .bold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                    Text(user.isActive ? user.email : "Deactivated")
                        .font(Theme.font(12))
                        .foregroundStyle(Theme.muted2)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                if user.isActive {
                    AdministratorRoleBadge(isAdministrator: user.isAdministrator)
                }
            }
            .padding(.vertical, 14)
            .contentShape(Rectangle())
            .opacity(user.isActive ? 1 : 0.5)
        }
        .buttonStyle(.plain)
    }

    private var emptyText: String {
        let term = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !term.isEmpty {
            return "No accounts match \u{201C}\(term)\u{201D}."
        }
        return loadNote ?? "Connect to manage accounts."
    }

    private func loadDebounced() async {
        if !searchText.isEmpty {
            try? await Task.sleep(for: .milliseconds(300))
            if Task.isCancelled {
                return
            }
        }
        await load()
    }

    private func load() async {
        let term = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if users.isEmpty {
            isLoading = true
        }
        do {
            var collected: [UserProfile] = []
            var cursor: String?
            var pages = 0
            repeat {
                let page = try await API.users(search: term.isEmpty ? nil : term, cursor: cursor)
                collected.append(contentsOf: page.data)
                cursor = page.nextCursor
                pages += 1
            } while cursor != nil && pages < 20
            if Task.isCancelled {
                return
            }
            users = collected
            loadNote = nil
        } catch {
            if Task.isCancelled {
                return
            }
            if users.isEmpty {
                loadNote = error is NetworkError
                    ? "Connect to manage accounts."
                    : ProfileSupport.message(for: error)
            }
        }
        isLoading = false
    }

    private func applyUpdate(_ updated: UserProfile) {
        if let index = users.firstIndex(where: { $0.id == updated.id }) {
            users[index] = updated
        }
        if updated.id == session.currentUser?.id {
            Task { await session.refreshProfile() }
        }
    }
}

struct AdministratorRoleBadge: View {
    let isAdministrator: Bool

    var body: some View {
        Text(isAdministrator ? "ADMINISTRATOR" : "USER")
            .font(Theme.mono(10, .bold))
            .kerning(0.5)
            .foregroundStyle(isAdministrator ? Theme.accentBlue : Theme.muted2)
            .padding(.vertical, 5)
            .padding(.horizontal, 9)
            .background(
                isAdministrator ? Theme.accentBlueTint : Theme.fieldFill,
                in: RoundedRectangle(cornerRadius: 8, style: .continuous)
            )
    }
}
