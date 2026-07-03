import SwiftUI

struct SupersetDecoration {
    var letter: String
    var isActive: Bool
    var chip: SupersetChip?
    var isHighlighted = false
}

enum SupersetChip {
    case after(letter: String, setNumber: Int)
    case go
    case upNext
    case completedCount(Int)
}

struct SupersetBadge: View {
    var letter: String
    var isActive: Bool
    var size: CGFloat = 20
    var radius: CGFloat = 6
    var fontSize: CGFloat = 11

    var body: some View {
        Text(letter)
            .font(Theme.font(fontSize, .heavy))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(
                isActive ? Theme.accentBlue : Theme.muted2,
                in: RoundedRectangle(cornerRadius: radius, style: .continuous)
            )
    }
}

struct SupersetChipView: View {
    let chip: SupersetChip

    var body: some View {
        switch chip {
        case .after(let letter, let setNumber):
            label("AFTER \(letter)·\(setNumber)", color: Theme.muted, background: Theme.fieldFill)
        case .go:
            label("GO · NO REST", color: Theme.accentBlue, background: Theme.accentBlueTint, border: Theme.accentBlueTintBorder)
        case .upNext:
            label("UP NEXT", color: Theme.muted, background: Theme.fieldFill)
        case .completedCount(let count):
            Text("\(count) ✓")
                .font(Theme.font(12, .bold))
                .foregroundStyle(Theme.positive)
        }
    }

    private func label(_ text: String, color: Color, background: Color, border: Color? = nil) -> some View {
        Text(text)
            .font(Theme.mono(10, .bold))
            .kerning(1)
            .foregroundStyle(color)
            .padding(.vertical, 3)
            .padding(.horizontal, 8)
            .background(background, in: RoundedRectangle(cornerRadius: 6, style: .continuous))
            .overlay {
                if let border {
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .strokeBorder(border, lineWidth: 1)
                }
            }
    }
}

struct SupersetGroupSection: View {
    let supersetId: String
    let members: [LocalWorkoutExercise]
    let expandedEntryId: String?
    var onExpand: (LocalWorkoutExercise) -> Void
    var onOpenSettings: (LocalWorkoutExercise) -> Void
    var onRemove: (LocalWorkoutExercise) -> Void
    var onUnlink: () -> Void
    var onFocusEntry: (String) -> Void

    @Environment(AppSession.self) private var session
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    var body: some View {
        VStack(spacing: 0) {
            header
                .padding(.horizontal, 2)
                .padding(.bottom, 8)
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(Theme.accentBlue)
                    .frame(width: 3)
                    .padding(.vertical, 6)
                VStack(spacing: 8) {
                    ForEach(members) { member in
                        memberCard(member)
                    }
                }
            }
        }
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            EyebrowText("SUPERSET", color: Theme.accentBlue, size: 10)
            if let round = restingRound {
                Text("ROUND \(round) ✓")
                    .font(Theme.mono(10))
                    .kerning(1)
                    .foregroundStyle(Theme.positive)
                    .padding(.vertical, 1)
                    .padding(.horizontal, 6)
                    .background(Theme.positiveTint, in: RoundedRectangle(cornerRadius: 5, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 5, style: .continuous)
                            .strokeBorder(Theme.positiveBorder, lineWidth: 1)
                    )
            }
            Spacer(minLength: 8)
            EyebrowText(trailingLabel, color: Theme.muted2, size: 10)
        }
    }

    @ViewBuilder
    private func memberCard(_ member: LocalWorkoutExercise) -> some View {
        if member.id == expandedEntryId {
            ActiveWorkoutExerciseCard(
                entry: member,
                superset: decoration(for: member, isExpanded: true),
                onOpenSettings: { onOpenSettings(member) },
                onRemove: { onRemove(member) },
                onUnlinkSuperset: onUnlink,
                onFocusEntry: onFocusEntry
            )
        } else {
            ActiveWorkoutCondensedCard(
                entry: member,
                superset: decoration(for: member, isExpanded: false),
                onTap: { onExpand(member) }
            )
            .opacity(0.55)
        }
    }

    private var isRestingForGroup: Bool {
        activeWorkout.restTimer != nil && activeWorkout.restContext?.supersetId == supersetId
    }

    private var restingRound: Int? {
        isRestingForGroup ? activeWorkout.restContext?.round : nil
    }

    private var nextIncomplete: (entryId: String, setIndex: Int)? {
        Superset.nextIncompleteSet(in: members)
    }

    private var trailingLabel: String {
        if isRestingForGroup, let next = nextIncomplete, let letter = letter(forEntryId: next.entryId) {
            return "NEXT · \(letter) SET \(next.setIndex + 1)"
        }
        return "ROUND REST · \(Formatting.countdown(session.restTimerSeconds))"
    }

    private func letter(forEntryId id: String) -> String? {
        guard let index = members.firstIndex(where: { $0.id == id }) else { return nil }
        return index == 0 ? "A" : "B"
    }

    private func decoration(for member: LocalWorkoutExercise, isExpanded: Bool) -> SupersetDecoration {
        let letter = letter(forEntryId: member.id) ?? "A"
        let next = nextIncomplete
        if isExpanded {
            var chip: SupersetChip?
            var isHighlighted = false
            if let next, next.entryId == member.id {
                if isRestingForGroup {
                    chip = .upNext
                } else if isGoState(next) {
                    chip = .go
                    isHighlighted = true
                }
            }
            return SupersetDecoration(letter: letter, isActive: true, chip: chip, isHighlighted: isHighlighted)
        }
        var chip: SupersetChip?
        if let next,
           !isRestingForGroup,
           let leader = members.first,
           next.entryId == leader.id,
           member.id != leader.id,
           next.setIndex < member.sets.count,
           !member.sets[next.setIndex].isCompleted {
            chip = .after(letter: "A", setNumber: next.setIndex + 1)
        } else {
            let completedCount = member.sets.filter(\.isCompleted).count
            if completedCount > 0 {
                chip = .completedCount(completedCount)
            }
        }
        return SupersetDecoration(letter: letter, isActive: false, chip: chip)
    }

    private func isGoState(_ next: (entryId: String, setIndex: Int)) -> Bool {
        guard members.count == 2,
              members[1].id == next.entryId,
              next.setIndex < members[0].sets.count
        else { return false }
        return members[0].sets[next.setIndex].isCompleted
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
        .presentationBackground(Color.white)
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
                        Circle().fill(.white).frame(width: 8, height: 8)
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
                isSelected ? Theme.accentBlueTint : Color.white,
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
