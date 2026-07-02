import SwiftUI

struct AdministratorCreateUserSheet: View {
    var onCreated: (UserProfile) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var displayName = ""
    @State private var password = ""
    @State private var isAdministrator = false
    @State private var isCreating = false
    @State private var alert: AdministratorAlert?

    var body: some View {
        VStack(spacing: 0) {
            AdministratorModalHeader(title: "New account") { dismiss() }

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    LabeledField(
                        label: "EMAIL",
                        placeholder: "name@email.com",
                        text: $email,
                        keyboard: .emailAddress
                    )
                    LabeledField(
                        label: "DISPLAY NAME",
                        placeholder: "Full name",
                        text: $displayName
                    )
                    LabeledField(
                        label: "PASSWORD",
                        placeholder: "Min 8 characters",
                        text: $password,
                        isSecure: true
                    )
                    AdministratorToggleRow(
                        title: "Administrator",
                        subtitle: "Can manage accounts and the catalog",
                        isOn: $isAdministrator
                    )
                }
                .padding(.horizontal, 22)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)

            PrimaryButton(
                title: "Create account",
                isLoading: isCreating,
                isDisabled: !isValid
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

    private var trimmedEmail: String {
        email.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var trimmedName: String {
        displayName.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var isValid: Bool {
        trimmedEmail.contains("@") && !trimmedName.isEmpty && password.count >= 8
    }

    private func create() {
        guard isValid, !isCreating else { return }
        isCreating = true
        Task {
            do {
                let created = try await API.createUser(.init(
                    email: trimmedEmail,
                    password: password,
                    displayName: trimmedName,
                    isAdministrator: isAdministrator,
                    weightUnit: nil
                ))
                isCreating = false
                onCreated(created)
                dismiss()
            } catch {
                isCreating = false
                alert = AdministratorAlert(
                    title: "Couldn\u{2019}t create account",
                    message: ProfileSupport.message(for: error)
                )
            }
        }
    }
}

struct AdministratorManageUserSheet: View {
    let onUpdated: (UserProfile) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var user: UserProfile
    @State private var displayName: String
    @State private var isAdministrator: Bool
    @State private var newPassword = ""

    @State private var isSavingName = false
    @State private var isUpdatingRole = false
    @State private var isResettingPassword = false
    @State private var isUpdatingActive = false
    @State private var alert: AdministratorAlert?

    init(user: UserProfile, onUpdated: @escaping (UserProfile) -> Void) {
        self.onUpdated = onUpdated
        _user = State(initialValue: user)
        _displayName = State(initialValue: user.displayName)
        _isAdministrator = State(initialValue: user.isAdministrator)
    }

    var body: some View {
        VStack(spacing: 0) {
            AdministratorModalHeader(title: "Manage account", dismissLabel: "Close") { dismiss() }

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    header
                    displayNameSection
                    roleSection
                    resetPasswordSection
                }
                .padding(.horizontal, 22)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)

            PrimaryButton(
                title: user.isActive ? "Deactivate account" : "Activate account",
                isDestructive: user.isActive,
                isLoading: isUpdatingActive
            ) {
                toggleActive()
            }
            .padding(.horizontal, 22)
            .padding(.top, 12)
            .padding(.bottom, 8)
        }
        .background(Color.white.ignoresSafeArea())
        .administratorInfoAlert($alert)
    }

    private var header: some View {
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
        .padding(.bottom, 2)
    }

    private var nameChanged: Bool {
        let trimmed = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty && trimmed != user.displayName
    }

    private var displayNameSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            LabeledField(
                label: "DISPLAY NAME",
                placeholder: "Display name",
                text: $displayName
            )
            HStack {
                Spacer()
                if isSavingName {
                    ProgressView()
                        .controlSize(.small)
                        .tint(Theme.muted2)
                } else {
                    InlineLink(title: "Save name") { saveName() }
                        .disabled(!nameChanged)
                        .opacity(nameChanged ? 1 : 0.4)
                }
            }
        }
    }

    private var roleSection: some View {
        AdministratorToggleRow(
            title: "Administrator",
            subtitle: "Can manage accounts and the catalog",
            isOn: $isAdministrator
        )
        .disabled(isUpdatingRole)
        .onChange(of: isAdministrator) { oldValue, newValue in
            roleChanged(from: oldValue, to: newValue)
        }
    }

    private var resetPasswordSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            LabeledField(
                label: "RESET PASSWORD",
                placeholder: "New password (min 8 characters)",
                text: $newPassword,
                isSecure: true
            )
            HStack {
                Spacer()
                if isResettingPassword {
                    ProgressView()
                        .controlSize(.small)
                        .tint(Theme.muted2)
                } else {
                    InlineLink(title: "Reset password") { resetPassword() }
                        .disabled(newPassword.count < 8)
                        .opacity(newPassword.count >= 8 ? 1 : 0.4)
                }
            }
        }
    }

    private func apply(_ updated: UserProfile) {
        user = updated
        isAdministrator = updated.isAdministrator
        onUpdated(updated)
    }

    private func saveName() {
        let trimmed = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard nameChanged, !isSavingName else { return }
        isSavingName = true
        Task {
            do {
                let updated = try await API.updateUser(id: user.id, .init(
                    displayName: trimmed,
                    isAdministrator: nil,
                    isActive: nil,
                    weightUnit: nil
                ))
                apply(updated)
                displayName = updated.displayName
            } catch {
                alert = AdministratorAlert(
                    title: "Couldn\u{2019}t rename account",
                    message: ProfileSupport.message(for: error)
                )
            }
            isSavingName = false
        }
    }

    private func roleChanged(from oldValue: Bool, to newValue: Bool) {
        guard newValue != user.isAdministrator, !isUpdatingRole else {
            if newValue == user.isAdministrator { return }
            isAdministrator = oldValue
            return
        }
        isUpdatingRole = true
        Task {
            do {
                let updated = try await API.updateUser(id: user.id, .init(
                    displayName: nil,
                    isAdministrator: newValue,
                    isActive: nil,
                    weightUnit: nil
                ))
                apply(updated)
            } catch {
                isAdministrator = oldValue
                alert = AdministratorAlert(
                    title: "Couldn\u{2019}t update role",
                    message: ProfileSupport.message(for: error)
                )
            }
            isUpdatingRole = false
        }
    }

    private func resetPassword() {
        guard newPassword.count >= 8, !isResettingPassword else { return }
        isResettingPassword = true
        Task {
            do {
                try await API.resetPassword(userId: user.id, newPassword: newPassword)
                newPassword = ""
                alert = AdministratorAlert(
                    title: "Password reset",
                    message: "\(user.displayName) can sign in with the new password. Existing sessions were signed out."
                )
            } catch {
                alert = AdministratorAlert(
                    title: "Couldn\u{2019}t reset password",
                    message: ProfileSupport.message(for: error)
                )
            }
            isResettingPassword = false
        }
    }

    private func toggleActive() {
        guard !isUpdatingActive else { return }
        isUpdatingActive = true
        Task {
            do {
                let updated = try await API.updateUser(id: user.id, .init(
                    displayName: nil,
                    isAdministrator: nil,
                    isActive: !user.isActive,
                    weightUnit: nil
                ))
                apply(updated)
            } catch {
                alert = AdministratorAlert(
                    title: user.isActive ? "Couldn\u{2019}t deactivate account" : "Couldn\u{2019}t activate account",
                    message: ProfileSupport.message(for: error)
                )
            }
            isUpdatingActive = false
        }
    }
}
