import SwiftUI

struct ActiveWorkoutExerciseCard: View {
    let entry: LocalWorkoutExercise
    var superset: SupersetDecoration?
    var onOpenSettings: () -> Void
    var onRemove: () -> Void
    var onAddToSuperset: (() -> Void)?
    var onUnlinkSuperset: (() -> Void)?
    var onFocusEntry: (String) -> Void = { _ in }

    @Environment(AppSession.self) private var session
    @Environment(LocalStore.self) private var store
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: superset == nil ? .top : .center, spacing: 8) {
                if let superset {
                    SupersetBadge(letter: superset.letter, isActive: superset.isActive)
                }
                Text(exerciseName)
                    .font(Theme.font(15, .bold))
                    .foregroundStyle(Theme.ink)
                Spacer(minLength: 8)
                if let chip = superset?.chip {
                    SupersetChipView(chip: chip)
                } else {
                    Menu {
                        Button(action: onOpenSettings) {
                            Label("Machine settings", systemImage: "slider.horizontal.3")
                        }
                        if let onAddToSuperset {
                            Button("Add to superset", action: onAddToSuperset)
                        }
                        if let onUnlinkSuperset {
                            Button("Unlink superset", action: onUnlinkSuperset)
                        }
                        Button(role: .destructive, action: onRemove) {
                            Label("Remove exercise", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Color(hex: 0xC4C9CF))
                            .frame(width: 32, height: 22, alignment: .trailing)
                            .contentShape(Rectangle())
                    }
                }
            }
            .padding(.bottom, 4)

            ActiveWorkoutBrandLine(exerciseId: entry.exerciseId)
                .padding(.bottom, 14)

            HStack(spacing: 8) {
                tableHeaderCell("SET")
                    .frame(width: 28)
                tableHeaderCell(session.weightUnit.label)
                    .frame(maxWidth: .infinity)
                tableHeaderCell("REPS")
                    .frame(maxWidth: .infinity)
                Color.clear
                    .frame(width: 30, height: 1)
            }
            .padding(.bottom, 8)

            VStack(spacing: 8) {
                ForEach(entry.sets) { set in
                    ActiveWorkoutSetRow(
                        entryId: entry.id,
                        set: set,
                        unit: session.weightUnit,
                        onFocus: onFocusEntry
                    )
                }
            }

            InlineLink(title: "+ Add set") {
                activeWorkout.addSet(entryId: entry.id)
            }
            .padding(.top, 12)
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 16)
        .card(
            radius: 18,
            border: superset?.isHighlighted == true ? Theme.accentBlue : Theme.hairline,
            borderWidth: superset?.isHighlighted == true ? 1.5 : 1
        )
    }

    private var exerciseName: String {
        store.exercise(id: entry.exerciseId)?.name ?? "Exercise"
    }

    private func tableHeaderCell(_ text: String) -> some View {
        EyebrowText(text, color: Color(hex: 0xA2A8B0), size: 10)
            .lineLimit(1)
    }
}

struct ActiveWorkoutSetRow: View {
    let entryId: String
    let set: LocalSet
    let unit: WeightUnit
    var onFocus: (String) -> Void

    @Environment(AppSession.self) private var session
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    private enum SetField: Hashable {
        case weight, reps
    }

    @State private var weightText: String
    @State private var repsText: String
    @State private var touched: Set<SetField> = []
    @FocusState private var focusedField: SetField?

    init(entryId: String, set: LocalSet, unit: WeightUnit, onFocus: @escaping (String) -> Void = { _ in }) {
        self.entryId = entryId
        self.set = set
        self.unit = unit
        self.onFocus = onFocus
        _weightText = State(initialValue: set.weightKg.map { Formatting.weightNumber($0, unit: unit) } ?? "")
        _repsText = State(initialValue: set.reps.map(String.init) ?? "")
    }

