import Foundation

enum StatsMath {
    static let retentionWeeks = 52

    static var weekCalendar: Calendar {
        var calendar = Calendar.current
        calendar.firstWeekday = 2
        return calendar
    }

    static func retentionStart(now: Date = .now) -> Date? {
        windowStart(weekCount: retentionWeeks, now: now)
    }

    static func retained(_ workouts: [LocalWorkout], now: Date = .now) -> [LocalWorkout] {
        guard let start = retentionStart(now: now) else { return workouts }
        return workouts.filter { $0.startedAt >= start }
    }

    enum Range: String, CaseIterable, Identifiable {
        case oneMonth = "1M"
        case threeMonths = "3M"
        case sixMonths = "6M"
        case oneYear = "1Y"
        case all = "ALL"

        var id: String { rawValue }

        func weekCount(workouts: [LocalWorkout], now: Date = .now) -> Int {
            switch self {
            case .oneMonth: return 4
            case .threeMonths: return 13
            case .sixMonths: return 26
            case .oneYear: return 52
            case .all:
                let calendar = weekCalendar
                guard let earliest = workouts.map(\.startedAt).min(),
                      let firstWeek = calendar.dateInterval(of: .weekOfYear, for: earliest)?.start,
                      let currentWeek = calendar.dateInterval(of: .weekOfYear, for: now)?.start,
                      let weeks = calendar.dateComponents(
                        [.weekOfYear], from: firstWeek, to: currentWeek
                      ).weekOfYear else {
                    return 4
                }
                return min(max(weeks + 1, 4), retentionWeeks)
            }
        }
    }

    struct WeekVolume: Identifiable {
        let index: Int
        let start: Date
        let end: Date
        let volumeKg: Double

        var id: Int { index }
        var label: String { "W\(index + 1)" }
    }

    static func weeklyVolumes(
        workouts: [LocalWorkout],
        weekCount: Int,
        now: Date = .now
    ) -> [WeekVolume] {
        let calendar = weekCalendar
        guard weekCount > 0,
              let currentStart = calendar.dateInterval(of: .weekOfYear, for: now)?.start else {
            return []
        }
        return (0..<weekCount).map { index in
            guard let start = calendar.date(
                byAdding: .weekOfYear, value: index - (weekCount - 1), to: currentStart
            ), let week = calendar.dateInterval(of: .weekOfYear, for: start) else {
                return WeekVolume(index: index, start: currentStart, end: currentStart, volumeKg: 0)
            }
            let volume = workouts
                .filter { week.contains($0.startedAt) }
                .reduce(0) { $0 + $1.totalVolume }
            return WeekVolume(index: index, start: start, end: week.end, volumeKg: volume)
        }
    }

    static func weeklyTrendPercent(weeks: [WeekVolume]) -> Int? {
        guard weeks.count >= 2 else { return nil }
        let latestIndex = weeks[weeks.count - 1].volumeKg > 0 ? weeks.count - 1 : weeks.count - 2
        guard latestIndex >= 1 else { return nil }
        let latest = weeks[latestIndex].volumeKg
        let previous = weeks[latestIndex - 1].volumeKg
        guard latest > 0, previous > 0 else { return nil }
        return Int(((latest - previous) / previous * 100).rounded())
    }

    static func windowStart(weekCount: Int, now: Date = .now) -> Date? {
        let calendar = weekCalendar
        guard let currentStart = calendar.dateInterval(of: .weekOfYear, for: now)?.start else {
            return nil
        }
        return calendar.date(byAdding: .weekOfYear, value: -(weekCount - 1), to: currentStart)
    }

    static func workouts(
        _ workouts: [LocalWorkout],
        inLastWeeks weekCount: Int,
        now: Date = .now
    ) -> [LocalWorkout] {
        guard let windowStart = windowStart(weekCount: weekCount, now: now) else { return [] }
        return workouts.filter { $0.startedAt >= windowStart }
    }

    struct MuscleShare: Identifiable {
        let label: String
        let credit: Double
        let percent: Int
        let isOther: Bool

        var id: String { label }
    }

