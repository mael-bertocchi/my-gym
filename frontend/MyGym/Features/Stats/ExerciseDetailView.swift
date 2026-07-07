import Charts
import SwiftUI

struct ExerciseDetailView: View {
    var exerciseId: String

    @Environment(LocalStore.self) private var store
    @Environment(ApplicationSession.self) private var session

    @State private var range: StatsMath.Range = .threeMonths
    @State private var workoutRoute: HistoryWorkoutRoute?
    @State private var favoriteError: String?

    var body: some View {
        Group {
            if let exercise = store.exercise(id: exerciseId) {
                content(for: exercise)
            } else {
                missingState
            }
        }
        .background(Theme.screenBackground.ignoresSafeArea())
        .hidesApplicationTabBar()
        .manageNavigationChrome("")
        .alert("Couldn't update favorite", isPresented: favoriteAlertBinding) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(favoriteError ?? "")
        }
        .navigationDestination(item: $workoutRoute) { route in
            HistoryWorkoutDetailView(workoutId: route.workoutId)
        }
    }

    private var unit: WeightUnit { session.weightUnit }

    private func content(for exercise: Exercise) -> some View {
        let windowWorkouts = StatsMath.workouts(
            store.workouts,
            inLastWeeks: range.weekCount(workouts: store.workouts)
        )
        return ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .center, spacing: 12) {
                    Text(exercise.name)
                        .font(Theme.font(26, .heavy))
                        .tracking(-0.4)
                        .foregroundStyle(Theme.ink)
                    Spacer(minLength: 0)
                    favoriteButton
                }
                Text(subtitle(for: exercise))
                    .font(Theme.mono(11))
                    .foregroundStyle(Theme.accentBlue)
                    .padding(.top, 4)
                    .padding(.bottom, 16)

                StatsRangeChips(selection: $range)
                    .padding(.bottom, 18)

                thisMachineSection(exercise: exercise, windowWorkouts: windowWorkouts)
            }
            .padding(.top, 8)
            .padding(.horizontal, Theme.screenPadding)
            .padding(.bottom, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func subtitle(for exercise: Exercise) -> String {
        "\(store.brandLine(for: exercise).text) · \(exercise.primaryMuscle.label.uppercased())"
    }

    private var favoriteButton: some View {
        let isFavorite = store.exercise(id: exerciseId)?.isFavorite ?? false
        return Button {
            toggleFavorite()
        } label: {
            Image(systemName: isFavorite ? "star.fill" : "star")
                .font(.system(size: 18))
                .foregroundStyle(isFavorite ? Theme.accentBlue : Theme.muted2)
        }
        .accessibilityLabel("Favorite")
        .accessibilityAddTraits(isFavorite ? [.isSelected] : [])
    }

    private var favoriteAlertBinding: Binding<Bool> {
        Binding(
            get: { favoriteError != nil },
            set: { if !$0 { favoriteError = nil } }
        )
    }

    private func toggleFavorite() {
        guard let current = store.exercise(id: exerciseId) else { return }
        var optimistic = current
        optimistic.isFavorite.toggle()
        store.insert(exercise: optimistic)
        Task {
            do {
                let updated = try await API.updateExercise(
                    id: exerciseId,
                    .init(isFavorite: optimistic.isFavorite)
                )
                store.insert(exercise: updated)
            } catch {
                store.insert(exercise: current)
                if let apiError = error as? APIError {
                    favoriteError = apiError.message
                } else if error is NetworkError {
                    favoriteError = "You're offline — try again when you have a connection."
                } else {
                    favoriteError = "Something went wrong. Please try again."
                }
            }
        }
    }

    @ViewBuilder
    private func thisMachineSection(exercise: Exercise, windowWorkouts: [LocalWorkout]) -> some View {
        let allSessions = StatsMath.sessions(for: exercise.id, workouts: store.workouts)
        let windowSessions = StatsMath.sessions(for: exercise.id, workouts: windowWorkouts)
        let heaviest = allSessions.compactMap(\.heaviestKg).max()
        let bestOneRM = allSessions.compactMap(\.bestOneRepMaxKg).max()
        let bestVolume = allSessions.map(\.volumeKg).filter { $0 > 0 }.max()

        HStack(spacing: 10) {
            ExerciseDetailStatTile(
                label: "HEAVIEST",
                value: heaviest.map { Formatting.weightNumber($0, unit: unit) } ?? "—",
                suffix: heaviest != nil ? unit.suffix : nil,
                isHighlighted: true
            )
            ExerciseDetailStatTile(
                label: "EST. 1RM",
                value: bestOneRM.map(wholeWeight) ?? "—",
                suffix: bestOneRM != nil ? unit.suffix : nil
            )
            ExerciseDetailStatTile(
                label: "BEST VOL",
                value: bestVolume.map { Formatting.compactVolume($0, unit: unit) } ?? "—",
                suffix: nil
            )
        }
        .padding(.bottom, 14)

        contributionNote(for: exercise, windowWorkouts: windowWorkouts)
            .padding(.bottom, 18)

        progressionCard(sessionPoints: windowSessions)
            .padding(.bottom, 18)

        prTimeline(exerciseId: exercise.id)
            .padding(.bottom, 18)

        recentSection(sessionPoints: windowSessions)
    }

    private func contributionNote(for exercise: Exercise, windowWorkouts: [LocalWorkout]) -> some View {
        let contribution = StatsMath.categoryContribution(
            exerciseId: exercise.id,
            workouts: windowWorkouts,
            exercises: store.exercises
        )
        let text = contribution.map {
            "Contributes \($0.percent)% of \($0.category.rawValue) volume · last \(range.rawValue)"
        } ?? "Not enough data in this window yet."
        return Text(text)
            .font(Theme.font(12))
            .foregroundStyle(Theme.inkSecondary)
            .lineSpacing(3)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .card(radius: 14)
    }

    private func wholeWeight(_ kilograms: Double) -> String {
        String(format: "%.0f", Formatting.displayWeight(kilograms, unit: unit).rounded())
    }

    private func progressionCard(sessionPoints: [StatsMath.SessionPoint]) -> some View {
        let points = sessionPoints.compactMap { point -> ExerciseDetailChartPoint? in
            guard let value = point.bestOneRepMaxKg else { return nil }
            return ExerciseDetailChartPoint(date: point.date, valueKg: value, workoutId: point.workoutId)
        }
        return VStack(alignment: .leading, spacing: 14) {
            EyebrowText("PROGRESSION · EST. 1RM", size: 10)
            if points.count >= 2 {
                Chart {
                    ForEach(points) { point in
                        LineMark(
                            x: .value("Date", point.date),
                            y: .value("Est. 1RM", point.valueKg)
                        )
                        .foregroundStyle(Theme.accentBlue)
                        .interpolationMethod(.catmullRom)
                        .lineStyle(StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
                        PointMark(
                            x: .value("Date", point.date),
                            y: .value("Est. 1RM", point.valueKg)
                        )
                        .foregroundStyle(Theme.accentBlue)
                        .symbolSize(point.workoutId == points.last?.workoutId ? 80 : 40)
                    }
                }
                .chartXAxis(.hidden)
                .chartYAxis(.hidden)
                .chartYScale(domain: yDomain(for: points.map(\.valueKg)))
                .frame(height: 90)
                .chartOverlay { proxy in
                    GeometryReader { geo in
                        Rectangle()
                            .fill(.clear)
                            .contentShape(Rectangle())
                            .gesture(
                                SpatialTapGesture().onEnded { tap in
                                    if let point = point(at: tap.location, points: points, proxy: proxy, geo: geo) {
                                        workoutRoute = HistoryWorkoutRoute(workoutId: point.workoutId)
                                    }
                                }
                            )
                    }
                }
            } else {
                ExerciseDetailEmptyNote(height: 90)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .card(radius: 18)
    }

    private func point(
        at location: CGPoint,
        points: [ExerciseDetailChartPoint],
        proxy: ChartProxy,
        geo: GeometryProxy
    ) -> ExerciseDetailChartPoint? {
        guard let plotFrame = proxy.plotFrame else { return nil }
        let frame = geo[plotFrame]
        guard let date = proxy.value(atX: location.x - frame.origin.x, as: Date.self) else {
            return nil
        }
        return points.min {
            abs($0.date.timeIntervalSince(date)) < abs($1.date.timeIntervalSince(date))
        }
    }

    private func prTimeline(exerciseId: String) -> some View {
        let events = Array(StatsMath.prEvents(for: exerciseId, workouts: store.workouts).prefix(4))
        return VStack(alignment: .leading, spacing: 10) {
            EyebrowText("RECORD TIMELINE", size: 10)
            if events.isEmpty {
                Text("No records yet")
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.muted2)
                    .padding(.vertical, 9)
            } else {
                VStack(spacing: 0) {
                    ForEach(events) { event in
                        RowDivider()
                        Button {
                            workoutRoute = HistoryWorkoutRoute(workoutId: event.workoutId)
                        } label: {
                            HStack {
                                Text("\(event.kind.rawValue) · \(Formatting.relativeDay(event.date))")
                                    .font(Theme.font(12))
                                    .foregroundStyle(Theme.muted)
                                Spacer()
                                Text(Formatting.weight(event.valueKg, unit: unit))
                                    .font(Theme.mono(12))
                                    .foregroundStyle(Theme.ink)
                            }
                            .padding(.vertical, 12)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func yDomain(for values: [Double]) -> ClosedRange<Double> {
        guard let lowest = values.min(), let highest = values.max() else { return 0...1 }
        guard highest > lowest else { return (lowest - 1)...(highest + 1) }
        let padding = (highest - lowest) * 0.15
        return (lowest - padding)...(highest + padding)
    }

    private func recentSection(sessionPoints: [StatsMath.SessionPoint]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            EyebrowText("RECENT", size: 10)
            if sessionPoints.isEmpty {
                Text("No sessions yet")
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.muted2)
                    .padding(.vertical, 8)
            } else {
                let recent = Array(sessionPoints.suffix(6).reversed())
                VStack(spacing: 0) {
                    ForEach(recent) { point in
                        RowDivider()
                        Button {
                            workoutRoute = HistoryWorkoutRoute(workoutId: point.workoutId)
                        } label: {
                            HStack {
                                Text(Formatting.shortDate(point.date))
                                    .font(Theme.font(13))
                                    .foregroundStyle(Theme.muted)
                                Spacer()
                                Text(bestSetLabel(for: point))
                                    .font(Theme.mono(13))
                                    .foregroundStyle(Theme.ink)
                            }
                            .padding(.vertical, 12)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func bestSetLabel(for point: StatsMath.SessionPoint) -> String {
        guard let weight = point.heaviestKg else { return "—" }
        let number = Formatting.weightNumber(weight, unit: unit)
        guard let reps = point.heaviestReps else { return number }
        return "\(number) × \(reps)"
    }

    private var missingState: some View {
        VStack(spacing: 8) {
            Text("Exercise unavailable")
                .font(Theme.font(15, .bold))
                .foregroundStyle(Theme.ink)
            Text("This exercise is no longer in the catalog.")
                .font(Theme.font(13))
                .foregroundStyle(Theme.muted2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct ExerciseDetailStatTile: View {
    let label: String
    let value: String
    var suffix: String?
    var isHighlighted = false

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
                .font(Theme.font(11, .bold))
                .foregroundStyle(isHighlighted ? Theme.accentBlueSoft : Theme.muted2)
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(Theme.font(20, .heavy))
                    .foregroundStyle(Theme.ink)
                if let suffix {
                    Text(suffix)
                        .font(Theme.font(12))
                        .foregroundStyle(Theme.muted2)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(13)
        .card(
            radius: Theme.controlRadius,
            fill: isHighlighted ? Theme.accentBlueTint : Theme.surface,
            border: isHighlighted ? Theme.accentBlueTintBorder : Theme.hairline
        )
        .accessibilityElement(children: .combine)
    }
}

private struct ExerciseDetailChartPoint: Identifiable {
    let id = UUID()
    let date: Date
    let valueKg: Double
    let workoutId: String
}

private struct ExerciseDetailEmptyNote: View {
    var height: CGFloat = 90

    var body: some View {
        Text("Not enough data yet")
            .font(Theme.font(13))
            .foregroundStyle(Theme.muted2)
            .frame(maxWidth: .infinity, minHeight: height)
    }
}