    var body: some View {
        HStack(spacing: 8) {
            Text("\(set.setNumber)")
                .font(Theme.font(13, .bold))
                .foregroundStyle(set.isCompleted ? Color(hex: 0x8A9099) : Theme.ink)
                .frame(width: 28)

            if set.isCompleted {
                completedCell(set.weightKg.map { Formatting.weightNumber($0, unit: unit) } ?? "", isBold: true)
                completedCell(set.reps.map(String.init) ?? "", isBold: true)
            } else {
                editableCell($weightText, field: .weight, keyboard: .decimalPad, isBold: true)
                editableCell($repsText, field: .reps, keyboard: .numberPad, isBold: true)
            }

            Button {
                toggleCompleted()
            } label: {
                ZStack {
                    if set.isCompleted {
                        Circle()
                            .fill(Theme.positive)
                            .frame(width: 24, height: 24)
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                    } else {
                        Circle()
                            .strokeBorder(Color(hex: 0xD2D6DB), lineWidth: 2)
                            .frame(width: 24, height: 24)
                    }
                }
                .frame(width: 30, height: Theme.minHitTarget)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
        .contextMenu {
            Button(role: .destructive) {
                activeWorkout.removeSet(entryId: entryId, setId: set.id)
            } label: {
                Label("Remove set", systemImage: "minus.circle")
            }
        }
        .onChange(of: weightText) { _, newValue in
            touched.insert(.weight)
            var updated = set
            updated.weightKg = parseNumber(newValue).map { value in
                unit == .pounds ? value * Formatting.kilogramsPerPound : value
            }
            activeWorkout.updateSet(entryId: entryId, set: updated)
        }
        .onChange(of: repsText) { _, newValue in
            touched.insert(.reps)
            var updated = set
            updated.reps = Int(newValue.trimmingCharacters(in: .whitespaces))
            activeWorkout.updateSet(entryId: entryId, set: updated)
        }
    }

    private func editableCell(
        _ text: Binding<String>,
        field: SetField,
        keyboard: UIKeyboardType,
        isBold: Bool
    ) -> some View {
        let isFocused = focusedField == field
        let isGhost = !touched.contains(field) && !isFocused
        return TextField("", text: text)
            .keyboardType(keyboard)
            .multilineTextAlignment(.center)
            .font(Theme.font(14, isBold ? .bold : .regular))
            .foregroundStyle(isGhost ? Theme.tabInactive : Theme.ink)
            .focused($focusedField, equals: field)
            .frame(maxWidth: .infinity)
            .frame(height: 38)
            .background(Theme.fieldFill, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .strokeBorder(
                        isFocused ? Theme.accentBlue : Theme.fieldBorder,
                        lineWidth: isFocused ? 1.5 : 1
                    )
            )
    }

    private func completedCell(_ value: String, isBold: Bool) -> some View {
        Text(value)
            .font(Theme.font(14, isBold ? .bold : .regular))
            .foregroundStyle(Theme.positive)
            .frame(maxWidth: .infinity)
            .frame(height: 38)
            .background(Theme.positiveTint, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .strokeBorder(Theme.positiveBorder, lineWidth: 1)
            )
    }

    private func toggleCompleted() {
        focusedField = nil
        let focusEntryId = activeWorkout.setCompleted(
            entryId: entryId,
            setId: set.id,
            completed: !set.isCompleted,
            restSeconds: session.restTimerSeconds
        )
        if let focusEntryId, focusEntryId != entryId {
            onFocus(focusEntryId)
        }
    }

    private func parseNumber(_ text: String) -> Double? {
        let normalized = text
            .trimmingCharacters(in: .whitespaces)
            .replacingOccurrences(of: ",", with: ".")
        return Double(normalized)
    }
}

struct ActiveWorkoutCondensedCard: View {
    let entry: LocalWorkoutExercise
    var superset: SupersetDecoration?
    var onTap: () -> Void

    @Environment(AppSession.self) private var session
    @Environment(LocalStore.self) private var store

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .center, spacing: 8) {
                    if let superset {
                        SupersetBadge(letter: superset.letter, isActive: superset.isActive)
                    }
                    Text(exerciseName)
                        .font(Theme.font(15, .bold))
                        .foregroundStyle(Theme.ink)
                    if let chip = superset?.chip {
                        Spacer(minLength: 8)
                        SupersetChipView(chip: chip)
                    }
                }
                ActiveWorkoutBrandLine(exerciseId: entry.exerciseId)
                    .padding(.top, superset == nil ? 2 : 4)
                Text(summary)
                    .font(Theme.font(12))
                    .foregroundStyle(Theme.muted2)
                    .padding(.top, 10)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 14)
            .padding(.horizontal, 16)
            .card(radius: 18)
            .opacity(superset == nil ? 0.96 : 1)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var exerciseName: String {
        store.exercise(id: entry.exerciseId)?.name ?? "Exercise"
    }

    private var summary: String {
        let completed = entry.sets.filter(\.isCompleted)
        var text = "\(completed.count) \(completed.count == 1 ? "set" : "sets") logged"
        if let last = completed.last, let weight = last.weightKg, let reps = last.reps {
            text += " · last: \(Formatting.weight(weight, unit: session.weightUnit)) × \(reps)"
        }
        return text
    }
}

struct ActiveWorkoutBrandLine: View {
    let exerciseId: String

    @Environment(LocalStore.self) private var store

    var body: some View {
        if let exercise = store.exercise(id: exerciseId) {
            let line = store.brandLine(for: exercise)
            Text(line.text)
                .font(Theme.mono(11))
                .kerning(0.5)
                .foregroundStyle(line.isBranded ? Theme.accentBlue : Theme.muted2)
                .lineLimit(1)
        }
    }
}
