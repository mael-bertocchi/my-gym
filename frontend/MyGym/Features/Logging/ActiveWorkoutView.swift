import SwiftUI

struct ActiveWorkoutView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(ApplicationSession.self) private var session
    @Environment(LocalStore.self) private var store
    @Environment(ActiveWorkoutStore.self) private var activeWorkout
    @Environment(HealthKitService.self) private var healthKit

    @State private var focusedEntryId: String?
    @State private var showPicker = false
    @State private var showFinishConfirm = false
    @State private var showDiscardConfirm = false
    @State private var showRepeatConfirm = false
    @State private var showReorder = false
    @State private var settingsEntry: LocalWorkoutExercise?
    @State private var supersetSource: LocalWorkoutExercise?
    @State private var removeCandidate: LocalWorkoutExercise?
    @State private var scrollTarget: String?
    @State private var personalRecordToast: ActiveWorkoutStore.PersonalRecordCelebration?
    @State private var detailRoute: ExerciseDetailRoute?

    var body: some View {
        NavigationStack {
            workoutBody
                .toolbar(.hidden, for: .navigationBar)
                .navigationDestination(item: $detailRoute) { route in
                    ExerciseDetailView(exerciseId: route.exerciseId)
                }
        }
    }

    private var workoutBody: some View {
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
            if focusedEntryId == nil {
                focusedEntryId = defaultFocusedId(in: workout)
            }
            #if DEBUG
            switch UserDefaults.standard.string(forKey: "open") {
            case "picker": showPicker = true
            case "settings": settingsEntry = workout.exercises.first
            case "reorder": showReorder = true
            case "finish": showFinishConfirm = true
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
        .onChange(of: activeWorkout.personalRecordCelebration) { _, celebration in
            guard let celebration else { return }
            Haptics.success()
            withAnimation(.snappy(duration: 0.25)) {
                personalRecordToast = celebration
            }
            Task {
                try? await Task.sleep(for: .seconds(2.6))
                if personalRecordToast == celebration {
                    withAnimation(.easeOut(duration: 0.3)) {
                        personalRecordToast = nil
                    }
                }
            }
        }
        .sheet(isPresented: $showPicker) {
            AddExercisePicker { exercise, brandId in
                if let entry = activeWorkout.addExercise(exercise, brandId: brandId) {
                    focusedEntryId = entry.id
                    scrollTarget = entry.id
                }
            }
        }
        .sheet(item: $settingsEntry) { entry in
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
                        focusedEntryId = next.entryId
                    }
                }
            }
        }
        .sheet(isPresented: $showReorder) {
            ReorderExercisesSheet()
        }
        .sheet(isPresented: $showFinishConfirm) {
            FinishWorkoutSheet { difficulty, enjoyment in
                Haptics.success()
                activeWorkout.finish(difficultyRating: difficulty, enjoymentRating: enjoyment)
                dismiss()
            }
        }
        .confirmationDialog(
            "Remove \(removeCandidateName)?",
            isPresented: Binding(
                get: { removeCandidate != nil },
                set: { if !$0 { removeCandidate = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Remove exercise and sets", role: .destructive) {
                if let entry = removeCandidate {
                    removeEntry(entry)
                }
                removeCandidate = nil
            }
            Button("Cancel", role: .cancel) { removeCandidate = nil }
        } message: {
            Text("Logged sets for this exercise are deleted from the session.")
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
                    if activeWorkout.expireRestIfNeeded() {
                        Haptics.warning()
                    }
                }
            }
            .animation(.snappy(duration: 0.25), value: activeWorkout.restTimer != nil)
            .animation(.snappy(duration: 0.25), value: activeWorkout.isPaused)

            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 14) {
                        ForEach(Superset.groupings(in: workout)) { grouping in
                            Group {
                                switch grouping {
                                case .single(let entry):
                                    ActiveWorkoutExerciseCard(
                                        entry: entry,
                                        onOpenSettings: { settingsEntry = entry },
                                        onOpenDetail: { openDetail(entry) },
                                        onRemove: { confirmRemove(entry) },
                                        onAddToSuperset: supersetPartnerExists(in: workout, excluding: entry)
                                            ? { supersetSource = entry }
                                            : nil,
                                        onFocusEntry: focus
                                    )
                                case .pair(let supersetId, let members):
                                    SupersetUnifiedCard(
                                        supersetId: supersetId,
                                        members: members,
                                        activeEntryId: focusedEntryId,
                                        onSelectMember: focus,
                                        onOpenSettings: { settingsEntry = $0 },
                                        onOpenDetail: { openDetail($0) },
                                        onRemove: { confirmRemove($0) },
                                        onUnlink: {
                                            withAnimation(.snappy(duration: 0.2)) {
                                                activeWorkout.unlinkSuperset(supersetId: supersetId)
                                            }
                                        },
                                        onFocusEntry: focus
                                    )
                                }
                            }
                            .id(grouping.id)
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
                    .padding(.horizontal, Theme.screenPadding)
                    .padding(.top, 16)
                    .padding(.bottom, 32)
                }
                .scrollDismissesKeyboard(.interactively)
                .onChange(of: scrollTarget) { _, target in
                    guard let target else { return }
                    withAnimation(.snappy(duration: 0.3)) {
                        proxy.scrollTo(target, anchor: .top)
                    }
                    scrollTarget = nil
                }
                .overlay(alignment: .top) {
                    if let personalRecordToast {
                        PersonalRecordToast(celebration: personalRecordToast)
                            .padding(.top, 10)
                            .transition(.move(edge: .top).combined(with: .opacity))
                    }
                }
            }
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
                        .foregroundStyle(Theme.muted2)
                        .frame(width: 44, height: 44, alignment: .leading)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Minimize workout")

                Spacer(minLength: 8)

                if let bpm = healthKit.liveHeartRate(at: now) {
                    HeartRateBadge(bpm: bpm)
                }

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
                    .background(Theme.surface, in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous))
                    .fixedSize()
                    .expandedTapTarget(vertical: 6, horizontal: 2)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(activeWorkout.isPaused ? "Resume workout" : "Pause workout")

                Button {
                    showFinishConfirm = true
                } label: {
                    Text("Finish")
                        .font(Theme.font(13, .bold))
                        .foregroundStyle(Theme.onAccent)
                        .padding(.vertical, 9)
                        .padding(.horizontal, 15)
                        .background(Theme.accentBlue, in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous))
                        .fixedSize()
                        .expandedTapTarget(vertical: 6, horizontal: 2)
                }
                .buttonStyle(.plain)
            }

            HStack(spacing: 18) {
                headerAction("Repeat last", systemImage: "arrow.uturn.backward") { confirmRepeatLast(workout) }
                if Superset.groupings(in: workout).count > 1 {
                    Button {
                        showReorder = true
                    } label: {
                        Image(systemName: "arrow.up.arrow.down")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Theme.muted)
                            .expandedTapTarget(vertical: 12, horizontal: 6)
                    }
                    .accessibilityLabel("Reorder exercises")
                }
                Spacer()
                headerAction("Discard", color: Theme.danger) { showDiscardConfirm = true }
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 8)
        .padding(.horizontal, 20)
        .padding(.bottom, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.screenBackground.ignoresSafeArea(edges: .top))
        .overlay(alignment: .bottom) {
            Rectangle().fill(Theme.divider).frame(height: 1)
        }
    }

    private struct HeartRateBadge: View {
        let bpm: Int

        var body: some View {
            HStack(spacing: 5) {
                Image(systemName: "heart.fill")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Theme.danger)
                    .symbolEffect(.pulse, options: .repeating)
                Text("\(bpm)")
                    .font(Theme.mono(15, .bold))
                    .foregroundStyle(Theme.ink)
            }
            .padding(.vertical, 7)
            .padding(.horizontal, 11)
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous))
            .fixedSize()
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Heart rate \(bpm) beats per minute")
        }
    }

    private func headerAction(
        _ title: String,
        systemImage: String? = nil,
        color: Color = Theme.muted,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 5) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 11, weight: .semibold))
                }
                Text(title)
                    .font(Theme.font(13, .semibold))
            }
            .foregroundStyle(color)
            .expandedTapTarget(vertical: 12, horizontal: 6)
        }
    }

    private var addExerciseTile: some View {
        Button {
            showPicker = true
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "plus")
                    .font(.system(size: 12, weight: .bold))
                Text("Add exercise")
                    .font(Theme.font(14, .bold))
            }
            .foregroundStyle(Theme.accentBlue)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                    .strokeBorder(
                        Theme.controlOutline,
                        style: StrokeStyle(lineWidth: 1.5, dash: [6, 4])
                    )
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var removeCandidateName: String {
        guard let removeCandidate else { return "exercise" }
        return store.exercise(id: removeCandidate.exerciseId)?.name ?? "exercise"
    }

    private func confirmRemove(_ entry: LocalWorkoutExercise) {
        if entry.sets.contains(where: \.isCompleted) {
            removeCandidate = entry
        } else {
            removeEntry(entry)
        }
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
            focusedEntryId = entryId
        }
    }

    private func openDetail(_ entry: LocalWorkoutExercise) {
        detailRoute = ExerciseDetailRoute(exerciseId: entry.exerciseId)
    }

    private func supersetPartnerExists(in workout: LocalWorkout, excluding entry: LocalWorkoutExercise) -> Bool {
        workout.exercises.contains { $0.id != entry.id && $0.supersetId == nil }
    }

    private func defaultFocusedId(in workout: LocalWorkout) -> String? {
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
        if focusedEntryId == entry.id, let workout = activeWorkout.workout {
            focusedEntryId = defaultFocusedId(in: workout)
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
            focusedEntryId = defaultFocusedId(in: workout)
        }
    }
}

