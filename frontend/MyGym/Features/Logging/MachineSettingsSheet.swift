import SwiftUI

struct MachineSettingsFieldModel: Identifiable {
    let id = UUID()
    var name: String
    var text: String
}

struct MachineSettingsSheet: View {
    let entry: LocalWorkoutExercise

    @Environment(\.dismiss) private var dismiss
    @Environment(LocalStore.self) private var store
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    @State private var fields: [MachineSettingsFieldModel] = []
    @State private var hasLoaded = false
    @State private var showAddField = false
    @State private var newFieldName = ""
    @State private var showCopySheet = false
    @State private var showClearConfirm = false

    private var gymId: String? { activeWorkout.workout?.gymId }

    var body: some View {
        VStack(spacing: 0) {
            navRow
                .padding(.top, 6)
                .padding(.horizontal, 24)
                .padding(.bottom, 18)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    contextHeader
                        .padding(.bottom, 18)

                    Text("Remembered for this machine at this gym — pre-filled automatically next session.")
                        .font(Theme.font(12))
                        .foregroundStyle(Theme.inkSecondary)
                        .lineSpacing(3)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .tintedCard(radius: 14)

                    if gymId == nil {
                        Text("This workout has no gym, so settings can't be remembered.")
                            .font(Theme.font(12))
                            .foregroundStyle(Theme.muted2)
                            .padding(.top, 8)
                    }

                    settingsRows
                        .padding(.top, 6)

                    InlineLink(title: "+ Add field") {
                        newFieldName = ""
                        showAddField = true
                    }
                    .padding(.top, 20)

                    copyRow
                        .padding(.top, 28)
                }
                .padding(.horizontal, 24)
                .padding(.top, 18)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .background(Color.white.ignoresSafeArea())
        .safeAreaInset(edge: .bottom) { footer }
        .onAppear(perform: load)
        .alert("Add field", isPresented: $showAddField) {
            TextField("Field name", text: $newFieldName)
            Button("Cancel", role: .cancel) {}
            Button("Add") { addField() }
        } message: {
            Text("e.g. Seat height, Back pad, Weight pin.")
        }
        .alert("Clear remembered settings?", isPresented: $showClearConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Clear", role: .destructive) { clear() }
        } message: {
            Text("Removes the remembered configuration for this machine at this gym.")
        }
        .sheet(isPresented: $showCopySheet) {
            MachineSettingsCopySheet(options: copyOptions) { setting in
                adopt(setting)
            }
        }
    }

    private var navRow: some View {
        ZStack {
            Text("Machine settings")
                .font(Theme.font(16, .bold))
                .foregroundStyle(Theme.ink)
            HStack {
                Button("Close") { dismiss() }
                    .font(Theme.font(15))
                    .foregroundStyle(Color(hex: 0x8A9099))
                    .buttonStyle(.plain)
                Spacer()
                Button("Save") { save() }
                    .font(Theme.font(15, .bold))
                    .foregroundStyle(Theme.accentBlue)
                    .buttonStyle(.plain)
                    .disabled(gymId == nil)
                    .opacity(gymId == nil ? 0.4 : 1)
            }
        }
    }

