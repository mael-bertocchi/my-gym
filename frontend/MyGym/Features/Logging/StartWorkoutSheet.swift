import SwiftUI

struct StartWorkoutSheet: View {
    var onStarted: () -> Void = {}

    @Environment(\.dismiss) private var dismiss
    @Environment(AppSession.self) private var session
    @Environment(LocalStore.self) private var store
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    @State private var selectedGymId: String?
    @State private var showAddGym = false

    var body: some View {
        VStack(spacing: 0) {
            navRow
                .padding(.top, 24)
                .padding(.horizontal, 24)
                .padding(.bottom, 28)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Where are you training?")
                        .font(Theme.font(24, .heavy))
                        .tracking(-0.3)
                        .foregroundStyle(Theme.ink)
                        .padding(.bottom, 6)

                    Text("Recorded on this workout for stats.")
                        .font(Theme.font(14))
                        .foregroundStyle(Theme.muted2)
                        .padding(.bottom, 26)

                    if store.gyms.isEmpty {
                        Text("No gyms yet.")
                            .font(Theme.font(13))
                            .foregroundStyle(Theme.inkSecondary)
                            .lineSpacing(3)
                            .padding(.vertical, 12)
                            .padding(.horizontal, 14)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .tintedCard(radius: 14)
                            .padding(.bottom, 20)
                    } else {
                        VStack(spacing: 12) {
                            ForEach(orderedGyms) { gym in
                                gymCard(gym)
                            }
                        }
                        .padding(.bottom, 20)
                    }

                    addGymLink
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 16)
            }
        }
        .background(Color.white.ignoresSafeArea())
        .safeAreaInset(edge: .bottom) { footer }
        .onAppear(perform: preselect)
        .sheet(isPresented: $showAddGym) {
            StartWorkoutAddGymSheet { gym in
                selectedGymId = gym.id
            }
        }
    }

    private var navRow: some View {
        ZStack {
            Text("New workout")
                .font(Theme.font(16, .bold))
                .foregroundStyle(Theme.ink)
            HStack {
                Button("Cancel") { dismiss() }
                    .font(Theme.font(15))
                    .foregroundStyle(Color(hex: 0x8A9099))
                    .buttonStyle(.plain)
                Spacer()
            }
        }
    }

    private func gymCard(_ gym: Gym) -> some View {
        let isSelected = gym.id == selectedGymId
        let subtitle = subtitleInfo(for: gym)
        return Button {
            selectedGymId = gym.id
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(gym.name)
                        .font(Theme.font(16, isSelected ? .bold : .semibold))
                        .foregroundStyle(Theme.ink)
                    Text(subtitle.text)
                        .font(Theme.font(12))
                        .foregroundStyle(subtitle.color)
                }
                Spacer(minLength: 8)
                if isSelected {
                    ZStack {
                        Circle()
                            .fill(Theme.accentBlue)
                            .frame(width: 22, height: 22)
                        Circle()
                            .fill(.white)
                            .frame(width: 8, height: 8)
                    }
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                isSelected ? Theme.accentBlueTint : Color.white,
                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(
                        isSelected ? Theme.accentBlue : Theme.hairline,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
    }

    private var addGymLink: some View {
        Button {
            showAddGym = true
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "plus.circle")
                    .font(.system(size: 18, weight: .semibold))
                Text("Add a new gym")
                    .font(Theme.font(14, .semibold))
            }
            .foregroundStyle(Theme.accentBlue)
            .frame(minHeight: Theme.minHitTarget)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var footer: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Theme.divider)
                .frame(height: 1)
            PrimaryButton(title: "Start workout") {
                activeWorkout.start(gymId: selectedGymId)
                onStarted()
            }
            .padding(.horizontal, 24)
            .padding(.top, 16)
            .padding(.bottom, 12)
        }
        .background(Color.white)
    }

    private var orderedGyms: [Gym] {
        guard let home = session.defaultGymId else { return store.gyms }
        return store.gyms.sorted { a, b in
            if a.id == home { return true }
            if b.id == home { return false }
            return a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
        }
    }

    private func preselect() {
        guard selectedGymId == nil else { return }
        if let home = session.defaultGymId, store.gyms.contains(where: { $0.id == home }) {
            selectedGymId = home
        } else {
            selectedGymId = store.gyms.first?.id
        }
    }

    private func subtitleInfo(for gym: Gym) -> (text: String, color: Color) {
        if gym.id == session.defaultGymId {
            return ("Home gym", Color(hex: 0x5E8BE6))
        }
        if let lastUsed = store.workouts.first(where: { $0.gymId == gym.id }) {
            let formatter = RelativeDateTimeFormatter()
            formatter.unitsStyle = .full
            let relative = formatter.localizedString(for: lastUsed.startedAt, relativeTo: .now)
            return ("Last used \(relative)", Theme.muted2)
        }
        return ("Not used yet", Theme.muted2)
    }
}

private struct StartWorkoutAddGymSheet: View {
    var onCreated: (Gym) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalStore.self) private var store

    @State private var name = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Text("New gym")
                    .font(Theme.font(16, .bold))
                    .foregroundStyle(Theme.ink)
                HStack {
                    Button("Cancel") { dismiss() }
                        .font(Theme.font(15))
                        .foregroundStyle(Color(hex: 0x8A9099))
                        .buttonStyle(.plain)
                    Spacer()
                }
            }
            .padding(.top, 24)
            .padding(.bottom, 24)

            LabeledField(
                label: "GYM NAME",
                placeholder: "e.g. Iron Temple",
                text: $name
            )
            .padding(.bottom, 24)

            PrimaryButton(
                title: "Add gym",
                isLoading: isSaving,
                isDisabled: name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ) {
                Task { await create() }
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 24)
        .background(Color.white.ignoresSafeArea())
        .presentationDetents([.height(280)])
        .alert("Couldn't add gym", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private func create() async {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        isSaving = true
        defer { isSaving = false }
        do {
            let gym = try await API.createGym(.init(name: trimmed))
            store.insert(gym: gym)
            onCreated(gym)
            dismiss()
        } catch let error as APIError {
            errorMessage = error.message
        } catch is NetworkError {
            errorMessage = "You're offline — connect to add a gym."
        } catch {
            errorMessage = "Something went wrong. Try again."
        }
    }
}