    static func muscleShares(
        workouts: [LocalWorkout],
        exercises: [Exercise],
        topCount: Int = 3
    ) -> [MuscleShare] {
        let byId = Dictionary(exercises.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
        var credits: [MuscleGroup: Double] = [:]
        for workout in workouts {
            for entry in workout.exercises {
                guard let exercise = byId[entry.exerciseId] else { continue }
                let workingSets = entry.sets.filter { $0.isCompleted && $0.setType == .normal }.count
                guard workingSets > 0 else { continue }
                if let primaryMuscle = exercise.primaryMuscle {
                    credits[primaryMuscle, default: 0] += Double(workingSets)
                }
                for secondary in exercise.secondaryMuscles {
                    credits[secondary, default: 0] += 0.5 * Double(workingSets)
                }
            }
        }
        let total = credits.values.reduce(0, +)
        guard total > 0 else { return [] }

        let ranked = credits.sorted { lhs, rhs in
            if lhs.value != rhs.value { return lhs.value > rhs.value }
            return lhs.key.rawValue < rhs.key.rawValue
        }
        var shares = ranked.prefix(topCount).map { muscle, credit in
            MuscleShare(
                label: muscle.label.uppercased(),
                credit: credit,
                percent: Int((credit / total * 100).rounded()),
                isOther: false
            )
        }
        let otherCredit = ranked.dropFirst(topCount).reduce(0) { $0 + $1.value }
        if otherCredit > 0 {
            shares.append(MuscleShare(
                label: "OTHER",
                credit: otherCredit,
                percent: Int((otherCredit / total * 100).rounded()),
                isOther: true
            ))
        }
        return shares
    }

    static func workoutsPerWeek(
        workouts allWorkouts: [LocalWorkout],
        weekCount: Int,
        now: Date = .now
    ) -> Double {
        guard weekCount > 0 else { return 0 }
        let recent = workouts(allWorkouts, inLastWeeks: weekCount, now: now)
        return Double(recent.count) / Double(weekCount)
    }

    enum ExerciseCategory: String {
        case push
        case pull
        case legs

        init?(muscle: MuscleGroup) {
            switch muscle {
            case .chest, .frontDelts, .sideDelts, .triceps:
                self = .push
            case .upperBack, .lats, .lowerBack, .trapezius, .rearDelts, .biceps, .forearms:
                self = .pull
            case .quadriceps, .hamstrings, .glutes, .calves, .adductors, .abductors:
                self = .legs
            case .abs, .obliques, .neck, .fullBody:
                return nil
            }
        }
    }

    static func categoryContribution(
        exerciseId: String,
        workouts: [LocalWorkout],
        exercises: [Exercise]
    ) -> (percent: Int, category: ExerciseCategory)? {
        let byId = Dictionary(exercises.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
        guard let exercise = byId[exerciseId],
              let category = exercise.primaryMuscle.flatMap(ExerciseCategory.init(muscle:)) else { return nil }

        var categoryTotal = 0.0
        var exerciseTotal = 0.0
        for workout in workouts {
            for entry in workout.exercises {
                guard let other = byId[entry.exerciseId],
                      other.primaryMuscle.flatMap(ExerciseCategory.init(muscle:)) == category else { continue }
                let volume = entry.sets
                    .filter { $0.isCompleted && $0.setType == .normal }
                    .reduce(0) { $0 + $1.volume }
                categoryTotal += volume
                if entry.exerciseId == exerciseId {
                    exerciseTotal += volume
                }
            }
        }
        guard categoryTotal > 0 else { return nil }
        return (Int((exerciseTotal / categoryTotal * 100).rounded()), category)
    }

    struct PeriodComparison {
        let workoutsThis: Int
        let workoutsLast: Int
        let volumeKgThis: Double
        let volumeKgLast: Double
        let avgMinutesThis: Int
        let avgMinutesLast: Int
    }

    static func periodComparison(
        workouts: [LocalWorkout],
        weekCount: Int,
        now: Date = .now
    ) -> PeriodComparison {
        guard let currentStart = windowStart(weekCount: weekCount, now: now),
              let previousStart = weekCalendar.date(byAdding: .weekOfYear, value: -weekCount, to: currentStart) else {
            return PeriodComparison(
                workoutsThis: 0, workoutsLast: 0,
                volumeKgThis: 0, volumeKgLast: 0,
                avgMinutesThis: 0, avgMinutesLast: 0
            )
        }
        let inThis = workouts.filter { $0.startedAt >= currentStart }
        let inLast = workouts.filter { $0.startedAt >= previousStart && $0.startedAt < currentStart }

        func avgMinutes(_ workouts: [LocalWorkout]) -> Int {
            let durations = workouts.compactMap(\.duration)
            guard !durations.isEmpty else { return 0 }
            return Int((durations.reduce(0, +) / Double(durations.count) / 60).rounded())
        }

        return PeriodComparison(
            workoutsThis: inThis.count,
            workoutsLast: inLast.count,
            volumeKgThis: inThis.reduce(0) { $0 + $1.totalVolume },
            volumeKgLast: inLast.reduce(0) { $0 + $1.totalVolume },
            avgMinutesThis: avgMinutes(inThis),
            avgMinutesLast: avgMinutes(inLast)
        )
    }

    static func deltaPercent(current: Double, previous: Double) -> Int? {
        guard previous > 0 else { return nil }
        return Int(((current - previous) / previous * 100).rounded())
    }

    struct CalendarDay: Identifiable {
        let date: Date
        let dayNumber: Int
        let isToday: Bool
        let isFuture: Bool
        let workoutId: String?

        var id: Date { date }
    }

    struct CalendarMonth: Identifiable {
        let monthStart: Date
        let leadingBlanks: Int
        let days: [CalendarDay]

        var id: Date { monthStart }
    }

    static func monthCalendar(
        workouts: [LocalWorkout],
        monthsBack: Int,
        now: Date = .now
    ) -> [CalendarMonth] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: now)

        var workoutByDay: [Date: String] = [:]
        for workout in workouts.sorted(by: { $0.startedAt < $1.startedAt }) {
            workoutByDay[calendar.startOfDay(for: workout.startedAt)] = workout.id
        }

        return (0..<monthsBack).compactMap { offset in
            guard let monthDate = calendar.date(byAdding: .month, value: -offset, to: now),
                  let month = calendar.dateInterval(of: .month, for: monthDate),
                  let dayCount = calendar.range(of: .day, in: .month, for: month.start)?.count else {
                return nil
            }
            let firstWeekday = calendar.component(.weekday, from: month.start)
            let days = (0..<dayCount).compactMap { dayOffset -> CalendarDay? in
                guard let date = calendar.date(byAdding: .day, value: dayOffset, to: month.start) else {
                    return nil
                }
                let isFuture = date > today
                return CalendarDay(
                    date: date,
                    dayNumber: dayOffset + 1,
                    isToday: date == today,
                    isFuture: isFuture,
                    workoutId: isFuture ? nil : workoutByDay[date]
                )
            }
            return CalendarMonth(
                monthStart: month.start,
                leadingBlanks: (firstWeekday + 5) % 7,
                days: days
            )
        }
    }

