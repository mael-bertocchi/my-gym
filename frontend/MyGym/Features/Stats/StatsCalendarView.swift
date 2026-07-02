import SwiftUI

struct StatsCalendarBody: View {
    var onOpenWorkout: (String) -> Void

    @Environment(LocalStore.self) private var store

    private static let weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"]

    private static let columns = Array(
        repeating: GridItem(.flexible(), spacing: 4),
        count: 7
    )

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            ForEach(StatsMath.monthCalendar(workouts: store.workouts, monthsBack: 6)) { month in
                monthSection(month)
            }
            legend
        }
    }

    private func monthSection(_ month: StatsMath.CalendarMonth) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(Formatting.monthLabel(month.monthStart))
                .font(Theme.mono(11, .bold))
                .kerning(1)
                .foregroundStyle(Theme.ink)
                .padding(.bottom, 10)

            LazyVGrid(columns: Self.columns, spacing: 4) {
                ForEach(Self.weekdayLabels.indices, id: \.self) { index in
                    Text(Self.weekdayLabels[index])
                        .font(Theme.mono(9, .bold))
                        .foregroundStyle(Theme.muted2)
                }
            }
            .padding(.bottom, 6)

            LazyVGrid(columns: Self.columns, spacing: 4) {
                ForEach(0..<month.leadingBlanks, id: \.self) { _ in
                    Color.clear
                        .aspectRatio(1, contentMode: .fit)
                }
                ForEach(month.days) { day in
                    dayCell(day)
                }
            }
        }
    }

    @ViewBuilder
    private func dayCell(_ day: StatsMath.CalendarDay) -> some View {
        if let workoutId = day.workoutId {
            Button {
                onOpenWorkout(workoutId)
            } label: {
                dayLabel(day)
            }
            .buttonStyle(.plain)
        } else {
            dayLabel(day)
        }
    }

    private func dayLabel(_ day: StatsMath.CalendarDay) -> some View {
        Text("\(day.dayNumber)")
            .font(Theme.mono(11, .semibold))
            .foregroundStyle(numberColor(for: day))
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .aspectRatio(1, contentMode: .fit)
            .background(
                fillColor(for: day),
                in: RoundedRectangle(cornerRadius: 8, style: .continuous)
            )
            .overlay(border(for: day))
    }

    private func fillColor(for day: StatsMath.CalendarDay) -> Color {
        if day.workoutId != nil { return Theme.accentBlue }
        if day.isFuture { return Theme.surface }
        return Theme.divider
    }

    private func numberColor(for day: StatsMath.CalendarDay) -> Color {
        if day.workoutId != nil { return .white }
        if day.isFuture { return Theme.tabInactive }
        return Theme.muted2
    }

    @ViewBuilder
    private func border(for day: StatsMath.CalendarDay) -> some View {
        if day.isToday {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .strokeBorder(Theme.ink, lineWidth: 2)
        } else if day.isFuture {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .strokeBorder(Theme.fieldBorder, style: StrokeStyle(lineWidth: 1, dash: [3, 3]))
        }
    }

    private var legend: some View {
        HStack(spacing: 14) {
            HStack(spacing: 5) {
                RoundedRectangle(cornerRadius: 3, style: .continuous)
                    .fill(Theme.divider)
                    .strokeBorder(Theme.fieldBorder, lineWidth: 1)
                    .frame(width: 9, height: 9)
                Text("Rest")
                    .font(Theme.font(11))
                    .foregroundStyle(Theme.muted)
            }
            HStack(spacing: 5) {
                RoundedRectangle(cornerRadius: 3, style: .continuous)
                    .fill(Theme.accentBlue)
                    .frame(width: 9, height: 9)
                Text("Workout")
                    .font(Theme.font(11))
                    .foregroundStyle(Theme.muted)
            }
        }
    }
}
