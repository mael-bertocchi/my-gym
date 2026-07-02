import Charts
import SwiftUI

struct StatsStatisticsBody: View {
    @Binding var range: StatsMath.Range
    var onOpenWeek: (StatsMath.WeekVolume) -> Void

    @Environment(LocalStore.self) private var store
    @Environment(AppSession.self) private var session

    var body: some View {
        let weekCount = range.weekCount(workouts: store.workouts)
        let windowed = StatsMath.workouts(store.workouts, inLastWeeks: weekCount)
        VStack(alignment: .leading, spacing: 14) {
            StatsRangeChips(selection: $range)
                .padding(.bottom, 2)

            StatsVolumeCard(
                rangeLabel: range.rawValue,
                weeks: StatsMath.weeklyVolumes(workouts: store.workouts, weekCount: weekCount),
                unit: session.weightUnit,
                onTapWeek: onOpenWeek
            )

            splitRow(windowed: windowed)

            StatsPushPullCard(
                split: StatsMath.pushPullSplit(workouts: windowed, exercises: store.exercises)
            )

            StatsMonthCompareCard(
                comparison: StatsMath.monthComparison(workouts: store.workouts),
                unit: session.weightUnit
            )

            StatsBodyweightCard(unit: session.weightUnit)
        }
    }

    private func splitRow(windowed: [LocalWorkout]) -> some View {
        HStack(spacing: 14) {
            StatsMuscleSplitCard(
                shares: StatsMath.muscleShares(workouts: windowed, exercises: store.exercises)
            )
            .frame(maxWidth: .infinity)

            VStack(spacing: 14) {
                StatsValueCard(
                    value: "\(StatsMath.dayStreak(workouts: store.workouts))",
                    caption: "day streak"
                )
                StatsValueCard(
                    value: String(format: "%.1f", StatsMath.workoutsPerWeek(workouts: store.workouts)),
                    caption: "workouts / week"
                )
            }
            .frame(maxWidth: .infinity)
        }
        .fixedSize(horizontal: false, vertical: true)
    }
}

struct ChartHover: Equatable {
    let value: String
    let label: String
    let location: CGPoint
}

struct ChartTooltip: View {
    let hover: ChartHover
    let bounds: CGSize

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(hover.value)
                .font(Theme.mono(11, .bold))
                .foregroundStyle(.white)
            Text(hover.label)
                .font(Theme.mono(10))
                .foregroundStyle(.white.opacity(0.65))
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 10)
        .background(Theme.ink, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
        .fixedSize()
        .position(
            x: min(max(hover.location.x, 46), bounds.width - 46),
            y: hover.location.y - 30
        )
        .allowsHitTesting(false)
    }
}

private struct StatsVolumeCard: View {
    let rangeLabel: String
    let weeks: [StatsMath.WeekVolume]
    let unit: WeightUnit
    var onTapWeek: (StatsMath.WeekVolume) -> Void

