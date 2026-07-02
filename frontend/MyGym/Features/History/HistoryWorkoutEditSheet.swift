import SwiftUI

struct HistoryWorkoutEditSheet: View {
    @Environment(LocalStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let workout: LocalWorkout
    let onDelete: () -> Void

    @State private var name: String
    @State private var gymId: String?
    @State private var isConfirmingDelete = false

    init(workout: LocalWorkout, onDelete: @escaping () -> Void) {
        self.workout = workout
        self.onDelete = onDelete
        _name = State(initialValue: workout.name ?? "")
        _gymId = State(initialValue: workout.gymId)
    }

    var body: some View {
        VStack(spacing: 0) {
            navRow
            VStack(alignment: .leading, spacing: 18) {
                LabeledField(label: "NAME", placeholder: "Workout", text: $name)
                gymField
            }
            .padding(.top, 20)
            Spacer(minLength: 20)
            Button {
                isConfirmingDelete = true
            } label: {
                Text("Delete workout")
                    .font(Theme.font(14, .semibold))
                    .foregroundStyle(Theme.danger)
                    .frame(minHeight: Theme.minHitTarget)
            }
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity)
            .padding(.bottom, 12)
        }
        .padding(.top, 12)
        .padding(.horizontal, 24)
        .background(Color.white.ignoresSafeArea())
        .presentationDetents([.medium])
        .confirmationDialog(
            "Delete this workout?",
            isPresented: $isConfirmingDelete,
            titleVisibility: .visible
        ) {
            Button("Delete workout", role: .destructive) { onDelete() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This removes the workout and its sets everywhere.")
        }
    }

    private var navRow: some View {
        ZStack {
            Text("Edit workout")
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
                Button {
                    save()
                } label: {
                    Text("Save")
                        .font(Theme.font(15, .bold))
                        .foregroundStyle(Theme.accentBlue)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(height: 44)
    }

    private var gymField: some View {
        VStack(alignment: .leading, spacing: 8) {
            EyebrowText("GYM")
            Menu {
                Picker("Gym", selection: $gymId) {
                    Text("No gym").tag(String?.none)
                    ForEach(store.gyms) { gym in
                        Text(gym.name).tag(String?.some(gym.id))
                    }
                }
            } label: {
                HStack {
                    Text(store.gym(id: gymId)?.name ?? "No gym")
                        .font(Theme.font(15, .semibold))
                        .foregroundStyle(Theme.ink)
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color(hex: 0xC4C9CF))
                }
                .padding(.horizontal, 16)
                .frame(height: 50)
                .background(
                    Theme.fieldFill,
                    in: RoundedRectangle(cornerRadius: 13, style: .continuous)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                        .strokeBorder(Theme.fieldBorder, lineWidth: 1)
                )
            }
        }
    }

    private func save() {
        var updated = workout
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        updated.name = trimmed.isEmpty ? nil : trimmed
        updated.gymId = gymId
        store.upsertWorkout(updated)
        dismiss()
    }
}
