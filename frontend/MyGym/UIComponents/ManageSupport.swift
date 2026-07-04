import SwiftUI

struct ManageAlert: Identifiable {
    let id = UUID()
    var title: String
    var message: String
}

extension View {
    func manageInfoAlert(_ alert: Binding<ManageAlert?>) -> some View {
        self.alert(
            alert.wrappedValue?.title ?? "",
            isPresented: Binding(
                get: { alert.wrappedValue != nil },
                set: { if !$0 { alert.wrappedValue = nil } }
            ),
            presenting: alert.wrappedValue
        ) { _ in
            Button("OK", role: .cancel) {}
        } message: { payload in
            Text(payload.message)
        }
    }
}

extension View {
    func manageNavigationChrome(_ title: String) -> some View {
        self
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Theme.screenBackground, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Color.clear.frame(width: 1, height: 1)
                }
            }
    }
}

extension View {
    func managePlainList() -> some View {
        self
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Theme.screenBackground.ignoresSafeArea())
            .environment(\.defaultMinListRowHeight, 10)
            .contentMargins(.bottom, 24, for: .scrollContent)
    }

    func manageListRow() -> some View {
        self
            .listRowInsets(EdgeInsets(top: 14, leading: 22, bottom: 14, trailing: 22))
            .listRowBackground(Color.clear)
            .listRowSeparatorTint(Theme.divider)
            .alignmentGuide(.listRowSeparatorLeading) { _ in 0 }
    }

    func manageTitleRow() -> some View {
        self
            .listRowInsets(EdgeInsets(top: 8, leading: 22, bottom: 18, trailing: 22))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
    }

    func manageNoteRow() -> some View {
        self
            .listRowInsets(EdgeInsets(top: 4, leading: 22, bottom: 4, trailing: 22))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
    }
}

struct ManageScreenTitle: View {
    let title: String
    var subtitle: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(Theme.font(26, .heavy))
                .tracking(-0.4)
                .foregroundStyle(Theme.ink)
            if let subtitle {
                Text(subtitle)
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.muted2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct ManageInfoNote: View {
    let text: String

    var body: some View {
        Text(text)
            .font(Theme.font(13))
            .foregroundStyle(Theme.inkSecondary)
            .lineSpacing(4)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .tintedCard(radius: 14)
    }
}

struct ManageHubRow<Destination: View>: View {
    let title: String
    @ViewBuilder let destination: () -> Destination

    var body: some View {
        NavigationLink {
            destination()
        } label: {
            HStack {
                Text(title)
                    .font(Theme.font(15))
                    .foregroundStyle(Theme.ink)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Theme.tabInactive)
            }
            .padding(.vertical, 15)
            .padding(.horizontal, 16)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

struct ManageAddButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "plus")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 34, height: 34)
                .background(
                    Theme.accentBlue,
                    in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
                )
                .expandedTapTarget(vertical: 5, horizontal: 5)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Add")
    }
}

struct ManageModalHeader: View {
    let title: String
    var dismissLabel = "Cancel"
    let onDismiss: () -> Void

    var body: some View {
        ModalHeader(title: title, dismissTitle: dismissLabel, onDismiss: onDismiss)
            .padding(.top, 18)
            .padding(.horizontal, 24)
            .padding(.bottom, 20)
    }
}

struct ManageToggleRow: View {
    let title: String
    var subtitle: String?
    @Binding var isOn: Bool

    var body: some View {
        Toggle(isOn: $isOn) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(Theme.font(15))
                    .foregroundStyle(Theme.ink)
                if let subtitle {
                    Text(subtitle)
                        .font(Theme.font(12))
                        .foregroundStyle(Theme.muted)
                }
            }
        }
        .tint(Theme.accentBlue)
        .padding(.vertical, 10)
        .padding(.horizontal, 16)
        .frame(minHeight: 54)
        .background(
            Theme.fieldFill,
            in: RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous)
                .strokeBorder(Theme.fieldBorder, lineWidth: 1)
        )
    }
}

struct ManageDropdownField<MenuItems: View>: View {
    let text: String
    var isPlaceholder = false
    @ViewBuilder let menuItems: () -> MenuItems

    var body: some View {
        Menu {
            menuItems()
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