    private var contextHeader: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(store.exercise(id: entry.exerciseId)?.name ?? "Exercise")
                .font(Theme.font(20, .heavy))
                .tracking(-0.3)
                .foregroundStyle(Theme.ink)
            if !contextLine.isEmpty {
                Text(contextLine)
                    .font(Theme.mono(11))
                    .kerning(0.5)
                    .foregroundStyle(Theme.accentBlue)
                    .lineLimit(1)
            }
        }
    }

    private var contextLine: String {
        var parts: [String] = []
        if let exercise = store.exercise(id: entry.exerciseId) {
            parts.append(store.brandLine(for: exercise).text)
        }
        if let gym = store.gym(id: gymId) {
            parts.append(gym.name.uppercased())
        }
        return parts.joined(separator: " · ")
    }

    private var settingsRows: some View {
        VStack(spacing: 0) {
            if fields.isEmpty {
                Text("No settings yet.")
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.muted2)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 16)
            } else {
                ForEach($fields) { $field in
                    VStack(spacing: 0) {
                        HStack {
                            Text(field.name)
                                .font(Theme.font(15, .semibold))
                                .foregroundStyle(Theme.ink)
                            Spacer(minLength: 12)
                            TextField("", text: $field.text)
                                .multilineTextAlignment(.center)
                                .font(Theme.font(15, .bold))
                                .foregroundStyle(Theme.ink)
                                .frame(width: 74, height: 40)
                                .background(Theme.fieldFill, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 11, style: .continuous)
                                        .strokeBorder(Theme.fieldBorder, lineWidth: 1)
                                )
                        }
                        .padding(.vertical, 16)
                        RowDivider()
                    }
                }
            }
        }
    }

    private var copyRow: some View {
        Button {
            showCopySheet = true
        } label: {
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Theme.divider)
                    .frame(width: 30, height: 30)
                    .overlay(
                        Image(systemName: "square.on.square")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Theme.muted)
                    )
                Text("Copy from another gym's machine")
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.muted)
                Spacer(minLength: 8)
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color(hex: 0xC4C9CF))
            }
            .padding(14)
            .card(radius: 14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var footer: some View {
        Button {
            showClearConfirm = true
        } label: {
            Text("Clear remembered settings")
                .font(Theme.font(14, .semibold))
                .foregroundStyle(Theme.danger)
                .frame(minHeight: Theme.minHitTarget)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
        .padding(.top, 8)
        .background(Color.white)
    }

    private var copyOptions: [MachineSettingsCopySheet.Option] {
        store.settings(exerciseId: entry.exerciseId)
            .filter { $0.gymId != gymId }
            .map { setting in
                .init(setting: setting, gymName: store.gym(id: setting.gymId)?.name ?? "Unknown gym")
            }
    }

    private func load() {
        guard !hasLoaded else { return }
        hasLoaded = true
        let source = entry.settings
            ?? store.setting(exerciseId: entry.exerciseId, gymId: gymId)?.settings
            ?? [:]
        fields = source
            .sorted { $0.key < $1.key }
            .map { MachineSettingsFieldModel(name: $0.key, text: $0.value.displayString) }
    }

    private func addField() {
        let name = newFieldName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty,
              !fields.contains(where: { $0.name.caseInsensitiveCompare(name) == .orderedSame })
        else { return }
        fields.append(MachineSettingsFieldModel(name: name, text: ""))
    }

    private func adopt(_ setting: LocalExerciseSetting) {
        fields = setting.settings
            .sorted { $0.key < $1.key }
            .map { MachineSettingsFieldModel(name: $0.key, text: $0.value.displayString) }
    }

    private func settingsDictionary() -> [String: JSONValue] {
        var result: [String: JSONValue] = [:]
        for field in fields {
            let name = field.name.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !name.isEmpty else { continue }
            let text = field.text.trimmingCharacters(in: .whitespacesAndNewlines)
            if !text.isEmpty, let number = Double(text.replacingOccurrences(of: ",", with: ".")) {
                result[name] = .number(number)
            } else {
                result[name] = .string(text)
            }
        }
        return result
    }

    private func save() {
        guard let gymId else { return }
        let dictionary = settingsDictionary()
        store.upsertSetting(exerciseId: entry.exerciseId, gymId: gymId, settings: dictionary)
        activeWorkout.updateEntrySettings(entryId: entry.id, settings: dictionary.isEmpty ? nil : dictionary)
        dismiss()
    }

    private func clear() {
        if let gymId {
            store.deleteSetting(exerciseId: entry.exerciseId, gymId: gymId)
        }
        activeWorkout.updateEntrySettings(entryId: entry.id, settings: nil)
        dismiss()
    }
}

struct MachineSettingsCopySheet: View {
    struct Option: Identifiable {
        var setting: LocalExerciseSetting
        var gymName: String
        var id: String { setting.id }
    }

    let options: [Option]
    var onPick: (LocalExerciseSetting) -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Text("Copy settings")
                    .font(Theme.font(16, .bold))
                    .foregroundStyle(Theme.ink)
                HStack {
                    Button("Close") { dismiss() }
                        .font(Theme.font(15))
                        .foregroundStyle(Color(hex: 0x8A9099))
                        .buttonStyle(.plain)
                    Spacer()
                }
            }
            .padding(.top, 16)
            .padding(.horizontal, 24)
            .padding(.bottom, 18)

            if options.isEmpty {
                VStack(spacing: 6) {
                    Text("No other machines remembered")
                        .font(Theme.font(15, .semibold))
                        .foregroundStyle(Theme.ink)
                    Text("Settings you save at other gyms will show up here.")
                        .font(Theme.font(13))
                        .foregroundStyle(Theme.muted2)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 24)
                .padding(.top, 48)
                Spacer(minLength: 0)
            } else {
                ScrollView {
                    VStack(spacing: 10) {
                        ForEach(options) { option in
                            Button {
                                onPick(option.setting)
                                dismiss()
                            } label: {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(option.gymName)
                                        .font(Theme.font(15, .semibold))
                                        .foregroundStyle(Theme.ink)
                                    Text(preview(option.setting))
                                        .font(Theme.mono(11))
                                        .foregroundStyle(Theme.muted2)
                                        .lineLimit(2)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(14)
                                .card(radius: 14)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
                }
            }
        }
        .background(Color.white.ignoresSafeArea())
        .presentationDetents([.medium])
    }

    private func preview(_ setting: LocalExerciseSetting) -> String {
        setting.settings
            .sorted { $0.key < $1.key }
            .map { "\($0.key) \($0.value.displayString)" }
            .joined(separator: " · ")
    }
}