private struct ExerciseDetailRoute: Identifiable, Hashable {
    let exerciseId: String
    var id: String { exerciseId }
}

private struct PersonalRecordToast: View {
    let celebration: ActiveWorkoutStore.PersonalRecordCelebration

    @Environment(ApplicationSession.self) private var session

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "star.fill")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Theme.onAccent)
            Text(text)
                .font(Theme.font(13, .bold))
                .foregroundStyle(Theme.onAccent)
                .lineLimit(1)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 16)
        .background(Theme.accentBlue, in: Capsule())
        .shadow(color: .black.opacity(0.18), radius: 12, y: 4)
        .accessibilityElement(children: .combine)
    }

    private var text: String {
        var text = "New Personal Record · \(Formatting.weight(celebration.weightKg, unit: session.weightUnit))"
        if let reps = celebration.reps {
            text += " × \(reps)"
        }
        return text
    }
}

private struct ReorderExercisesSheet: View {
    @Environment(LocalStore.self) private var store
    @Environment(ActiveWorkoutStore.self) private var activeWorkout

    var body: some View {
        VStack(spacing: 0) {
            ModalHeader(title: "Reorder exercises")
                .padding(.top, 24)
                .padding(.horizontal, 24)
                .padding(.bottom, 8)

            List {
                ForEach(groupings) { grouping in
                    row(grouping)
                        .listRowBackground(Theme.surface)
                }
                .onMove(perform: move)
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .environment(\.editMode, .constant(.active))
        }
        .background(Theme.surface.ignoresSafeArea())
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private var groupings: [Superset.Grouping] {
        activeWorkout.workout.map { Superset.groupings(in: $0) } ?? []
    }

    @ViewBuilder
    private func row(_ grouping: Superset.Grouping) -> some View {
        switch grouping {
        case .single(let entry):
            rowContent(title: exerciseName(entry), subtitle: setsSummary(entry))
        case .pair(_, let members):
            rowContent(
                title: members.map(exerciseName).joined(separator: " + "),
                subtitle: "Superset"
            )
        }
    }

    private func rowContent(title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(Theme.font(15, .semibold))
                .foregroundStyle(Theme.ink)
                .lineLimit(1)
            Text(subtitle)
                .font(Theme.font(12))
                .foregroundStyle(Theme.muted2)
        }
        .padding(.vertical, 4)
    }

    private func exerciseName(_ entry: LocalWorkoutExercise) -> String {
        store.exercise(id: entry.exerciseId)?.name ?? "Exercise"
    }

    private func setsSummary(_ entry: LocalWorkoutExercise) -> String {
        let isUnilateral = store.exercise(id: entry.exerciseId)?.isUnilateral ?? false
        let completed = entry.sets.filter(\.isCompleted)
        let total = isUnilateral ? Set(entry.sets.map(\.setNumber)).count : entry.sets.count
        let done = isUnilateral ? Set(completed.map(\.setNumber)).count : completed.count
        return "\(done)/\(total) sets done"
    }

    private func move(from source: IndexSet, to destination: Int) {
        var ids = groupings.map(\.id)
        ids.move(fromOffsets: source, toOffset: destination)
        activeWorkout.reorderExercises(groupingIds: ids)
        Haptics.impact(.light)
    }
}
