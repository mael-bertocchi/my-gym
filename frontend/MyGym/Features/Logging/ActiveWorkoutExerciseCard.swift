import SwiftUI

struct ActiveWorkoutExerciseCard: View {
    let entry: LocalWorkoutExercise
    var onOpenSettings: () -> Void
    var onOpenDetail: () -> Void
    var onRemove: () -> Void
    var onAddToSuperset: (() -> Void)?
    var onFocusEntry: (String) -> Void = { _ in }

    @Environment(ApplicationSession.self) private var session
    @Environment(LocalStore.self) private var store
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    @State private var brandEntry: LocalWorkoutExercise?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 8) {
                Text(exerciseName)
                    .font(Theme.font(15, .bold))
                    .foregroundStyle(Theme.ink)
                Spacer(minLength: 8)
                Menu {
                    Button("View exercise", systemImage: "info.circle", action: onOpenDetail)
                    Button("Machine settings", systemImage: "slider.horizontal.3", action: onOpenSettings)
                    if canSelectBrand {
                        Button("Select brand", systemImage: "tag") { brandEntry = entry }
                    }
                    if let onAddToSuperset {
                        Button("Add to superset", systemImage: "link", action: onAddToSuperset)
                    }
                    Button("Remove exercise", systemImage: "trash", action: onRemove)
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.tabInactive)
                        .frame(width: 44, height: 32, alignment: .trailing)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Exercise options")
            }
            .padding(.bottom, 4)

            ActiveWorkoutBrandLine(entry: entry)
                .padding(.bottom, 14)

            HStack(spacing: 8) {
                tableHeaderCell("SET")
                    .frame(width: 28)
                ForEach(loggingType.metrics, id: \.self) { metric in
                    tableHeaderCell(metric.header(unit: session.weightUnit))
                        .frame(maxWidth: .infinity)
                }
                Color.clear
                    .frame(width: 30, height: 1)
            }
            .padding(.bottom, 8)

            if isUnilateral {
                VStack(spacing: 14) {
                    ForEach(entry.setRounds, id: \.first?.id) { round in
                        VStack(spacing: 6) {
                            ForEach(round) { set in
                                ActiveWorkoutSetRow(
                                    entryId: entry.id,
                                    set: set,
                                    unit: session.weightUnit,
                                    loggingType: loggingType,
                                    onFocus: onFocusEntry
                                )
                            }
                        }
                    }
                }
            } else {
                VStack(spacing: 8) {
                    ForEach(entry.sets) { set in
                        ActiveWorkoutSetRow(
                            entryId: entry.id,
                            set: set,
                            unit: session.weightUnit,
                            loggingType: loggingType,
                            onFocus: onFocusEntry
                        )
                    }
                }
            }

            InlineLink(title: "Add set", systemImage: "plus") {
                activeWorkout.addSet(entryId: entry.id)
            }
            .padding(.top, 12)
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 16)
        .card()
        .sheet(item: $brandEntry) { entry in
            EntryBrandSheet(entry: entry)
        }
    }

    private var exerciseName: String {
        store.exercise(id: entry.exerciseId)?.name ?? "Exercise"
    }

    private var isUnilateral: Bool {
        store.exercise(id: entry.exerciseId)?.isUnilateral ?? false
    }

    private var loggingType: ExerciseLoggingType {
        store.exercise(id: entry.exerciseId)?.loggingType ?? .weightReps
    }

    private var canSelectBrand: Bool {
        store.exercise(id: entry.exerciseId)?.brandMode == .multiple
    }

    private func tableHeaderCell(_ text: String) -> some View {
        EyebrowText(text, size: 10)
            .lineLimit(1)
    }
}

struct ActiveWorkoutSetRow: View {
    let entryId: String
    let set: LocalSet
    let unit: WeightUnit
    let loggingType: ExerciseLoggingType
    var onFocus: (String) -> Void

    @Environment(ApplicationSession.self) private var session
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    @State private var texts: [SetMetric: String]
    @State private var touched: Set<SetMetric> = []
    @FocusState private var focusedField: SetMetric?

    init(entryId: String, set: LocalSet, unit: WeightUnit, loggingType: ExerciseLoggingType, onFocus: @escaping (String) -> Void = { _ in }) {
        self.entryId = entryId
        self.set = set
        self.unit = unit
        self.loggingType = loggingType
        self.onFocus = onFocus
        var initial: [SetMetric: String] = [:]
        for metric in loggingType.metrics {
            initial[metric] = metric.text(for: set, unit: unit)
        }
        _texts = State(initialValue: initial)
    }

    var body: some View {
        RevealActionsRow(actions: [RevealAction(title: "Remove", action: remove)]) {
            row
        }
        .onChange(of: set) { _, newValue in
            for metric in loggingType.metrics where focusedField != metric {
                let formatted = metric.text(for: newValue, unit: unit)
                if texts[metric] != formatted { texts[metric] = formatted }
            }
        }
    }

