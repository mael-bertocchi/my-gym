import SwiftUI

@MainActor
struct ProfileHomeGymSheet: View {
    @Environment(AppSession.self) private var session
    @Environment(LocalStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 0) {
            navRow
                .padding(.top, 12)
                .padding(.horizontal, 24)
                .padding(.bottom, 18)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    if store.gyms.isEmpty {
                        Text("No gyms in the catalog yet.")
                            .font(Theme.font(13))
                            .foregroundStyle(Theme.muted2)
                            .padding(.bottom, 14)
                    }
                    gymRows
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
        }
        .background(Color.white.ignoresSafeArea())
        .presentationDetents([.medium])
        .interactiveDismissDisabled(isSaving)
        .alert(
            "Couldn't update home gym",
            isPresented: Binding(
                get: { errorMessage != nil },
                set: { if !$0 { errorMessage = nil } }
            )
        ) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private var navRow: some View {
        ZStack {
            Text("Home gym")
                .font(Theme.font(16, .bold))
                .foregroundStyle(Theme.ink)
            HStack {
                Button {
                    dismiss()
                } label: {
                    Text("Cancel")
                        .font(Theme.font(15))
                        .foregroundStyle(Color(hex: 0x8A9099))
                }
                .buttonStyle(.plain)
                Spacer()
                if isSaving {
                    ProgressView()
                        .controlSize(.small)
                }
            }
        }
        .frame(height: 44)
    }

    private var gymRows: some View {
        VStack(spacing: 0) {
            ForEach(store.gyms) { gym in
                gymRow(title: gym.name, isSelected: session.defaultGymId == gym.id) {
                    select(gymId: gym.id)
                }
                RowDivider()
            }
            gymRow(title: "None", isSelected: session.defaultGymId == nil) {
                select(gymId: nil)
            }
        }
        .card(radius: 16)
    }

    private func gymRow(
        title: String,
        isSelected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack {
                Text(title)
                    .font(Theme.font(15))
                    .foregroundStyle(Theme.ink)
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.accentBlue)
                }
            }
            .padding(.vertical, 15)
            .padding(.horizontal, 16)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(isSaving)
    }

    private func select(gymId: String?) {
        guard !isSaving else { return }
        isSaving = true
        Task {
            do {
                try await session.updateProfile(defaultGymId: .some(gymId))
                isSaving = false
                dismiss()
            } catch {
                isSaving = false
                errorMessage = ProfileSupport.message(for: error)
            }
        }
    }
}

@MainActor
struct ProfileChangePasswordSheet: View {
    @Environment(\.dismiss) private var dismiss

    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var didSucceed = false
    @State private var serverMessage: String?

    var body: some View {
        VStack(spacing: 0) {
            navRow
                .padding(.top, 12)
                .padding(.horizontal, 24)
                .padding(.bottom, 18)

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    fields
                        .disabled(isLoading || didSucceed)

                    if let inlineMessage {
                        Text(inlineMessage)
                            .font(Theme.font(13))
                            .foregroundStyle(Theme.danger)
                            .lineSpacing(2)
                    }

                    if didSucceed {
                        successRow
                            .padding(.top, 4)
                    } else {
                        PrimaryButton(
                            title: "Change password",
                            isLoading: isLoading,
                            isDisabled: !canSubmit
                        ) {
                            submit()
                        }
                        .padding(.top, 4)
                    }

                    Text("Changing your password signs out your other devices.")
                        .font(Theme.font(12))
                        .foregroundStyle(Theme.muted2)
                        .frame(maxWidth: .infinity)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, 24)
                .padding(.top, 2)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .background(Color.white.ignoresSafeArea())
        .interactiveDismissDisabled(isLoading)
    }

    private var navRow: some View {
        ZStack {
            Text("Change password")
                .font(Theme.font(16, .bold))
                .foregroundStyle(Theme.ink)
            HStack {
                Button {
                    dismiss()
                } label: {
                    Text("Cancel")
                        .font(Theme.font(15))
                        .foregroundStyle(Color(hex: 0x8A9099))
                }
                .buttonStyle(.plain)
                Spacer()
            }
        }
        .frame(height: 44)
    }

    private var fields: some View {
        VStack(alignment: .leading, spacing: 18) {
            LabeledField(
                label: "CURRENT PASSWORD",
                placeholder: "••••••••",
                text: $currentPassword,
                isSecure: true,
                contentType: .password
            )
            LabeledField(
                label: "NEW PASSWORD",
                placeholder: "At least 8 characters",
                text: $newPassword,
                isSecure: true,
                contentType: .newPassword
            )
            LabeledField(
                label: "CONFIRM NEW PASSWORD",
                placeholder: "Repeat the new password",
                text: $confirmPassword,
                isSecure: true,
                contentType: .newPassword
            )
        }
        .onChange(of: currentPassword) { _, _ in serverMessage = nil }
        .onChange(of: newPassword) { _, _ in serverMessage = nil }
        .onChange(of: confirmPassword) { _, _ in serverMessage = nil }
    }

    private var successRow: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Theme.positive)
            Text("Password changed")
                .font(Theme.font(14, .semibold))
                .foregroundStyle(Theme.positive)
        }
        .frame(maxWidth: .infinity)
        .frame(height: Theme.primaryButtonHeight)
        .background(
            Theme.positiveTint,
            in: RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous)
                .strokeBorder(Theme.positiveBorder, lineWidth: 1)
        )
    }

    private var inlineMessage: String? {
        serverMessage ?? validationMessage
    }

    private var validationMessage: String? {
        if !newPassword.isEmpty, newPassword.count < 8 {
            return "New password must be at least 8 characters."
        }
        if !confirmPassword.isEmpty, confirmPassword != newPassword {
            return "New passwords don't match."
        }
        return nil
    }

    private var canSubmit: Bool {
        !currentPassword.isEmpty && newPassword.count >= 8 && confirmPassword == newPassword
    }

    private func submit() {
        guard canSubmit, !isLoading else { return }
        serverMessage = nil
        isLoading = true
        Task {
            do {
                try await API.changePassword(current: currentPassword, new: newPassword)
                isLoading = false
                didSucceed = true
                try? await Task.sleep(for: .seconds(0.9))
                dismiss()
            } catch {
                isLoading = false
                serverMessage = ProfileSupport.message(for: error)
            }
        }
    }
}
