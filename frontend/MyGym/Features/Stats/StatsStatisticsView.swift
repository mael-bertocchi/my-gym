import Charts
import SwiftUI

struct StatsStatisticsBody: View {
    @Binding var range: StatsMath.Range

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
                unit: session.weightUnit
            )

            splitRow(windowed: windowed)

            StatsMonthCompareCard(
                comparison: StatsMath.monthComparison(workouts: store.workouts),
                unit: session.weightUnit
            )

            StatsBodyweightCard(
                unit: session.weightUnit,
                windowStart: range == .all ? nil : StatsMath.windowStart(weekCount: weekCount)
            )

            StatsHeartRateCard(
                workouts: store.workouts,
                windowStart: range == .all ? nil : StatsMath.windowStart(weekCount: weekCount)
            )
        }
    }

    private func splitRow(windowed: [LocalWorkout]) -> some View {
        HStack(spacing: 14) {
            StatsMuscleSplitCard(
                shares: StatsMath.muscleShares(workouts: windowed, exercises: store.exercises)
            )
            .frame(maxWidth: .infinity)

            StatsValueCard(
                eyebrow: "FREQUENCY",
                value: String(format: "%.1f", StatsMath.workoutsPerWeek(workouts: store.workouts)),
                caption: "workouts per week"
            )
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

struct TrendDeltaText: View {
    let percent: Int

    var body: some View {
        Text(label)
            .font(Theme.mono(11, .bold))
            .foregroundStyle(percent > 0 ? Theme.positive : Theme.muted2)
    }

    private var label: String {
        if percent > 0 { return "↑ \(percent)%" }
        if percent < 0 { return "↓ \(-percent)%" }
        return "· 0%"
    }
}

struct ChartTooltip: View {
    let hover: ChartHover
    let bounds: CGSize
    var verticalOffset: CGFloat = -30

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
            y: hover.location.y + verticalOffset
        )
        .allowsHitTesting(false)
    }
}

private struct StatsVolumeCard: View {
    let rangeLabel: String
    let weeks: [StatsMath.WeekVolume]
    let unit: WeightUnit

    @State private var selectedWeekLabel: String?

    private var selectedWeek: StatsMath.WeekVolume? {
        selectedWeekLabel.flatMap { label in
            weeks.first { $0.label == label }
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                EyebrowText("VOLUME · \(rangeLabel)", size: 10)
                Spacer()
                if let trend = StatsMath.weeklyTrendPercent(weeks: weeks) {
                    TrendDeltaText(percent: trend)
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
        .chartXSelection(value: $selectedWeekLabel)
        .frame(height: 90)
        .chartOverlay { proxy in
            GeometryReader { geo in
                if let selectedWeek,
                   selectedWeek.volumeKg > 0,
                   let location = barLocation(for: selectedWeek, proxy: proxy, geo: geo) {
                    ChartTooltip(
                        hover: ChartHover(
                            value: Formatting.weight(selectedWeek.volumeKg, unit: unit),
                            label: "Week of \(Formatting.shortDate(selectedWeek.start))",
                            location: location
                        ),
                        bounds: geo.size,
                        verticalOffset: 28
                    )
                }
            }
        }
    }

    private func barLocation(
        for week: StatsMath.WeekVolume,
        proxy: ChartProxy,
        geo: GeometryProxy
    ) -> CGPoint? {
        guard let plotFrame = proxy.plotFrame,
              let x = proxy.position(forX: week.label),
              let y = proxy.position(forY: week.volumeKg) else {
            return nil
        }
        let frame = geo[plotFrame]
        return CGPoint(x: frame.origin.x + x, y: frame.origin.y + y)
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
        Theme.chartSoft,
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
                                .foregroundStyle(Theme.muted)
                                .lineLimit(1)
                            Spacer(minLength: 4)
                            Text("\(item.share.percent)%")
                                .font(Theme.mono(10))
                                .foregroundStyle(Theme.muted)
                        }
                        .accessibilityElement(children: .combine)
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
    let eyebrow: String
    let value: String
    let caption: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            EyebrowText(eyebrow, size: 10)
            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(Theme.font(22, .heavy))
                    .foregroundStyle(Theme.ink)
                Text(caption)
                    .font(Theme.font(11))
                    .foregroundStyle(Theme.muted)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(16)
        .card(radius: 20)
        .accessibilityElement(children: .combine)
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
                TrendDeltaText(percent: delta)
            }
        }
    }
}

