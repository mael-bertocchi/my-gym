import SwiftUI

struct HomeView: View {
    var onOpenCoach: () -> Void = {}
    var onOpenStats: () -> Void = {}
    var onOpenHistory: () -> Void = {}
    var onStartWorkout: () -> Void = {}

    @Environment(ApplicationSession.self) private var session
    @Environment(LocalStore.self) private var store

    @State private var showProfile = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    headerRow
                        .padding(.bottom, 24)

                    thisWeekCard
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
            .toolbar(.hidden, for: .navigationBar)
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
            .accessibilityLabel("Profile")
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
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .card()
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

    private var coachInsightCard: some View {
        Button(action: onOpenCoach) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    Image(systemName: "bubble.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.accentBlue)
                    EyebrowText("COACH INSIGHT", color: Theme.accentBlue)
                }
                Text(coachInsight)
                    .font(Theme.font(14))
                    .foregroundStyle(Theme.inkSecondary)
                    .lineSpacing(4)
                    .multilineTextAlignment(.leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(18)
            .tintedCard()
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
            VStack(alignment: .leading, spacing: 12) {
                Text("No workouts yet. Your three latest sessions will show up here.")
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.muted)
                    .lineSpacing(3)
                InlineLink(title: "Start your first workout", systemImage: "plus", action: onStartWorkout)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 14)
            .padding(.horizontal, 16)
            .card()
        } else {
            VStack(spacing: 10) {
                ForEach(recentWorkouts) { workout in
                    NavigationLink {
                        HistoryWorkoutDetailView(workoutId: workout.id)
                    } label: {
                        HomeRecentWorkoutRow(
                            title: workout.name ?? "Workout",
                            subtitle: subtitle(for: workout)
                        )
                    }
                    .buttonStyle(.plain)
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

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(Theme.font(24, .heavy))
                .foregroundStyle(Theme.ink)
            Text(caption)
                .font(Theme.font(12))
                .foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

private struct HomeRecentWorkoutRow: View {
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(Theme.font(15, .bold))
                    .foregroundStyle(Theme.ink)
                Text(subtitle)
                    .font(Theme.font(12))
                    .foregroundStyle(Theme.muted)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Theme.tabInactive)
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 16)
        .card()
        .contentShape(Rectangle())
    }
}
