import Charts
import SwiftUI

struct ExerciseDetailView: View {
    var exerciseId: String

    @Environment(LocalStore.self) private var store
    @Environment(AppSession.self) private var session

    @State private var scope: Scope = .thisMachine
    @State private var range: StatsMath.Range = .threeMonths
    @State private var workoutSheet: StatsDrillRoute?
    @State private var favoriteError: String?

    private enum Scope {
        case thisMachine
        case compareBrands
    }

    private static let palette: [Color] = [
        Theme.accentBlue,
        Theme.resumeRing,
        Color(hex: 0xC9D7F2),
        Theme.chartMuted,
    ]

    var body: some View {
        Group {
            if let exercise = store.exercise(id: exerciseId) {
                content(for: exercise)
            } else {
                missingState
            }
        }
        .background(Color.white.ignoresSafeArea())
        .hidesAppTabBar()
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if store.exercise(id: exerciseId) != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    favoriteButton
                }
            }
        }
        .alert("Couldn't update favorite", isPresented: favoriteAlertBinding) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(favoriteError ?? "")
        }
        .sheet(item: $workoutSheet) { route in
            StatsDrillSheet(route: route)
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
                Text(exercise.name)
                    .font(Theme.font(24, .heavy))
                    .tracking(-0.3)
                    .foregroundStyle(Theme.ink)
                Text(subtitle(for: exercise))
                    .font(Theme.mono(11))
                    .foregroundStyle(Theme.accentBlue)
                    .padding(.top, 4)
                    .padding(.bottom, 16)

                StatsRangeChips(selection: $range)
                    .padding(.bottom, 12)

                HStack(spacing: 8) {
                    ExerciseDetailScopeChip(title: "This machine", isActive: scope == .thisMachine) {
                        scope = .thisMachine
                    }
                    ExerciseDetailScopeChip(title: "Compare brands", isActive: scope == .compareBrands) {
                        scope = .compareBrands
                    }
                }
                .padding(.bottom, 18)

                switch scope {
                case .thisMachine:
                    thisMachineSection(exercise: exercise, windowWorkouts: windowWorkouts)
                case .compareBrands:
                    compareSection(for: exercise, windowWorkouts: windowWorkouts)
                }
            }
            .padding(.top, 8)
            .padding(.horizontal, 22)
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
                .foregroundStyle(isFavorite ? Theme.accentBlue : Color(hex: 0x8A9099))
        }
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
            .background(Theme.screenBackground, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
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
                                        workoutSheet = .workout(workoutId: point.workoutId)
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
        .background(Theme.screenBackground, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
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
            EyebrowText("PR TIMELINE", size: 10)
            if events.isEmpty {
                Text("No PRs yet")
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.muted2)
                    .padding(.vertical, 9)
            } else {
                VStack(spacing: 0) {
                    ForEach(events) { event in
                        RowDivider()
                        Button {
                            workoutSheet = .workout(workoutId: event.workoutId)
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
                            .padding(.vertical, 9)
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
                            workoutSheet = .workout(workoutId: point.workoutId)
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
                            .padding(.vertical, 8)
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

    @ViewBuilder
    private func compareSection(for exercise: Exercise, windowWorkouts: [LocalWorkout]) -> some View {
        let members = groupMembers(for: exercise)
        if members.count < 2 {
            Text("No other machines in this movement group yet.")
                .font(Theme.font(13))
                .foregroundStyle(Theme.inkSecondary)
                .lineSpacing(3)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 13)
                .padding(.horizontal, 15)
                .tintedCard(radius: 14)
        } else {
            let seriesList = compareSeries(for: members, windowWorkouts: windowWorkouts)
            compareChartCard(seriesList: seriesList)
                .padding(.bottom, 18)
            compareRows(seriesList: seriesList)
        }
    }

    private func groupMembers(for exercise: Exercise) -> [Exercise] {
        guard let groupId = exercise.groupId else { return [exercise] }
        var members = store.exercises.filter { $0.groupId == groupId }
        if let index = members.firstIndex(where: { $0.id == exercise.id }) {
            let selected = members.remove(at: index)
            members.insert(selected, at: 0)
        }
        return members
    }

    private func compareSeries(
        for members: [Exercise],
        windowWorkouts: [LocalWorkout]
    ) -> [ExerciseDetailSeries] {
        var usedLabels: Set<String> = []
        return members.enumerated().map { index, member in
            let brand = store.brandLine(for: member)
            var label = brand.isBranded ? brand.text : member.name
            if usedLabels.contains(label) { label = member.name }
            if usedLabels.contains(label) { label = "\(label) \(index + 1)" }
            usedLabels.insert(label)

            let allPoints = StatsMath.sessions(for: member.id, workouts: store.workouts)
            let windowPoints = StatsMath.sessions(for: member.id, workouts: windowWorkouts)
            return ExerciseDetailSeries(
                exercise: member,
                label: label,
                color: Self.palette[min(index, Self.palette.count - 1)],
                isBranded: brand.isBranded,
                brandText: brand.text,
                chartPoints: windowPoints.compactMap { point in
                    point.bestOneRepMaxKg.map {
                        ExerciseDetailChartPoint(date: point.date, valueKg: $0, workoutId: point.workoutId)
                    }
                },
                heaviestKg: allPoints.compactMap(\.heaviestKg).max(),
                bestOneRepMaxKg: allPoints.compactMap(\.bestOneRepMaxKg).max()
            )
        }
    }

    private func compareChartCard(seriesList: [ExerciseDetailSeries]) -> some View {
        let chartSeries = seriesList.filter { $0.chartPoints.count >= 2 }
        return VStack(alignment: .leading, spacing: 14) {
            EyebrowText("EST. 1RM BY MACHINE", size: 10)
            if chartSeries.isEmpty {
                ExerciseDetailEmptyNote(height: 110)
            } else {
                Chart {
                    ForEach(chartSeries) { series in
                        ForEach(series.chartPoints) { point in
                            LineMark(
                                x: .value("Date", point.date),
                                y: .value("Est. 1RM", point.valueKg),
                                series: .value("Machine", series.label)
                            )
                            .foregroundStyle(by: .value("Machine", series.label))
                            .interpolationMethod(.catmullRom)
                            .lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
                        }
                    }
                }
                .chartForegroundStyleScale(
                    domain: chartSeries.map(\.label),
                    range: chartSeries.map(\.color)
                )
                .chartXAxis(.hidden)
                .chartYAxis(.hidden)
                .chartLegend(.hidden)
                .frame(height: 110)

                VStack(alignment: .leading, spacing: 5) {
                    ForEach(chartSeries) { series in
                        HStack(spacing: 6) {
                            Circle()
                                .fill(series.color)
                                .frame(width: 6, height: 6)
                            Text(series.label)
                                .font(Theme.mono(10))
                                .foregroundStyle(Theme.muted2)
                                .lineLimit(1)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(Theme.screenBackground, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func compareRows(seriesList: [ExerciseDetailSeries]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            EyebrowText("MACHINES", size: 10)
            VStack(spacing: 0) {
                ForEach(Array(seriesList.enumerated()), id: \.element.id) { index, series in
                    if index > 0 {
                        RowDivider()
                    }
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(series.exercise.name)
                                .font(Theme.font(15, .bold))
                                .foregroundStyle(Theme.ink)
                            Text(series.brandText)
                                .font(Theme.mono(11))
                                .foregroundStyle(series.isBranded ? Theme.accentBlue : Theme.muted2)
                        }
                        Spacer(minLength: 0)
                        Text(compareValues(for: series))
                            .font(Theme.mono(13))
                            .foregroundStyle(Theme.ink)
                    }
                    .padding(.vertical, 10)
                }
            }
        }
    }

    private func compareValues(for series: ExerciseDetailSeries) -> String {
        guard let heaviest = series.heaviestKg else { return "—" }
        let heaviestLabel = Formatting.weight(heaviest, unit: unit)
        guard let oneRM = series.bestOneRepMaxKg else { return heaviestLabel }
        return "\(heaviestLabel) / \(wholeWeight(oneRM))\(unit.suffix)"
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

private struct ExerciseDetailScopeChip: View {
    let title: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(Theme.font(12, isActive ? .bold : .semibold))
                .foregroundStyle(isActive ? .white : Theme.muted)
                .padding(.vertical, 8)
                .padding(.horizontal, 13)
                .background(
                    isActive ? Theme.ink : Theme.fieldFill,
                    in: RoundedRectangle(cornerRadius: 11, style: .continuous)
                )
        }
        .buttonStyle(.plain)
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
                .foregroundStyle(isHighlighted ? Color(hex: 0x5E8BE6) : Theme.muted2)
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(Theme.font(19, .heavy))
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
        .background(
            isHighlighted ? Theme.accentBlueTint : Theme.screenBackground,
            in: RoundedRectangle(cornerRadius: 14, style: .continuous)
        )
    }
}

private struct ExerciseDetailChartPoint: Identifiable {
    let id = UUID()
    let date: Date
    let valueKg: Double
    let workoutId: String
}

private struct ExerciseDetailSeries: Identifiable {
    let exercise: Exercise
    let label: String
    let color: Color
    let isBranded: Bool
    let brandText: String
    let chartPoints: [ExerciseDetailChartPoint]
    let heaviestKg: Double?
    let bestOneRepMaxKg: Double?

    var id: String { exercise.id }
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