private struct StatsBodyweightCard: View {
    let unit: WeightUnit
    let windowStart: Date?

    @Environment(HealthKitService.self) private var healthKit

    @State private var entries: [BodyweightSample] = []
    @State private var isAdding = false
    @State private var input = ""
    @FocusState private var inputFocused: Bool
    @State private var selectedDate: Date?

    private var visibleEntries: [BodyweightSample] {
        guard let windowStart else { return entries }
        return entries.filter { $0.date >= windowStart }
    }

    var body: some View {
        let visible = visibleEntries
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                EyebrowText("BODYWEIGHT", size: 10)
                Spacer()
                InlineLink(title: "Add", systemImage: "plus") {
                    isAdding.toggle()
                    input = ""
                    inputFocused = isAdding
                }
            }
            .padding(.bottom, 14)

            if isAdding {
                inputRow
                    .padding(.bottom, 14)
            }

            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(visible.last.map { Formatting.weight($0.weightKg, unit: unit) } ?? "—")
                    .font(Theme.font(22, .heavy))
                    .foregroundStyle(Theme.ink)
                if let delta = latestDelta(visible) {
                    Text(delta)
                        .font(Theme.mono(11, .bold))
                        .foregroundStyle(Theme.muted)
                }
            }
            .padding(.bottom, 10)

            if visible.count >= 2 {
                chart(entries: visible)
            } else if visible.isEmpty {
                StatsEmptyNote(height: 60)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .card(radius: 20)
        .task { entries = await healthKit.bodyweightHistory() }
    }

    private var inputRow: some View {
        HStack(spacing: 8) {
            TextField(unit.label, text: $input)
                .font(Theme.font(13))
                .keyboardType(.decimalPad)
                .focused($inputFocused)
                .padding(.vertical, 8)
                .padding(.horizontal, 10)
                .background(Theme.fieldFill, in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
                        .strokeBorder(Theme.fieldBorder, lineWidth: 1)
                )
                .accessibilityLabel("Bodyweight in \(unit.label)")
            Button(action: submit) {
                Text("Add")
                    .font(Theme.font(12, .bold))
                    .foregroundStyle(.white)
                    .padding(.vertical, 8)
                    .padding(.horizontal, 14)
                    .background(Theme.ink, in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous))
                    .expandedTapTarget(vertical: 6, horizontal: 2)
            }
            .buttonStyle(.plain)
        }
    }

    private func submit() {
        guard let value = Double(input.replacingOccurrences(of: ",", with: ".")), value > 0 else {
            Haptics.warning()
            return
        }
        let kilograms = unit == .kilograms ? value : value * Formatting.kilogramsPerPound
        isAdding = false
        input = ""
        Task {
            await healthKit.saveBodyweight(kilograms: (kilograms * 10).rounded() / 10)
            entries = await healthKit.bodyweightHistory()
        }
    }

    private func latestDelta(_ entries: [BodyweightSample]) -> String? {
        guard entries.count >= 2 else { return nil }
        let deltaKg = entries[entries.count - 1].weightKg - entries[entries.count - 2].weightKg
        let number = Formatting.weightNumber(abs(deltaKg), unit: unit)
        return "\(deltaKg >= 0 ? "+" : "-")\(number)\(unit.suffix)"
    }

    private func chart(entries: [BodyweightSample]) -> some View {
        let selected = selectedDate.flatMap { nearestEntry(to: $0, in: entries) }
        return Chart(entries) { entry in
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
            .symbolSize(entry.id == selected?.id ? 72 : 28)
        }
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartYScale(domain: chartYDomain(for: entries.map(\.weightKg)))
        .chartXSelection(value: $selectedDate)
        .frame(height: 60)
        .chartOverlay { proxy in
            GeometryReader { geo in
                if let selected, let location = dotLocation(for: selected, proxy: proxy, geo: geo) {
                    ChartTooltip(
                        hover: ChartHover(
                            value: Formatting.weight(selected.weightKg, unit: unit),
                            label: Formatting.shortDate(selected.date),
                            location: location
                        ),
                        bounds: geo.size
                    )
                }
            }
        }
    }

    private func nearestEntry(to date: Date, in entries: [BodyweightSample]) -> BodyweightSample? {
        entries.min {
            abs($0.date.timeIntervalSince(date)) < abs($1.date.timeIntervalSince(date))
        }
    }

    private func dotLocation(
        for entry: BodyweightSample,
        proxy: ChartProxy,
        geo: GeometryProxy
    ) -> CGPoint? {
        guard let plotFrame = proxy.plotFrame,
              let x = proxy.position(forX: entry.date),
              let y = proxy.position(forY: entry.weightKg) else {
            return nil
        }
        let frame = geo[plotFrame]
        return CGPoint(x: frame.origin.x + x, y: frame.origin.y + y)
    }
}