    private var row: some View {
        HStack(spacing: 8) {
            if activeWorkout.isPersonalRecord(entryId: entryId, set: set) {
                Image(systemName: "star.fill")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Theme.accentBlue)
                    .frame(width: 28)
                    .accessibilityLabel("Personal record, \(positionLabel)")
            } else {
                Text(set.side?.short ?? "\(set.setNumber)")
                    .font(Theme.font(13, .bold))
                    .foregroundStyle(set.isCompleted ? Theme.muted2 : Theme.ink)
                    .frame(width: 28)
            }

            ForEach(loggingType.metrics, id: \.self) { metric in
                if set.isCompleted {
                    completedCell(metric.text(for: set, unit: unit), isBold: true)
                } else {
                    editableCell(metric)
                }
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
                            .foregroundStyle(Theme.onAccent)
                    } else {
                        Circle()
                            .strokeBorder(Theme.controlOutline, lineWidth: 2)
                            .frame(width: 24, height: 24)
                    }
                }
                .frame(width: 30, height: Theme.minHitTarget)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(set.isCompleted ? "Mark \(positionLabel) incomplete" : "Complete \(positionLabel)")
        }
        .contextMenu {
            Button("Remove set", systemImage: "trash", action: remove)
        }
    }

    private var positionLabel: String {
        if let side = set.side {
            return "set \(set.setNumber) \(side.label.lowercased())"
        }
        return "set \(set.setNumber)"
    }

    private func remove() {
        withAnimation(.snappy(duration: 0.22)) {
            activeWorkout.removeSet(entryId: entryId, setId: set.id)
        }
    }

    private func binding(for metric: SetMetric) -> Binding<String> {
        Binding(
            get: { texts[metric] ?? "" },
            set: { newValue in
                texts[metric] = newValue
                guard focusedField == metric else { return }
                touched.insert(metric)
                var updated = set
                metric.apply(newValue, to: &updated, unit: unit)
                activeWorkout.updateSet(entryId: entryId, set: updated)
            }
        )
    }

    private func editableCell(_ metric: SetMetric) -> some View {
        let isFocused = focusedField == metric
        let isGhost = !touched.contains(metric) && !isFocused
        return TextField(metric.placeholder, text: binding(for: metric))
            .keyboardType(metric.keyboard)
            .multilineTextAlignment(.center)
            .font(Theme.font(14, .bold))
            .foregroundStyle(isGhost ? Theme.muted : Theme.ink)
            .focused($focusedField, equals: metric)
            .frame(maxWidth: .infinity)
            .frame(height: 38)
            .background(Theme.fieldFill, in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
                    .strokeBorder(
                        isFocused ? Theme.accentBlue : Theme.fieldBorder,
                        lineWidth: isFocused ? 1.5 : 1
                    )
            )
            .accessibilityLabel("\(metric.accessibilityName), \(positionLabel)")
    }

    private func completedCell(_ value: String, isBold: Bool) -> some View {
        Text(value)
            .font(Theme.font(14, isBold ? .bold : .regular))
            .foregroundStyle(Theme.positive)
            .frame(maxWidth: .infinity)
            .frame(height: 38)
            .background(Theme.positiveTint, in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
                    .strokeBorder(Theme.positiveBorder, lineWidth: 1)
            )
    }

    private func toggleCompleted() {
        let completionMetric = loggingType.completionMetric
        if !set.isCompleted, !set.isFilled(completionMetric) {
            Haptics.warning()
            focusedField = completionMetric
            return
        }
        focusedField = nil
        if !set.isCompleted {
            Haptics.impact(.medium)
        }
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
}

extension SetMetric {
    func header(unit: WeightUnit) -> String {
        switch self {
        case .weight: return unit.label
        case .reps: return "REPS"
        case .distance: return Formatting.distanceUnitLabel(unit)
        case .duration: return "TIME"
        case .stairs: return "STAIRS"
        }
    }

    var accessibilityName: String {
        switch self {
        case .weight: return "Weight"
        case .reps: return "Reps"
        case .distance: return "Distance"
        case .duration: return "Time"
        case .stairs: return "Stairs"
        }
    }

    var placeholder: String {
        self == .duration ? "0:00" : ""
    }

    var keyboard: UIKeyboardType {
        switch self {
        case .weight, .distance: return .decimalPad
        case .reps, .stairs: return .numberPad
        case .duration: return .numbersAndPunctuation
        }
    }

    func text(for set: LocalSet, unit: WeightUnit) -> String {
        switch self {
        case .weight: return set.weightKg.map { Formatting.weightNumber($0, unit: unit) } ?? ""
        case .reps, .stairs: return set.reps.map(String.init) ?? ""
        case .distance: return set.distanceM.map { Formatting.distanceNumber($0, unit: unit) } ?? ""
        case .duration: return set.durationSeconds.map { Formatting.elapsed(TimeInterval($0)) } ?? ""
        }
    }

    func apply(_ text: String, to set: inout LocalSet, unit: WeightUnit) {
        switch self {
        case .weight:
            set.weightKg = SetMetric.parseDecimal(text).map { unit == .pounds ? $0 * Formatting.kilogramsPerPound : $0 }
        case .reps, .stairs:
            set.reps = Int(text.trimmingCharacters(in: .whitespaces))
        case .distance:
            set.distanceM = Formatting.parseDistanceMeters(text, unit: unit)
        case .duration:
            set.durationSeconds = Formatting.parseDurationSeconds(text)
        }
    }

    private static func parseDecimal(_ text: String) -> Double? {
        let normalized = text
            .trimmingCharacters(in: .whitespaces)
            .replacingOccurrences(of: ",", with: ".")
        return Double(normalized)
    }
}

struct ActiveWorkoutBrandLine: View {
    let entry: LocalWorkoutExercise

    @Environment(LocalStore.self) private var store

    var body: some View {
        if let exercise = store.exercise(id: entry.exerciseId) {
            let line = store.brandLine(brandId: entry.brandId, exercise: exercise)
            Text(line.text)
                .font(Theme.mono(11))
                .kerning(0.5)
                .foregroundStyle(line.isBranded ? Theme.accentBlue : Theme.muted2)
                .lineLimit(1)
        }
    }
}
