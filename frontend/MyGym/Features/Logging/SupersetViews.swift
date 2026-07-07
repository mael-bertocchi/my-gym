import SwiftUI

struct SupersetUnifiedCard: View {
    let supersetId: String
    let members: [LocalWorkoutExercise]
    let activeEntryId: String?
    var onSelectMember: (String) -> Void
    var onOpenSettings: (LocalWorkoutExercise) -> Void
    var onOpenDetail: (LocalWorkoutExercise) -> Void
    var onRemove: (LocalWorkoutExercise) -> Void
    var onUnlink: () -> Void
    var onFocusEntry: (String) -> Void

    @Environment(ApplicationSession.self) private var session
    @Environment(LocalStore.self) private var store
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
                .padding(.bottom, 12)
            roundProgress
                .padding(.bottom, 14)
            memberToggle
                .padding(.bottom, 14)
            ActiveWorkoutBrandLine(exerciseId: activeMember.exerciseId)
                .padding(.bottom, 12)
            tableHeader
                .padding(.bottom, 8)
            activeTable
            footer
        }
        .padding(16)
        .card(radius: Theme.supersetCardRadius)
    }

    private var header: some View {
        HStack(spacing: 8) {
            Text(headerEyebrow)
                .font(Theme.mono(10, .bold))
                .kerning(1.5)
                .foregroundStyle(Theme.accentBlue)
                .lineLimit(1)
            Spacer(minLength: 8)
            Text(roundLabel)
                .font(Theme.mono(10))
                .kerning(1)
                .foregroundStyle(Theme.muted)
            Menu {
                Button("View exercise") { onOpenDetail(activeMember) }
                Button("Machine settings") { onOpenSettings(activeMember) }
                Button("Unlink superset", action: onUnlink)
                Button("Remove \(exerciseName(activeMember))", role: .destructive) { onRemove(activeMember) }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.tabInactive)
                    .frame(width: 28, height: 24, alignment: .trailing)
                    .contentShape(Rectangle())
            }
            .accessibilityLabel("Superset options")
        }
    }

    private var roundProgress: some View {
        HStack(spacing: 5) {
            ForEach(Array(0..<max(totalRounds, 1)), id: \.self) { index in
                RoundedRectangle(cornerRadius: 3, style: .continuous)
                    .fill(segmentColor(index))
                    .frame(height: 5)
                    .frame(maxWidth: .infinity)
            }
        }
    }

    private var memberToggle: some View {
        HStack(spacing: 4) {
            ForEach(Array(members.enumerated()), id: \.element.id) { index, member in
                memberCell(member, letter: index == 0 ? "A" : "B")
            }
        }
        .padding(4)
        .background(Theme.segmentTrack, in: RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous)
                .strokeBorder(Theme.hairline, lineWidth: 1)
        )
    }

    private func memberCell(_ member: LocalWorkoutExercise, letter: String) -> some View {
        let isActive = member.id == activeMember.id
        return Button {
            onSelectMember(member.id)
        } label: {
            HStack(spacing: 8) {
                Text(letter)
                    .font(Theme.font(12, .heavy))
                    .foregroundStyle(isActive ? Theme.onAccent : Theme.inkSecondary)
                    .frame(width: 22, height: 22)
                    .background(
                        isActive ? Theme.accentBlue : Theme.supersetTokenInactive,
                        in: RoundedRectangle(cornerRadius: 7, style: .continuous)
                    )
                VStack(alignment: .leading, spacing: 2) {
                    Text(exerciseName(member))
                        .font(Theme.font(13, isActive ? .bold : .semibold))
                        .foregroundStyle(isActive ? Theme.ink : Theme.muted)
                        .lineLimit(1)
                    statusLine(member, isActive: isActive)
                }
                Spacer(minLength: 0)
            }
            .padding(.vertical, 9)
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                isActive ? Theme.accentBlueTint : Color.clear,
                in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
            )
            .overlay {
                if isActive {
                    RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
                        .strokeBorder(Theme.accentBlueTintBorder, lineWidth: 1)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isActive ? [.isSelected] : [])
    }

    @ViewBuilder
    private func statusLine(_ member: LocalWorkoutExercise, isActive: Bool) -> some View {
        if isActive, nextIncomplete?.entryId == member.id, !isRestingForGroup {
            Text("GO · NO REST")
                .font(Theme.mono(10, .semibold))
                .kerning(0.5)
                .foregroundStyle(Theme.accentBlue)
        } else {
            let count = completedRounds(member)
            Text("\(count) \(count == 1 ? "set" : "sets") logged")
                .font(Theme.font(10))
                .foregroundStyle(Theme.muted)
        }
    }

    private var tableHeader: some View {
        HStack(spacing: 8) {
            headerCell("SET", color: Theme.muted2)
                .frame(width: 28)
            if isUnilateral(activeMember) {
                headerCell("LEFT · \(session.weightUnit.label)", color: Theme.muted)
                    .frame(maxWidth: .infinity)
                headerCell("RIGHT · \(session.weightUnit.label)", color: Theme.muted)
                    .frame(maxWidth: .infinity)
            } else {
                headerCell(session.weightUnit.label, color: Theme.muted2)
                    .frame(maxWidth: .infinity)
                headerCell("REPS", color: Theme.muted2)
                    .frame(maxWidth: .infinity)
                Color.clear.frame(width: 30, height: 1)
            }
        }
    }

    @ViewBuilder
    private var activeTable: some View {
        if isUnilateral(activeMember) {
            VStack(spacing: 8) {
                ForEach(Array(activeMember.setRounds.enumerated()), id: \.element.first?.id) { index, round in
                    twinRow(round, roundIndex: index)
                }
            }
        } else {
            VStack(spacing: 8) {
                ForEach(activeMember.sets) { set in
                    ActiveWorkoutSetRow(
                        entryId: activeMember.id,
                        set: set,
                        unit: session.weightUnit,
                        onFocus: onFocusEntry
                    )
                }
            }
        }
    }

    private func twinRow(_ round: [LocalSet], roundIndex: Int) -> some View {
        let left = round.first { $0.side == .left } ?? round.first
        let right = round.first { $0.side == .right } ?? round.dropFirst().first
        let isCurrent = nextIncomplete?.round == roundIndex
        return HStack(spacing: 8) {
            Text("\(roundIndex + 1)")
                .font(Theme.font(13, .bold))
                .foregroundStyle(isCurrent ? Theme.ink : Theme.muted2)
                .frame(width: 28)
            twinCell(left)
            twinCell(right)
        }
    }

    @ViewBuilder
    private func twinCell(_ set: LocalSet?) -> some View {
        if let set {
            TwinSideCell(
                entryId: activeMember.id,
                set: set,
                isNext: nextIncomplete?.setId == set.id,
                unit: session.weightUnit,
                onFocus: onFocusEntry
            )
        } else {
            Text("— × —")
                .font(Theme.font(13, .semibold))
                .foregroundStyle(Theme.muted2)
                .frame(maxWidth: .infinity)
                .frame(height: 40)
                .background(Theme.fieldFill, in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous))
        }
    }

    private var footer: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Theme.hairline)
                .frame(height: 1)
            HStack {
                InlineLink(title: "Add set", systemImage: "plus") {
                    activeWorkout.addSet(entryId: activeMember.id)
                }
                Spacer(minLength: 8)
                Text(footerHint)
                    .font(Theme.mono(10))
                    .kerning(1)
                    .foregroundStyle(Theme.muted2)
                    .lineLimit(1)
            }
            .padding(.top, 12)
        }
        .padding(.top, 14)
    }

    private func headerCell(_ text: String, color: Color) -> some View {
        EyebrowText(text, color: color, size: 10)
            .lineLimit(1)
    }

    private var activeMember: LocalWorkoutExercise {
        members.first { $0.id == activeEntryId }
            ?? members.first { $0.id == nextIncomplete?.entryId }
            ?? members[0]
    }

    private var nextIncomplete: (entryId: String, round: Int, setId: String)? {
        Superset.nextIncompleteSet(in: members)
    }

    private var totalRounds: Int {
        Superset.totalRounds(in: members)
    }

    private var currentRound: Int? {
        nextIncomplete?.round
    }

    private var isRestingForGroup: Bool {
        activeWorkout.restTimer != nil && activeWorkout.restContext?.supersetId == supersetId
    }

    private var headerEyebrow: String {
        members.contains(where: isUnilateral) ? "SUPERSET · SINGLE-ARM" : "SUPERSET"
    }

    private var roundLabel: String {
        let display = min((currentRound ?? (totalRounds - 1)) + 1, max(totalRounds, 1))
        return "ROUND \(display) OF \(max(totalRounds, 1))"
    }

    private var footerHint: String {
        if isUnilateral(activeMember) {
            return "BOTH ARMS → NEXT ROUND"
        }
        let lastLetter = members.count >= 2 ? "B" : "A"
        return "AFTER \(lastLetter) → REST \(Formatting.countdown(session.restTimerSeconds))"
    }

    private func segmentColor(_ index: Int) -> Color {
        if Superset.isRoundComplete(in: members, round: index) {
            return Theme.positive
        }
        if index == currentRound {
            return Theme.accentBlue
        }
        return Theme.hairline
    }

    private func completedRounds(_ member: LocalWorkoutExercise) -> Int {
        member.setRounds.filter { !$0.isEmpty && $0.allSatisfy(\.isCompleted) }.count
    }

    private func exerciseName(_ member: LocalWorkoutExercise) -> String {
        store.exercise(id: member.exerciseId)?.name ?? "Exercise"
    }

    private func isUnilateral(_ member: LocalWorkoutExercise) -> Bool {
        store.exercise(id: member.exerciseId)?.isUnilateral ?? false
    }
}