    @State private var hover: ChartHover?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                EyebrowText("VOLUME · \(rangeLabel)", size: 10)
                Spacer()
                if let trend = StatsMath.weeklyTrendPercent(weeks: weeks) {
                    Text(trend >= 0 ? "↑ \(trend)%" : "↓ \(-trend)%")
                        .font(Theme.font(11, .bold))
                        .foregroundStyle(trend >= 0 ? Theme.positive : Theme.muted2)
                }
            }
            if weeks.contains(where: { $0.volumeKg > 0 }) {
                chart
            } else {
                StatsEmptyNote(height: 90)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .card(radius: 20)
    }

    private var chart: some View {
        Chart(weeks) { week in
            BarMark(
                x: .value("Week", week.label),
                y: .value("Volume", week.volumeKg)
            )
            .foregroundStyle(barColor(for: week.index))
            .cornerRadius(4)
        }
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .frame(height: 90)
        .chartOverlay { proxy in
            GeometryReader { geo in
                Rectangle()
                    .fill(.clear)
                    .contentShape(Rectangle())
                    .gesture(
                        SpatialTapGesture().onEnded { tap in
                            if let week = week(at: tap.location, proxy: proxy, geo: geo) {
                                onTapWeek(week)
                            }
                        }
                    )
                    .onContinuousHover { phase in
                        switch phase {
                        case .active(let location):
                            guard let week = week(at: location, proxy: proxy, geo: geo) else {
                                hover = nil
                                return
                            }
                            hover = ChartHover(
                                value: Formatting.weight(week.volumeKg, unit: unit),
                                label: "Week of \(Formatting.shortDate(week.start))",
                                location: location
                            )
                        case .ended:
                            hover = nil
                        }
                    }
                if let hover {
                    ChartTooltip(hover: hover, bounds: geo.size)
                }
            }
        }
    }

    private func week(
        at location: CGPoint,
        proxy: ChartProxy,
        geo: GeometryProxy
    ) -> StatsMath.WeekVolume? {
        guard let plotFrame = proxy.plotFrame else { return nil }
        let frame = geo[plotFrame]
        guard let label = proxy.value(atX: location.x - frame.origin.x, as: String.self) else {
            return nil
        }
        return weeks.first { $0.label == label }
    }

    private func barColor(for index: Int) -> Color {
        if index == weeks.count - 1 { return Theme.accentBlue }
        if index >= weeks.count - 3 { return Theme.resumeRing }
        return Theme.chartMuted
    }
}

private struct StatsMuscleLegendItem: Identifiable {
    let share: StatsMath.MuscleShare
    let color: Color

    var id: String { share.id }
}

private struct StatsMuscleSplitCard: View {
    let shares: [StatsMath.MuscleShare]

    private static let palette: [Color] = [
        Theme.accentBlue,
        Theme.resumeRing,
        Color(hex: 0xC9D7F2),
        Theme.chartMuted,
    ]