    struct PersonalRecordEvent: Identifiable {
        enum Kind: String {
            case heaviest = "Heaviest"
            case oneRepMax = "Est. 1RM"
        }

        let kind: Kind
        let valueKg: Double
        let deltaKg: Double?
        let date: Date
        let workoutId: String

        var id: String { "\(workoutId)-\(kind.rawValue)" }
    }

    static func personalRecordEvents(for exerciseId: String, workouts: [LocalWorkout]) -> [PersonalRecordEvent] {
        var maxHeaviest = 0.0
        var maxOneRM = 0.0
        var events: [PersonalRecordEvent] = []
        for session in sessions(for: exerciseId, workouts: workouts) {
            if let heaviest = session.heaviestKg, heaviest > maxHeaviest {
                events.append(PersonalRecordEvent(
                    kind: .heaviest,
                    valueKg: heaviest,
                    deltaKg: maxHeaviest > 0 ? heaviest - maxHeaviest : nil,
                    date: session.date,
                    workoutId: session.workoutId
                ))
                maxHeaviest = heaviest
            }
            if let oneRM = session.bestOneRepMaxKg, oneRM > maxOneRM {
                events.append(PersonalRecordEvent(
                    kind: .oneRepMax,
                    valueKg: oneRM,
                    deltaKg: maxOneRM > 0 ? oneRM - maxOneRM : nil,
                    date: session.date,
                    workoutId: session.workoutId
                ))
                maxOneRM = oneRM
            }
        }
        return events.sorted { $0.date > $1.date }
    }

    struct SessionPoint: Identifiable {
        let workoutId: String
        let date: Date
        let bestOneRepMaxKg: Double?
        let heaviestKg: Double?
        let heaviestReps: Int?
        let bestReps: Int?
        let volumeKg: Double

        var id: String { workoutId }
    }

    static func sessions(for exerciseId: String, workouts: [LocalWorkout]) -> [SessionPoint] {
        workouts.compactMap { workout -> SessionPoint? in
            let sets = workout.exercises
                .filter { $0.exerciseId == exerciseId }
                .flatMap(\.sets)
                .filter(\.isCompleted)
            guard !sets.isEmpty else { return nil }

            let heaviest = sets
                .filter { $0.weightKg != nil }
                .max { lhs, rhs in
                    let left = lhs.weightKg ?? 0
                    let right = rhs.weightKg ?? 0
                    if left != right { return left < right }
                    return (lhs.reps ?? 0) < (rhs.reps ?? 0)
                }
            let volume = sets
                .filter { $0.setType == .normal }
                .reduce(0) { $0 + $1.volume }

            return SessionPoint(
                workoutId: workout.id,
                date: workout.startedAt,
                bestOneRepMaxKg: sets.compactMap(\.estimated1RM).max(),
                heaviestKg: heaviest?.weightKg,
                heaviestReps: heaviest?.reps,
                bestReps: sets.compactMap(\.reps).max(),
                volumeKg: volume
            )
        }
        .sorted { $0.date < $1.date }
    }
}
