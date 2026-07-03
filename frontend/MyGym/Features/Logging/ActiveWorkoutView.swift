import SwiftUI

struct ActiveWorkoutView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppSession.self) private var session
    @Environment(LocalStore.self) private var store
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    @State private var expandedEntryId: String?
    @State private var showPicker = false
    @State private var showFinishConfirm = false
    @State private var showDiscardConfirm = false
    @State private var showRepeatConfirm = false
    @State private var settingsEntry: LocalWorkoutExercise?
    @State private var supersetSource: LocalWorkoutExercise?

    var body: some View {
        Group {
            if let workout = activeWorkout.workout {
                content(workout)
            } else {
                Theme.screenBackground.ignoresSafeArea()
            }
        }
        .onAppear {
            guard let workout = activeWorkout.workout else {
                dismiss()
                return
            }
            if expandedEntryId == nil {
                expandedEntryId = defaultExpandedId(in: workout)
            }
            #if DEBUG
            switch UserDefaults.standard.string(forKey: "open") {
            case "picker": showPicker = true
            case "settings": settingsEntry = workout.exercises.first
            case "superset-picker":
                for supersetId in Set(workout.exercises.compactMap(\.supersetId)) {
                    activeWorkout.unlinkSuperset(supersetId: supersetId)
                }
                supersetSource = activeWorkout.workout?.exercises
                    .sorted { $0.position < $1.position }
                    .dropFirst()
                    .first
            default: break
            }
            #endif
        }
        .onChange(of: activeWorkout.isActive) { _, isActive in
            if !isActive { dismiss() }
        }
        .fullScreenCover(isPresented: $showPicker) {
            AddExercisePicker { exercise in
                if let entry = activeWorkout.addExercise(exercise) {
                    expandedEntryId = entry.id
                }
            }
        }
        .fullScreenCover(item: $settingsEntry) { entry in
            MachineSettingsSheet(entry: entry)
        }
        .sheet(item: $supersetSource) { source in
            SupersetPartnerPicker(source: source) { partner in
                supersetSource = nil
                withAnimation(.snappy(duration: 0.2)) {
                    activeWorkout.createSuperset(entryId: source.id, partnerId: partner.id)
                    if let workout = activeWorkout.workout,
                       let supersetId = workout.exercises.first(where: { $0.id == source.id })?.supersetId,
                       let next = Superset.nextIncompleteSet(in: Superset.members(of: supersetId, in: workout)) {
                        expandedEntryId = next.entryId
                    }
                }
            }
        }
        .alert("Finish workout?", isPresented: $showFinishConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Finish") {
                activeWorkout.finish()
                dismiss()
            }
        } message: {
            Text("Saves this session to your history.")
        }
        .alert("Discard workout?", isPresented: $showDiscardConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Discard", role: .destructive) {
                activeWorkout.discard()
                dismiss()
            }
        } message: {
            Text("This cannot be undone.")
        }
        .alert("Repeat last workout?", isPresented: $showRepeatConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Repeat") { performRepeatLast() }
        } message: {
            Text("Replaces the exercises already in this session.")
        }
    }

    private func content(_ workout: LocalWorkout) -> some View {
        VStack(spacing: 0) {
            TimelineView(.periodic(from: .now, by: 1)) { context in
                VStack(spacing: 0) {
                    header(workout, now: context.date)
                        .zIndex(1)
                    if let timer = activeWorkout.restTimer, !activeWorkout.isPaused {
                        RestTimerBar(
                            timer: timer,
                            eyebrow: restEyebrow,
                            onAdjust: { activeWorkout.adjustRest(by: $0) },
                            onSkip: { activeWorkout.skipRest() }
                        )
                        .transition(.move(edge: .top).combined(with: .opacity))
                    }
                }
                .onChange(of: context.date) { _, _ in
                    activeWorkout.expireRestIfNeeded()
                }
            }
            .animation(.snappy(duration: 0.25), value: activeWorkout.restTimer != nil)
            .animation(.snappy(duration: 0.25), value: activeWorkout.isPaused)

            ScrollView {
                VStack(spacing: 14) {
                    ForEach(Superset.groupings(in: workout)) { grouping in
                        switch grouping {
                        case .single(let entry):
                            if entry.id == expandedEntryId {
                                ActiveWorkoutExerciseCard(
                                    entry: entry,
                                    onOpenSettings: { settingsEntry = entry },
                                    onRemove: { removeEntry(entry) },
                                    onAddToSuperset: supersetPartnerExists(in: workout, excluding: entry)
                                        ? { supersetSource = entry }
                                        : nil,
                                    onFocusEntry: focus
                                )
                            } else {
                                ActiveWorkoutCondensedCard(entry: entry) {
                                    focus(entry.id)
                                }
                            }
                        case .pair(let supersetId, let members):
                            SupersetGroupSection(
                                supersetId: supersetId,
                                members: members,
                                expandedEntryId: expandedEntryId,
                                onExpand: { focus($0.id) },
                                onOpenSettings: { settingsEntry = $0 },
                                onRemove: { removeEntry($0) },
                                onUnlink: {
                                    withAnimation(.snappy(duration: 0.2)) {
                                        activeWorkout.unlinkSuperset(supersetId: supersetId)
                                    }
                                },
                                onFocusEntry: focus
                            )
                        }
                    }

                    addExerciseTile

                    if workout.exercises.isEmpty {
                        Text("Add your first exercise to start logging sets.")
                            .font(Theme.font(13))
                            .foregroundStyle(Theme.muted2)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 16)
                .padding(.bottom, 32)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .background(Theme.screenBackground.ignoresSafeArea())
    }

    private func header(_ workout: LocalWorkout, now: Date) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.down")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x8A9099))
                        .frame(width: 28, height: 28)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                VStack(alignment: .leading, spacing: 2) {
                    Text(workout.name ?? "Workout")
                        .font(Theme.font(20, .heavy))
                        .tracking(-0.3)
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                    if let gym = store.gym(id: workout.gymId) {
                        Text(gym.name.uppercased())
                            .font(Theme.mono(11))
                            .kerning(0.5)
                            .foregroundStyle(Theme.muted2)
                            .lineLimit(1)
                    }
                }

                Spacer(minLength: 8)

                Button {
                    if activeWorkout.isPaused {
                        activeWorkout.resume()
                    } else {
                        activeWorkout.pause()
                    }
                } label: {
                    HStack(spacing: 6) {
                        StatusDot(color: activeWorkout.isPaused ? Theme.warning : Theme.positive, size: 7)
                        Text(Formatting.elapsed(activeWorkout.elapsed(at: now)))
                            .font(Theme.mono(15, .bold))
                            .foregroundStyle(Theme.ink)
                        Image(systemName: activeWorkout.isPaused ? "play.fill" : "pause.fill")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(activeWorkout.isPaused ? Theme.accentBlue : Theme.muted2)
                    }
                    .padding(.vertical, 7)
                    .padding(.horizontal, 11)
                    .background(Theme.fieldFill, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(activeWorkout.isPaused ? "Resume workout" : "Pause workout")

                Button {
                    showFinishConfirm = true
                } label: {
                    Text("Finish")
                        .font(Theme.font(13, .bold))
                        .foregroundStyle(.white)
                        .padding(.vertical, 9)
                        .padding(.horizontal, 15)
                        .background(Theme.accentBlue, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
                }
                .buttonStyle(.plain)
            }

            HStack(spacing: 18) {
                Button("＋ Add exercise") { showPicker = true }
                    .font(Theme.font(13, .semibold))
                    .foregroundStyle(Theme.muted)
                Button("⤺ Repeat last") { confirmRepeatLast(workout) }
                    .font(Theme.font(13, .semibold))
                    .foregroundStyle(Theme.muted)
                Spacer()
                Button("Discard") { showDiscardConfirm = true }
                    .font(Theme.font(13, .semibold))
                    .foregroundStyle(Theme.danger)
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 8)
        .padding(.horizontal, 20)
        .padding(.bottom, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.ignoresSafeArea(edges: .top))
        .overlay(alignment: .bottom) {
            Rectangle().fill(Theme.divider).frame(height: 1)
        }
    }

    private var addExerciseTile: some View {
        Button {
            showPicker = true
        } label: {
            Text("+ Add exercise")
                .font(Theme.font(14, .bold))
                .foregroundStyle(Theme.accentBlue)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .strokeBorder(
                            Color(hex: 0xC4CBD3),
                            style: StrokeStyle(lineWidth: 1.5, dash: [6, 4])
                        )
                )
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func sortedEntries(_ workout: LocalWorkout) -> [LocalWorkoutExercise] {
        workout.exercises.sorted { $0.position < $1.position }
    }

    private var restEyebrow: String {
        guard let context = activeWorkout.restContext else { return "REST" }
        return "REST · ROUND \(context.round) DONE"
    }

    private func focus(_ entryId: String) {
        withAnimation(.snappy(duration: 0.2)) {
            expandedEntryId = entryId
        }
    }

    private func supersetPartnerExists(in workout: LocalWorkout, excluding entry: LocalWorkoutExercise) -> Bool {
        workout.exercises.contains { $0.id != entry.id && $0.supersetId == nil }
    }

    private func defaultExpandedId(in workout: LocalWorkout) -> String? {
        if let context = activeWorkout.restContext,
           let next = Superset.nextIncompleteSet(in: Superset.members(of: context.supersetId, in: workout)) {
            return next.entryId
        }
        for grouping in Superset.groupings(in: workout) {
            switch grouping {
            case .single(let entry):
                if entry.sets.contains(where: { !$0.isCompleted }) {
                    return entry.id
                }
            case .pair(_, let members):
                if let next = Superset.nextIncompleteSet(in: members) {
                    return next.entryId
                }
            }
        }
        return sortedEntries(workout).last?.id
    }

    private func removeEntry(_ entry: LocalWorkoutExercise) {
        activeWorkout.removeExercise(entryId: entry.id)
        if expandedEntryId == entry.id, let workout = activeWorkout.workout {
            expandedEntryId = defaultExpandedId(in: workout)
        }
    }

    private func confirmRepeatLast(_ workout: LocalWorkout) {
        if workout.exercises.isEmpty {
            performRepeatLast()
        } else {
            showRepeatConfirm = true
        }
    }

    private func performRepeatLast() {
        activeWorkout.repeatLast()
        if let workout = activeWorkout.workout {
            expandedEntryId = defaultExpandedId(in: workout)
        }
    }
}
