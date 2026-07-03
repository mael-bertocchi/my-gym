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
    @State private var initialFields: [(name: String, text: String)] = []
    @State private var hasLoaded = false
    @State private var showAddField = false
    @State private var newFieldName = ""
    @State private var showClearConfirm = false
    @State private var showDiscardConfirm = false

    var body: some View {
        VStack(spacing: 0) {
            navRow
                .padding(.top, 18)
                .padding(.horizontal, 24)
                .padding(.bottom, 12)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    contextHeader
                        .padding(.bottom, 18)

                    settingsRows
                        .padding(.top, 6)

                    InlineLink(title: "Add field", systemImage: "plus") {
                        newFieldName = ""
                        showAddField = true
                    }
                    .padding(.top, 20)
                }
                .padding(.horizontal, 24)
                .padding(.top, 18)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .background(Color.white.ignoresSafeArea())
        .safeAreaInset(edge: .bottom) { footer }
        .presentationDragIndicator(.visible)
        .interactiveDismissDisabled(isDirty)
        .onAppear(perform: load)
        .confirmationDialog(
            "Discard changes?",
            isPresented: $showDiscardConfirm,
            titleVisibility: .visible
        ) {
            Button("Discard changes", role: .destructive) { dismiss() }
            Button("Keep editing", role: .cancel) {}
        }
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
            Text("Removes the remembered configuration for this machine.")
        }
    }

    private var navRow: some View {
        ModalHeader(
            title: "Machine settings",
            onDismiss: {
                if isDirty {
                    showDiscardConfirm = true
                } else {
                    dismiss()
                }
            },
            trailingTitle: "Save",
            trailingAction: save
        )
    }

    private var isDirty: Bool {
        !fields.elementsEqual(initialFields) { $0.name == $1.name && $0.text == $1.text }
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
        guard let exercise = store.exercise(id: entry.exerciseId) else { return "" }
        return store.brandLine(for: exercise).text
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
                                .background(Theme.fieldFill, in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
                                        .strokeBorder(Theme.fieldBorder, lineWidth: 1)
                                )
                                .accessibilityLabel(field.name)
                        }
                        .padding(.vertical, 16)
                        RowDivider()
                    }
                }
            }
        }
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

    private func load() {
        guard !hasLoaded else { return }
        hasLoaded = true
        let source = entry.settings
            ?? store.setting(exerciseId: entry.exerciseId)?.settings
            ?? [:]
        fields = source
            .sorted { $0.key < $1.key }
            .map { MachineSettingsFieldModel(name: $0.key, text: $0.value.displayString) }
        initialFields = fields.map { ($0.name, $0.text) }
    }

    private func addField() {
        let name = newFieldName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty,
              !fields.contains(where: { $0.name.caseInsensitiveCompare(name) == .orderedSame })
        else { return }
        fields.append(MachineSettingsFieldModel(name: name, text: ""))
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
        let dictionary = settingsDictionary()
        store.upsertSetting(exerciseId: entry.exerciseId, settings: dictionary)
        activeWorkout.updateEntrySettings(entryId: entry.id, settings: dictionary.isEmpty ? nil : dictionary)
        dismiss()
    }

    private func clear() {
        store.deleteSetting(exerciseId: entry.exerciseId)
        activeWorkout.updateEntrySettings(entryId: entry.id, settings: nil)
        dismiss()
    }
}
