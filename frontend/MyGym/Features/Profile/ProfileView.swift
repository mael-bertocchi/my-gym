import SwiftUI

struct ProfileView: View {
    @Environment(AppSession.self) private var session
    @Environment(LocalStore.self) private var store
    @Environment(SyncEngine.self) private var syncEngine
    @Environment(HealthKitService.self) private var healthKit
    @Environment(\.dismiss) private var dismiss

    @State private var selectedUnit: WeightUnit = .kilograms
    @State private var restSeconds = 90
    @State private var isHealthSyncEnabled = false

    @State private var showHomeGymSheet = false
    @State private var showChangePasswordSheet = false
    @State private var showSignOutConfirm = false
    @State private var infoAlert: ProfileInfoAlert?

    private static let restOptions = [30, 60, 90, 120, 150, 180]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    header
                        .padding(.bottom, 24)

                    SectionLabel("PREFERENCES")
                        .padding(.leading, 4)
                        .padding(.bottom, 10)
                    preferencesCard
                        .padding(.bottom, 18)

                    SectionLabel("ACCOUNT")
                        .padding(.leading, 4)
                        .padding(.bottom, 10)
                    accountCard

                    if session.isAdministrator {
                        administratorConsoleRow
                            .padding(.top, 18)
                    }
                }
                .padding(.horizontal, Theme.screenPadding)
                .padding(.top, 8)
                .padding(.bottom, 40)
            }
            .background(Theme.screenBackground)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(Theme.font(15, .semibold))
                        .foregroundStyle(Theme.accentBlue)
                }
            }
            .sheet(isPresented: $showHomeGymSheet) {
                ProfileHomeGymSheet()
            }
            .sheet(isPresented: $showChangePasswordSheet) {
                ProfileChangePasswordSheet()
            }
            .alert("Sign out?", isPresented: $showSignOutConfirm) {
                Button("Sign out", role: .destructive) {
                    Task { await session.signOut() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Local data is removed from this device. Anything not yet synced will be lost.")
            }
            .alert(
                infoAlert?.title ?? "",
                isPresented: Binding(
                    get: { infoAlert != nil },
                    set: { if !$0 { infoAlert = nil } }
                ),
                presenting: infoAlert
            ) { _ in
                Button("OK", role: .cancel) {}
            } message: { alert in
                Text(alert.message)
            }
            .onAppear {
                selectedUnit = session.weightUnit
                restSeconds = session.restTimerSeconds
                isHealthSyncEnabled = healthKit.isEnabled
            }
            .onChange(of: selectedUnit) { oldValue, newValue in
                unitChanged(from: oldValue, to: newValue)
            }
            .onChange(of: session.weightUnit) { _, newValue in
                if selectedUnit != newValue {
                    selectedUnit = newValue
                }
            }
            .onChange(of: isHealthSyncEnabled) { _, newValue in
                guard newValue != healthKit.isEnabled else { return }
                if newValue {
                    Task {
                        if await healthKit.enableSync() == false {
                            isHealthSyncEnabled = false
                            infoAlert = ProfileInfoAlert(
                                title: "Health access needed",
                                message: "Allow MyGym to write workouts in Settings > Health > Data Access & Devices."
                            )
                        }
                    }
                } else {
                    healthKit.isEnabled = false
                }
            }
        }
        .presentationDragIndicator(.visible)
    }

    private var displayName: String {
        session.currentUser?.displayName ?? "Your profile"
    }

    private var header: some View {
        HStack(spacing: 14) {
            AvatarView(name: displayName, size: 58)
            VStack(alignment: .leading, spacing: 2) {
                Text(displayName)
                    .font(Theme.font(20, .heavy))
                    .foregroundStyle(Theme.ink)
                Text(session.isAdministrator ? "Administrator" : "Member")
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.muted2)
            }
        }
    }

    private var homeGymName: String {
        store.gym(id: session.defaultGymId)?.name ?? "None"
    }

    private var preferencesCard: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Units")
                    .font(Theme.font(15))
                    .foregroundStyle(Theme.ink)
                Spacer()
                SegmentedPicker(
                    options: [
                        (value: WeightUnit.kilograms, label: "kg"),
                        (value: WeightUnit.pounds, label: "lb"),
                    ],
                    selection: $selectedUnit,
                    fillsWidth: false
                )
            }
            .padding(.vertical, 10)
            .padding(.horizontal, 16)

            RowDivider()

            Button {
                showHomeGymSheet = true
            } label: {
                HStack(spacing: 6) {
                    Text("Home gym")
                        .font(Theme.font(15))
                        .foregroundStyle(Theme.ink)
                    Spacer()
                    Text(homeGymName)
                        .font(Theme.font(14))
                        .foregroundStyle(Theme.muted)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Theme.tabInactive)
                }
                .padding(.vertical, 15)
                .padding(.horizontal, 16)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            RowDivider()

            Menu {
                ForEach(Self.restOptions, id: \.self) { value in
                    Button {
                        restSeconds = value
                        session.restTimerSeconds = value
                    } label: {
                        if value == restSeconds {
                            Label("\(value)s", systemImage: "checkmark")
                        } else {
                            Text("\(value)s")
                        }
                    }
                }
            } label: {
                HStack(spacing: 6) {
                    Text("Rest timer")
                        .font(Theme.font(15))
                        .foregroundStyle(Theme.ink)
                    Spacer()
                    Text("\(restSeconds)s")
                        .font(Theme.font(14))
                        .foregroundStyle(Theme.muted)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Theme.tabInactive)
                }
                .padding(.vertical, 15)
                .padding(.horizontal, 16)
                .contentShape(Rectangle())
            }

            RowDivider()

            Toggle(isOn: $isHealthSyncEnabled) {
                Text("Sync to Apple Health")
                    .font(Theme.font(15))
                    .foregroundStyle(Theme.ink)
            }
            .tint(Theme.accentBlue)
            .padding(.vertical, 10)
            .padding(.horizontal, 16)
        }
        .card()
    }

    private var accountCard: some View {
        VStack(spacing: 0) {
            syncStatusRow
            RowDivider()
            ProfileActionRow(title: "Change password") {
                showChangePasswordSheet = true
            }
            RowDivider()
            ProfileActionRow(title: "Sign out", titleColor: Theme.danger) {
                showSignOutConfirm = true
            }
        }
        .card()
    }

    private var syncStatusRow: some View {
        Button {
            Task { await syncEngine.sync() }
        } label: {
            HStack(spacing: 8) {
                Text("Sync")
                    .font(Theme.font(15))
                    .foregroundStyle(Theme.ink)
                Spacer()
                if syncEngine.status == .syncing {
                    ProgressView()
                        .controlSize(.small)
                        .tint(Theme.muted2)
                } else {
                    StatusDot(color: syncStatusColor, size: 7)
                    Text(syncStatusText)
                        .font(Theme.font(14))
                        .foregroundStyle(Theme.muted)
                }
            }
            .padding(.vertical, 15)
            .padding(.horizontal, 16)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Sync now. \(syncStatusText)")
    }

    private var syncStatusText: String {
        let pending = store.hasPendingChanges
        switch syncEngine.status {
        case .failed:
            return "Failed — tap to retry"
        case .offline:
            return pending ? "Offline — changes pending" : "Offline"
        default:
            return pending ? "Changes pending" : "Up to date"
        }
    }

    private var syncStatusColor: Color {
        switch syncEngine.status {
        case .failed: return Theme.danger
        case .offline: return Theme.warning
        default: return store.hasPendingChanges ? Theme.warning : Theme.positive
        }
    }

    private var administratorConsoleRow: some View {
        NavigationLink {
            AdministratorHomeView()
        } label: {
            HStack {
                Text("Administrator console")
                    .font(Theme.font(15, .bold))
                    .foregroundStyle(.white)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Theme.muted)
            }
            .padding(.vertical, 15)
            .padding(.horizontal, 16)
            .background(Theme.ink, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func unitChanged(from oldValue: WeightUnit, to newValue: WeightUnit) {
        guard newValue != session.weightUnit else { return }
        Task {
            do {
                try await session.updateProfile(weightUnit: newValue)
            } catch {
                selectedUnit = oldValue
                infoAlert = ProfileInfoAlert(
                    title: "Couldn't update units",
                    message: ProfileSupport.message(for: error)
                )
            }
        }
    }
}

struct ProfileInfoAlert: Identifiable {
    let id = UUID()
    var title: String
    var message: String
}

enum ProfileSupport {
    static func message(for error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.message
        }
        if error is NetworkError {
            return "You're offline — try again when you have a connection."
        }
        return "Something went wrong. Please try again."
    }
}

private struct ProfileActionRow: View {
    let title: String
    var titleColor: Color = Theme.ink
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(Theme.font(15))
                .foregroundStyle(titleColor)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 15)
                .padding(.horizontal, 16)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