struct TwinSideCell: View {
    let entryId: String
    let set: LocalSet
    let isNext: Bool
    let unit: WeightUnit
    var onFocus: (String) -> Void

    @Environment(ApplicationSession.self) private var session
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    private enum SetField: Hashable {
        case weight, reps
    }

    @State private var weightText: String
    @State private var repsText: String
    @State private var touched: Set<SetField> = []
    @FocusState private var focusedField: SetField?

    init(entryId: String, set: LocalSet, isNext: Bool, unit: WeightUnit, onFocus: @escaping (String) -> Void) {
        self.entryId = entryId
        self.set = set
        self.isNext = isNext
        self.unit = unit
        self.onFocus = onFocus
        _weightText = State(initialValue: set.weightKg.map { Formatting.weightNumber($0, unit: unit) } ?? "")
        _repsText = State(initialValue: set.reps.map(String.init) ?? "")
    }

    var body: some View {
        HStack(spacing: 4) {
            if set.isCompleted {
                Text(set.weightKg.map { Formatting.weightNumber($0, unit: unit) } ?? "—")
                    .font(Theme.font(14, .bold))
                    .foregroundStyle(Theme.positive)
                Text("×\(set.reps.map(String.init) ?? "—")")
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.positive)
            } else {
                field($weightText, field: .weight, keyboard: .decimalPad)
                Text("×")
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.muted2)
                field($repsText, field: .reps, keyboard: .numberPad)
            }
            completeButton
        }
        .frame(maxWidth: .infinity)
        .frame(height: 40)
        .background(cellFill, in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous))
        .overlay(cellBorder)
        .contextMenu {
            Button("Remove set", role: .destructive, action: remove)
        }
        .onChange(of: weightText) { _, newValue in
            guard focusedField == .weight else { return }
            touched.insert(.weight)
            var updated = set
            updated.weightKg = parseNumber(newValue).map { value in
                unit == .pounds ? value * Formatting.kilogramsPerPound : value
            }
            activeWorkout.updateSet(entryId: entryId, set: updated)
        }
        .onChange(of: repsText) { _, newValue in
            guard focusedField == .reps else { return }
            touched.insert(.reps)
            var updated = set
            updated.reps = Int(newValue.trimmingCharacters(in: .whitespaces))
            activeWorkout.updateSet(entryId: entryId, set: updated)
        }
        .onChange(of: set.weightKg) { _, newValue in
            guard focusedField != .weight else { return }
            let formatted = newValue.map { Formatting.weightNumber($0, unit: unit) } ?? ""
            if formatted != weightText { weightText = formatted }
        }
        .onChange(of: set.reps) { _, newValue in
            guard focusedField != .reps else { return }
            let formatted = newValue.map(String.init) ?? ""
            if formatted != repsText { repsText = formatted }
        }
    }

    private func field(_ text: Binding<String>, field: SetField, keyboard: UIKeyboardType) -> some View {
        let isFocused = focusedField == field
        let isGhost = !touched.contains(field) && !isFocused
        return TextField("—", text: text)
            .keyboardType(keyboard)
            .multilineTextAlignment(.center)
            .font(Theme.font(14, .bold))
            .foregroundStyle(isGhost ? Theme.muted : Theme.ink)
            .focused($focusedField, equals: field)
            .frame(maxWidth: .infinity)
            .accessibilityLabel(field == .weight ? "Weight, \(sideLabel)" : "Reps, \(sideLabel)")
    }

    private var completeButton: some View {
        Button {
            toggleCompleted()
        } label: {
            ZStack {
                if set.isCompleted {
                    Circle()
                        .fill(Theme.positive)
                        .frame(width: 20, height: 20)
                    Image(systemName: "checkmark")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(Theme.onAccent)
                } else {
                    Circle()
                        .strokeBorder(Theme.controlOutline, lineWidth: 2)
                        .frame(width: 18, height: 18)
                }
            }
            .frame(width: 22, height: 40)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(set.isCompleted ? "Mark \(sideLabel) incomplete" : "Complete \(sideLabel)")
    }

    private var cellFill: Color {
        self.set.isCompleted ? Theme.positiveTint : Theme.fieldFill
    }

    @ViewBuilder
    private var cellBorder: some View {
        let shape = RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
        if set.isCompleted {
            shape.strokeBorder(Theme.positiveBorder, lineWidth: 1)
        } else if isNext {
            shape.strokeBorder(Theme.accentBlue, lineWidth: 1.5)
        } else if isEmpty {
            shape.strokeBorder(Theme.fieldBorder, style: StrokeStyle(lineWidth: 1, dash: [4, 3]))
        } else {
            shape.strokeBorder(Theme.fieldBorder, lineWidth: 1)
        }
    }

    private var isEmpty: Bool {
        self.set.weightKg == nil && self.set.reps == nil && weightText.isEmpty && repsText.isEmpty
    }

    private var sideLabel: String {
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

    private func toggleCompleted() {
        if !set.isCompleted, (set.reps ?? 0) <= 0 {
            Haptics.warning()
            focusedField = .reps
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

    private func parseNumber(_ text: String) -> Double? {
        let normalized = text
            .trimmingCharacters(in: .whitespaces)
            .replacingOccurrences(of: ",", with: ".")
        return Double(normalized)
    }
}

struct SupersetPartnerPicker: View {
    let source: LocalWorkoutExercise
    var onCreate: (LocalWorkoutExercise) -> Void

    @Environment(LocalStore.self) private var store
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    @State private var selectedId: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Superset with…")
                .font(Theme.font(16, .bold))
                .foregroundStyle(Theme.ink)
            Text("Pick one exercise from this workout to pair with \(exerciseName(source)).")
                .font(Theme.font(13))
                .foregroundStyle(Theme.muted)
                .padding(.top, 3)

            ScrollView {
                VStack(spacing: 8) {
                    ForEach(candidates) { candidate in
                        row(candidate)
                    }
                }
            }
            .padding(.top, 16)

            Text("Rest runs after each full round, not between exercises.")
                .font(Theme.font(12))
                .foregroundStyle(Theme.muted2)
                .padding(.top, 14)

            PrimaryButton(title: "Create superset", isDisabled: selectedId == nil) {
                if let partner = candidates.first(where: { $0.id == selectedId }) {
                    onCreate(partner)
                }
            }
            .padding(.top, 12)
        }
        .padding(.top, 24)
        .padding(.horizontal, 24)
        .padding(.bottom, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(20)
        .presentationBackground(Theme.surface)
    }

    private var candidates: [LocalWorkoutExercise] {
        guard let workout = activeWorkout.workout else { return [] }
        return workout.exercises
            .filter { $0.id != source.id && $0.supersetId == nil }
            .sorted { $0.position < $1.position }
    }

    private func row(_ candidate: LocalWorkoutExercise) -> some View {
        let isSelected = candidate.id == selectedId
        return Button {
            selectedId = candidate.id
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    if isSelected {
                        Circle().fill(Theme.accentBlue)
                        Circle().fill(Theme.onAccent).frame(width: 8, height: 8)
                    } else {
                        Circle().strokeBorder(Theme.controlOutline, lineWidth: 2)
                    }
                }
                .frame(width: 22, height: 22)
                VStack(alignment: .leading, spacing: 1) {
                    Text(exerciseName(candidate))
                        .font(Theme.font(15, isSelected ? .bold : .semibold))
                        .foregroundStyle(isSelected ? Theme.ink : Theme.inkSecondary)
                    Text(setsLoggedLine(candidate))
                        .font(Theme.font(12))
                        .foregroundStyle(Theme.muted2)
                }
                Spacer(minLength: 0)
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .background(
                isSelected ? Theme.accentBlueTint : Theme.surface,
                in: RoundedRectangle(cornerRadius: 14, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(
                        isSelected ? Theme.accentBlue : Theme.fieldBorder,
                        lineWidth: isSelected ? 1.5 : 1
                    )
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    private func exerciseName(_ entry: LocalWorkoutExercise) -> String {
        store.exercise(id: entry.exerciseId)?.name ?? "Exercise"
    }

    private func setsLoggedLine(_ entry: LocalWorkoutExercise) -> String {
        let count = entry.sets.filter(\.isCompleted).count
        return "\(count) \(count == 1 ? "set" : "sets") logged"
    }
}