private struct StatsHeartRateCard: View {
    let workouts: [LocalWorkout]
    let windowStart: Date?

    @State private var selectedDate: Date?

    private struct Entry: Identifiable {
        let id: String
        let date: Date
        let bpm: Int
    }

    private var entries: [Entry] {
        workouts
            .compactMap { workout in
                workout.averageHeartRate.map { Entry(id: workout.id, date: workout.startedAt, bpm: $0) }
            }
            .sorted { $0.date < $1.date }
    }

    private var visibleEntries: [Entry] {
        guard let windowStart else { return entries }
        return entries.filter { $0.date >= windowStart }
    }

    var body: some View {
        let visible = visibleEntries
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                EyebrowText("AVG HEART RATE", size: 10)
                Spacer()
                Image(systemName: "heart.fill")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Theme.danger)
            }
            .padding(.bottom, 14)

            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(visible.last.map { "\($0.bpm) bpm" } ?? "—")
                    .font(Theme.font(22, .heavy))
                    .foregroundStyle(Theme.ink)
                if let delta = latestDelta(visible) {
                    Text(delta)
                        .font(Theme.mono(11, .bold))
                        .foregroundStyle(Theme.muted)
                }
            }
            .padding(.bottom, 10)

            if visible.count >= 2 {
                chart(entries: visible)
            } else if visible.isEmpty {
                StatsEmptyNote(text: "No heart rate yet", height: 60)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .card(radius: 20)
    }

    private func latestDelta(_ entries: [Entry]) -> String? {
        guard entries.count >= 2 else { return nil }
        let delta = entries[entries.count - 1].bpm - entries[entries.count - 2].bpm
        return "\(delta >= 0 ? "+" : "-")\(abs(delta)) bpm"
    }

    private func chart(entries: [Entry]) -> some View {
        let selected = selectedDate.flatMap { nearestEntry(to: $0, in: entries) }
        return Chart(entries) { entry in
            LineMark(
                x: .value("Date", entry.date),
                y: .value("BPM", entry.bpm)
            )
            .foregroundStyle(Theme.danger)
            .lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
            PointMark(
                x: .value("Date", entry.date),
                y: .value("BPM", entry.bpm)
            )
            .foregroundStyle(Theme.danger)
            .symbolSize(entry.id == selected?.id ? 72 : 28)
        }
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartYScale(domain: chartYDomain(for: entries.map { Double($0.bpm) }))
        .chartXSelection(value: $selectedDate)
        .frame(height: 60)
        .chartOverlay { proxy in
            GeometryReader { geo in
                if let selected, let location = dotLocation(for: selected, proxy: proxy, geo: geo) {
                    ChartTooltip(
                        hover: ChartHover(
                            value: "\(selected.bpm) bpm",
                            label: Formatting.shortDate(selected.date),
                            location: location
                        ),
                        bounds: geo.size
                    )
                }
            }
        }
    }

    private func nearestEntry(to date: Date, in entries: [Entry]) -> Entry? {
        entries.min {
            abs($0.date.timeIntervalSince(date)) < abs($1.date.timeIntervalSince(date))
        }
    }

    private func dotLocation(
        for entry: Entry,
        proxy: ChartProxy,
        geo: GeometryProxy
    ) -> CGPoint? {
        guard let plotFrame = proxy.plotFrame,
              let x = proxy.position(forX: entry.date),
              let y = proxy.position(forY: entry.bpm) else {
            return nil
        }
        let frame = geo[plotFrame]
        return CGPoint(x: frame.origin.x + x, y: frame.origin.y + y)
    }
}

private func chartYDomain(for values: [Double]) -> ClosedRange<Double> {
    guard let lowest = values.min(), let highest = values.max() else { return 0...1 }
    guard highest > lowest else { return (lowest - 1)...(highest + 1) }
    let padding = (highest - lowest) * 0.15
    return (lowest - padding)...(highest + padding)
}
