import SwiftUI

struct SignInView: View {
    @Environment(ApplicationSession.self) private var session

    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        GeometryReader { proxy in
            ScrollView {
                VStack(spacing: 0) {
                    header

                    LabeledField(
                        label: "EMAIL",
                        placeholder: "you@email.com",
                        text: $email,
                        keyboard: .emailAddress,
                        contentType: .username
                    )
                    .padding(.bottom, 20)

                    LabeledField(
                        label: "PASSWORD",
                        placeholder: "••••••••",
                        text: $password,
                        isSecure: true,
                        contentType: .password
                    )

                    if let errorMessage {
                        Text(errorMessage)
                            .font(Theme.font(13))
                            .foregroundStyle(Theme.danger)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.top, 12)
                    }

                    PrimaryButton(
                        title: "Sign in",
                        isLoading: isLoading,
                        isDisabled: !canSubmit
                    ) {
                        signIn()
                    }
                    .padding(.top, 32)

                    Text("No public sign-up.\nAccounts are invite-only.")
                        .font(Theme.font(13))
                        .foregroundStyle(Theme.muted)
                        .multilineTextAlignment(.center)
                        .lineSpacing(4)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 26)
                }
                .padding(.horizontal, 36)
                .padding(.bottom, 60)
                .frame(maxWidth: .infinity)
                .frame(minHeight: proxy.size.height)
            }
            .scrollBounceBehavior(.basedOnSize)
            .scrollDismissesKeyboard(.interactively)
        }
        .background(Theme.screenBackground.ignoresSafeArea())
        .onSubmit {
            if canSubmit { signIn() }
        }
    }

    private var header: some View {
        VStack(spacing: 0) {
            LogoMark(size: 60)
                .padding(.bottom, 28)

            Text("Welcome back")
                .font(Theme.font(30, .heavy))
                .tracking(-0.5)
                .foregroundStyle(Theme.ink)
                .padding(.bottom, 8)

            Text("Sign in to log your training.")
                .font(Theme.font(15))
                .foregroundStyle(Theme.muted2)
        }
        .frame(maxWidth: .infinity)
        .padding(.bottom, 40)
    }

    private var canSubmit: Bool {
        !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !password.isEmpty
    }

    private func signIn() {
        guard !isLoading else { return }
        errorMessage = nil
        isLoading = true
        Task { @MainActor in
            do {
                try await session.signIn(
                    email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                    password: password
                )
            } catch let error as APIError {
                errorMessage = error.message
            } catch is NetworkError {
                errorMessage = "You're offline. Connect to the internet to sign in."
            } catch {
                errorMessage = "Something went wrong. Please try again."
            }
            isLoading = false
        }
    }
}
