import SwiftUI

struct HomeView: View {
    var onOpenCoach: () -> Void = {}
    var onOpenStats: () -> Void = {}
    var onOpenHistory: () -> Void = {}

    @Environment(AppSession.self) private var session
    @Environment(LocalStore.self) private var store

    @State private var showProfile = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                headerRow
                    .padding(.bottom, 24)

                thisWeekCard
                    .padding(.bottom, 16)

                weeklyVolumeCard
                    .padding(.bottom, 16)

                coachInsightCard

                SectionLabel("RECENT WORKOUTS")
                    .padding(.top, 22)
                    .padding(.bottom, 12)
                    .padding(.horizontal, 4)

                recentWorkoutsSection
            }
            .padding(.top, 8)
            .padding(.horizontal, Theme.screenPadding)
        }
        .contentMargins(.bottom, Theme.tabBarClearance, for: .scrollContent)
        .defaultScrollAnchor(debugScrollToBottom ? .bottom : .top)
        .background(Theme.screenBackground.ignoresSafeArea())
        .sheet(isPresented: $showProfile) {
            ProfileView()
        }
        .onAppear {
            #if DEBUG
            if UserDefaults.standard.string(forKey: "open") == "profile" {
                showProfile = true
            }
            #endif
        }
    }

    private var debugScrollToBottom: Bool {
        #if DEBUG
        return UserDefaults.standard.string(forKey: "open") == "bottom"
        #else
        return false
        #endif
    }

    private var headerRow: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text(Formatting.eyebrowDate(.now))
                    .font(Theme.mono(12))
                    .kerning(0.5)
                    .foregroundStyle(Theme.muted2)
                Text(greeting)
                    .font(Theme.font(26, .heavy))
                    .tracking(-0.4)
                    .foregroundStyle(Theme.ink)
            }
            Spacer()
            Button {
                showProfile = true
            } label: {
                AvatarView(name: session.currentUser?.displayName ?? "", size: 42)
            }
            .buttonStyle(.plain)
        }
    }

    private var greeting: String {
        let first = session.currentUser?.displayName
            .split(separator: " ")
            .first
            .map(String.init) ?? ""
        return first.isEmpty ? "Hey there" : "Hey, \(first)"
    }

    private var thisWeekCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            EyebrowText("THIS WEEK")
            HStack(alignment: .top, spacing: 8) {
                HomeStatColumn(value: "\(weekWorkouts.count)", caption: "workouts")
                HomeStatColumn(
                    value: Formatting.compactVolume(weekVolume, unit: session.weightUnit),
                    caption: "\(session.weightUnit.label) volume"
                )
                HomeStatColumn(value: "\(dayStreak)", caption: "day streak", isAccent: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .card(radius: 22)
    }

    private var mondayCalendar: Calendar {
        var calendar = Calendar.current
        calendar.firstWeekday = 2
        return calendar
    }

    private var weekWorkouts: [LocalWorkout] {
        guard let week = mondayCalendar.dateInterval(of: .weekOfYear, for: .now) else { return [] }
        return store.workouts.filter { week.contains($0.startedAt) }
    }

    private var weekVolume: Double {
        weekWorkouts.reduce(0) { $0 + $1.totalVolume }
    }

    private var dayStreak: Int {
        let calendar = Calendar.current
        let days = Set(store.workouts.map { calendar.startOfDay(for: $0.startedAt) })
        guard !days.isEmpty else { return 0 }

        var cursor = calendar.startOfDay(for: .now)
        if !days.contains(cursor) {
            guard let yesterday = calendar.date(byAdding: .day, value: -1, to: cursor),
                  days.contains(yesterday) else { return 0 }
            cursor = yesterday
        }

        var streak = 0
        while days.contains(cursor) {
            streak += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: cursor) else { break }
            cursor = previous
        }
        return streak
    }

    private var weeklyVolumeCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                EyebrowText("WEEKLY VOLUME")
                Spacer()
                InlineLink(title: "View →", action: onOpenStats)
            }
            HomeVolumeBars(volumes: weeklyVolumes)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .card(radius: 22)
    }

    private var weeklyVolumes: [Double] {
        let calendar = mondayCalendar
        guard let currentWeekStart = calendar.dateInterval(of: .weekOfYear, for: .now)?.start else {
            return Array(repeating: 0, count: 6)
        }
        return (0..<6).map { index in
            guard let weekStart = calendar.date(
                byAdding: .weekOfYear, value: index - 5, to: currentWeekStart
            ), let week = calendar.dateInterval(of: .weekOfYear, for: weekStart) else {
                return 0
            }
            return store.workouts
                .filter { week.contains($0.startedAt) }
                .reduce(0) { $0 + $1.totalVolume }
        }
    }

    private var coachInsightCard: some View {
        Button(action: onOpenCoach) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    Image(systemName: "bubble.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.accentBlue)
                    Text("COACH INSIGHT")
                        .font(Theme.mono(11, .bold))
                        .kerning(1)
                        .foregroundStyle(Theme.accentBlue)
                }
                Text(coachInsight)
                    .font(Theme.font(14))
                    .foregroundStyle(Theme.inkSecondary)
                    .lineSpacing(4)
                    .multilineTextAlignment(.leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(18)
            .tintedCard(radius: 22)
        }
        .buttonStyle(.plain)
    }

    private var coachInsight: String {
        if let first = InsightCache.read()?.first, !first.isEmpty {
            return first
        }
        return "Log a few workouts and your coach will start spotting trends."
    }

    private var recentWorkouts: [LocalWorkout] {
        Array(store.workouts.filter { $0.endedAt != nil }.prefix(3))
    }

    @ViewBuilder
    private var recentWorkoutsSection: some View {
        if recentWorkouts.isEmpty {
            Text("No workouts yet.")
                .font(Theme.font(13))
                .foregroundStyle(Theme.muted)
                .lineSpacing(3)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 14)
                .padding(.horizontal, 16)
                .card(radius: 18)
        } else {
            VStack(spacing: 10) {
                ForEach(recentWorkouts) { workout in
                    HomeRecentWorkoutRow(
                        title: workout.name ?? "Workout",
                        subtitle: subtitle(for: workout),
                        action: onOpenHistory
                    )
                }
            }
        }
    }

    private func subtitle(for workout: LocalWorkout) -> String {
        var parts = [Formatting.relativeDay(workout.startedAt)]
        if let gymName = store.gym(id: workout.gymId)?.name {
            parts.append(gymName)
        }
        let count = workout.exercises.count
        parts.append(count == 1 ? "1 exercise" : "\(count) exercises")
        return parts.joined(separator: " · ")
    }
}