    private var items: [StatsMuscleLegendItem] {
        shares.enumerated().map { index, share in
            StatsMuscleLegendItem(
                share: share,
                color: share.isOther
                    ? Theme.chartMuted
                    : Self.palette[min(index, Self.palette.count - 1)]
            )
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            EyebrowText("MUSCLE SPLIT", size: 10)
            if shares.isEmpty {
                StatsEmptyNote(height: 84)
            } else {
                let legendItems = items
                Chart(legendItems) { item in
                    SectorMark(
                        angle: .value("Credit", item.share.credit),
                        innerRadius: .ratio(30 / 42)
                    )
                    .foregroundStyle(item.color)
                }
                .frame(width: 84, height: 84)
                .frame(maxWidth: .infinity)

                VStack(alignment: .leading, spacing: 5) {
                    ForEach(legendItems) { item in
                        HStack(spacing: 6) {
                            Circle()
                                .fill(item.color)
                                .frame(width: 6, height: 6)
                            Text(item.share.label)
                                .font(Theme.mono(10))
                                .foregroundStyle(Theme.muted2)
                                .lineLimit(1)
                            Spacer(minLength: 4)
                            Text("\(item.share.percent)%")
                                .font(Theme.mono(10))
                                .foregroundStyle(Theme.muted2)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .padding(16)
        .card(radius: 20)
    }
}

private struct StatsValueCard: View {
    let value: String
    let caption: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(Theme.font(22, .heavy))
                .foregroundStyle(Theme.ink)
            Text(caption)
                .font(Theme.font(11))
                .foregroundStyle(Theme.muted2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(14)
        .card(radius: 20)
    }
}

private struct StatsPushPullCard: View {
    let split: StatsMath.PushPullSplit?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            EyebrowText("PUSH / PULL BALANCE", size: 10)
                .padding(.bottom, 14)
            if let split {
                bar(for: split)
                    .padding(.bottom, 10)
                HStack(spacing: 16) {
                    legendItem("Push", percent: split.pushPercent, color: Theme.accentBlue)
                    legendItem("Pull", percent: split.pullPercent, color: Theme.resumeRing)
                    legendItem("Legs", percent: split.legsPercent, color: Theme.chartMuted)
                }
            } else {
                StatsEmptyNote(height: 40)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .card(radius: 20)
    }

    private func bar(for split: StatsMath.PushPullSplit) -> some View {
        GeometryReader { geo in
            HStack(spacing: 0) {
                Rectangle()
                    .fill(Theme.accentBlue)
                    .frame(width: geo.size.width * CGFloat(split.pushPercent) / 100)
                Rectangle()
                    .fill(Theme.resumeRing)
                    .frame(width: geo.size.width * CGFloat(split.pullPercent) / 100)
                Rectangle()
                    .fill(Theme.chartMuted)
            }
        }
        .frame(height: 14)
        .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
    }

    private func legendItem(_ label: String, percent: Int, color: Color) -> some View {
        HStack(spacing: 5) {
            RoundedRectangle(cornerRadius: 2, style: .continuous)
                .fill(color)
                .frame(width: 7, height: 7)
            Text("\(label) \(percent)%")
                .font(Theme.font(11))
                .foregroundStyle(Theme.muted)
        }
    }
}

private struct StatsMonthCompareCard: View {
    let comparison: StatsMath.MonthComparison
    let unit: WeightUnit

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            EyebrowText("THIS MONTH VS LAST", size: 10)
                .padding(.bottom, 14)
            VStack(spacing: 12) {
                row(
                    label: "Workouts",
                    value: "\(comparison.workoutsThis)",
                    delta: StatsMath.deltaPercent(
                        current: Double(comparison.workoutsThis),
                        previous: Double(comparison.workoutsLast)
                    )
                )
                row(
                    label: "Volume (\(unit.label))",
                    value: volumeLabel(comparison.volumeKgThis),
                    delta: StatsMath.deltaPercent(
                        current: comparison.volumeKgThis,
                        previous: comparison.volumeKgLast
                    )
                )
                row(
                    label: "Avg duration (min)",
                    value: "\(comparison.avgMinutesThis)",
                    delta: StatsMath.deltaPercent(
                        current: Double(comparison.avgMinutesThis),
                        previous: Double(comparison.avgMinutesLast)
                    )
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .card(radius: 20)
    }

    private func volumeLabel(_ kilograms: Double) -> String {
        "\(Int(Formatting.displayWeight(kilograms, unit: unit).rounded()))"
    }

    private func row(label: String, value: String, delta: Int) -> some View {
        HStack {
            Text(label)
                .font(Theme.font(13))
                .foregroundStyle(Theme.inkSecondary)
            Spacer()
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(value)
                    .font(Theme.mono(13))
                    .foregroundStyle(Theme.ink)
                Text(delta >= 0 ? "↑ \(delta)%" : "↓ \(-delta)%")
                    .font(Theme.mono(11, .bold))
                    .foregroundStyle(delta >= 0 ? Theme.positive : Theme.muted2)
            }
        }
    }
}

private struct StatsBodyweightCard: View {
    let unit: WeightUnit

    @Environment(LocalStore.self) private var store

    @State private var isAdding = false
    @State private var input = ""
    @FocusState private var inputFocused: Bool
    @State private var hover: ChartHover?

    var body: some View {
        let entries = store.bodyweightEntries
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                EyebrowText("BODYWEIGHT", size: 10)
                Spacer()
                Button {
                    isAdding.toggle()
                    input = ""
                    inputFocused = isAdding
                } label: {
                    Text("+ Add")
                        .font(Theme.font(11, .bold))
                        .foregroundStyle(Theme.accentBlue)
                }
                .buttonStyle(.plain)
            }
            .padding(.bottom, 14)

            if isAdding {
                inputRow
                    .padding(.bottom, 14)
            }

            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(entries.last.map { Formatting.weight($0.weightKg, unit: unit) } ?? "—")
                    .font(Theme.font(22, .heavy))
                    .foregroundStyle(Theme.ink)
                if let delta = latestDelta(entries) {
                    Text(delta.label)
                        .font(Theme.mono(11, .bold))
                        .foregroundStyle(delta.isGain ? Theme.positive : Theme.muted2)
                }
            }
            .padding(.bottom, 10)

            if entries.count >= 2 {
                chart(entries: entries)
            } else if entries.isEmpty {
                StatsEmptyNote(height: 60)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .card(radius: 20)
    }

    private var inputRow: some View {
        HStack(spacing: 8) {
            TextField(unit.label, text: $input)
                .font(Theme.font(13))
                .keyboardType(.decimalPad)
                .focused($inputFocused)
                .padding(.vertical, 8)
                .padding(.horizontal, 10)
                .background(Theme.fieldFill, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .strokeBorder(Theme.fieldBorder, lineWidth: 1)
                )
            Button(action: submit) {
                Text("Add")
                    .font(Theme.font(12, .bold))
                    .foregroundStyle(.white)
                    .padding(.vertical, 8)
                    .padding(.horizontal, 14)
                    .background(Theme.ink, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .buttonStyle(.plain)
        }
    }

    private func submit() {
        guard let value = Double(input.replacingOccurrences(of: ",", with: ".")), value > 0 else {
            return
        }
        let kilograms = unit == .kilograms ? value : value * Formatting.kilogramsPerPound
        store.addBodyweight(BodyweightEntry(weightKg: (kilograms * 10).rounded() / 10))
        isAdding = false
        input = ""
    }

    private func latestDelta(_ entries: [BodyweightEntry]) -> (label: String, isGain: Bool)? {
        guard entries.count >= 2 else { return nil }
        let deltaKg = entries[entries.count - 1].weightKg - entries[entries.count - 2].weightKg
        let number = Formatting.weightNumber(abs(deltaKg), unit: unit)
        return (
            label: "\(deltaKg >= 0 ? "+" : "-")\(number)\(unit.suffix)",
            isGain: deltaKg >= 0
        )
    }

    private func chart(entries: [BodyweightEntry]) -> some View {
        Chart(entries) { entry in
            LineMark(
                x: .value("Date", entry.date),
                y: .value("Weight", entry.weightKg)
            )
            .foregroundStyle(Theme.accentBlue)
            .lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
            PointMark(
                x: .value("Date", entry.date),
                y: .value("Weight", entry.weightKg)
            )
            .foregroundStyle(Theme.accentBlue)
            .symbolSize(28)
        }
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartYScale(domain: yDomain(for: entries.map(\.weightKg)))
        .frame(height: 60)
        .chartOverlay { proxy in
            GeometryReader { geo in
                Rectangle()
                    .fill(.clear)
                    .contentShape(Rectangle())
                    .onContinuousHover { phase in
                        switch phase {
                        case .active(let location):
                            guard let entry = entry(at: location, entries: entries, proxy: proxy, geo: geo) else {
                                hover = nil
                                return
                            }
                            hover = ChartHover(
                                value: Formatting.weight(entry.weightKg, unit: unit),
                                label: Formatting.shortDate(entry.date),
                                location: location
                            )
                        case .ended:
                            hover = nil
                        }
                    }
                if let hover {
                    ChartTooltip(hover: hover, bounds: geo.size)
                }
            }
        }
    }

    private func entry(
        at location: CGPoint,
        entries: [BodyweightEntry],
        proxy: ChartProxy,
        geo: GeometryProxy
    ) -> BodyweightEntry? {
        guard let plotFrame = proxy.plotFrame else { return nil }
        let frame = geo[plotFrame]
        guard let date = proxy.value(atX: location.x - frame.origin.x, as: Date.self) else {
            return nil
        }
        return entries.min {
            abs($0.date.timeIntervalSince(date)) < abs($1.date.timeIntervalSince(date))
        }
    }

    private func yDomain(for values: [Double]) -> ClosedRange<Double> {
        guard let lowest = values.min(), let highest = values.max() else { return 0...1 }
        guard highest > lowest else { return (lowest - 1)...(highest + 1) }
        let padding = (highest - lowest) * 0.15
        return (lowest - padding)...(highest + padding)
    }
}