private struct HomeStatColumn: View {
    let value: String
    let caption: String
    var isAccent = false

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(Theme.font(24, .heavy))
                .foregroundStyle(isAccent ? Theme.accentBlue : Theme.ink)
            Text(caption)
                .font(Theme.font(12))
                .foregroundStyle(Theme.muted2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct HomeVolumeBars: View {
    let volumes: [Double]

    private static let chartHeight: CGFloat = 72

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            ForEach(Array(volumes.enumerated()), id: \.offset) { index, volume in
                RoundedRectangle(cornerRadius: 5, style: .continuous)
                    .fill(index >= volumes.count - 2 ? Theme.accentBlue : Theme.chartMuted)
                    .frame(maxWidth: .infinity)
                    .frame(height: barHeight(volume))
            }
        }
        .frame(height: Self.chartHeight, alignment: .bottom)
        .frame(maxWidth: .infinity)
    }

    private func barHeight(_ volume: Double) -> CGFloat {
        let maxVolume = volumes.max() ?? 0
        guard volume > 0, maxVolume > 0 else { return 4 }
        return max(4, Self.chartHeight * CGFloat(volume / maxVolume))
    }
}

private struct HomeRecentWorkoutRow: View {
    let title: String
    let subtitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(Theme.font(15, .bold))
                        .foregroundStyle(Theme.ink)
                    Text(subtitle)
                        .font(Theme.font(12))
                        .foregroundStyle(Theme.muted2)
                }
                Spacer(minLength: 0)
                Text("›")
                    .font(Theme.font(18))
                    .foregroundStyle(Color(hex: 0xC4C9CF))
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 16)
            .card(radius: 18)
        }
        .buttonStyle(.plain)
    }
}
