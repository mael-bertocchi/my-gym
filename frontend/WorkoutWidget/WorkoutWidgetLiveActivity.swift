import ActivityKit
import SwiftUI
import WidgetKit

private typealias WorkoutState = WorkoutActivityAttributes.ContentState

private func isResting(_ state: WorkoutState) -> Bool {
    guard state.pausedAt == nil, let endsAt = state.restEndsAt, endsAt > .now else { return false }
    return true
}

private func restEnd(_ state: WorkoutState) -> Date? {
    isResting(state) ? state.restEndsAt : nil
}

private func exerciseTitle(_ state: WorkoutState) -> String {
    state.exerciseName ?? state.workoutName
}

private func currentSet(_ state: WorkoutState) -> Int {
    state.totalSets > 0 ? min(state.completedSets + 1, state.totalSets) : state.completedSets + 1
}

private func setProgress(_ state: WorkoutState) -> String {
    "\(state.completedSets)/\(state.totalSets)"
}

private func elapsedText(_ state: WorkoutState) -> Text {
    Text(timerInterval: state.timerStart...Date.distantFuture, pauseTime: state.pausedAt, countsDown: false)
}

struct WorkoutWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            LockScreenView(state: context.state)
                .padding(16)
                .activityBackgroundTint(Color.black.opacity(0.55))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            let state = context.state
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        Image(systemName: "dumbbell.fill")
                            .font(WidgetTheme.font(13, .semibold))
                            .foregroundStyle(WidgetTheme.accentBlue)
                        elapsedText(state)
                            .font(WidgetTheme.mono(15, .bold))
                            .foregroundStyle(state.pausedAt == nil ? WidgetTheme.ink : WidgetTheme.muted)
                            .fixedSize()
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    IslandStatus(state: state)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    IslandBottom(state: state)
                }
            } compactLeading: {
                Image(systemName: "dumbbell.fill")
                    .foregroundStyle(WidgetTheme.accentBlue)
            } compactTrailing: {
                if let endsAt = restEnd(state) {
                    Text(timerInterval: Date.now...endsAt, countsDown: true)
                        .font(WidgetTheme.mono(13, .semibold))
                        .foregroundStyle(WidgetTheme.accentBlueSoft)
                        .frame(width: 44)
                } else {
                    elapsedText(state)
                        .font(WidgetTheme.mono(13, .semibold))
                        .foregroundStyle(state.pausedAt == nil ? WidgetTheme.ink : WidgetTheme.warning)
                        .frame(width: 44)
                }
            } minimal: {
                Image(systemName: "dumbbell.fill")
                    .foregroundStyle(isResting(state) ? WidgetTheme.accentBlueSoft : WidgetTheme.accentBlue)
            }
            .widgetURL(URL(string: "mygym://active"))
            .keylineTint(WidgetTheme.accentBlue)
        }
    }
}

private struct SetPips: View {
    let completed: Int
    let total: Int
    var empty: Color = WidgetTheme.hairline
    var height: CGFloat = 6

    var body: some View {
        let capped = max(1, min(total, 20))
        let done = max(0, min(completed, capped))
        HStack(spacing: 3) {
            ForEach(0..<capped, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(index < done ? WidgetTheme.accentBlue : empty)
                    .frame(maxWidth: .infinity)
                    .frame(height: height)
            }
        }
    }
}

private struct IslandStatus: View {
    let state: WorkoutState

    var body: some View {
        if let endsAt = restEnd(state) {
            Text(timerInterval: Date.now...endsAt, countsDown: true)
                .font(WidgetTheme.mono(15, .bold))
                .foregroundStyle(WidgetTheme.accentBlueSoft)
                .fixedSize()
        } else if state.pausedAt != nil {
            Text("PAUSED")
                .font(WidgetTheme.mono(11, .semibold)).kerning(1)
                .foregroundStyle(WidgetTheme.warning)
        } else {
            Text("\(setProgress(state)) sets")
                .font(WidgetTheme.mono(13, .semibold))
                .foregroundStyle(WidgetTheme.inkSecondary)
                .fixedSize()
        }
    }
}

private struct IslandBottom: View {
    let state: WorkoutState

    var body: some View {
        if let endsAt = restEnd(state) {
            VStack(spacing: 8) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(exerciseTitle(state))
                        .font(WidgetTheme.font(15, .semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Spacer(minLength: 8)
                    Text("RESTING")
                        .font(WidgetTheme.mono(9, .semibold)).kerning(1.2)
                        .foregroundStyle(WidgetTheme.accentBlueSoft)
                        .fixedSize()
                }
                ProgressView(timerInterval: Date.now...endsAt) {
                    EmptyView()
                } currentValueLabel: {
                    EmptyView()
                }
                .tint(WidgetTheme.accentBlue)
                SetPips(completed: state.completedSets, total: state.totalSets, empty: .white.opacity(0.16))
            }
        } else if state.pausedAt != nil {
            HStack(spacing: 9) {
                Circle().fill(WidgetTheme.warning).frame(width: 8, height: 8)
                Text("Paused on \(exerciseTitle(state))")
                    .font(WidgetTheme.font(14, .semibold))
                    .foregroundStyle(WidgetTheme.warning)
                    .lineLimit(1)
                Spacer(minLength: 8)
                Text("Tap to resume")
                    .font(WidgetTheme.font(12))
                    .foregroundStyle(WidgetTheme.muted2)
                    .fixedSize()
            }
        } else {
            VStack(spacing: 8) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(exerciseTitle(state))
                        .font(WidgetTheme.font(15, .semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    if let detail = state.setDetail {
                        Spacer(minLength: 8)
                        Text(detail)
                            .font(WidgetTheme.mono(12))
                            .foregroundStyle(.white.opacity(0.7))
                            .fixedSize()
                    }
                }
                HStack(spacing: 10) {
                    SetPips(completed: state.completedSets, total: state.totalSets, empty: .white.opacity(0.16))
                    Text(setProgress(state))
                        .font(WidgetTheme.mono(11, .semibold))
                        .foregroundStyle(.white.opacity(0.6))
                        .fixedSize()
                }
            }
        }
    }
}

private struct LockScreenView: View {
    let state: WorkoutState

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header
            Rectangle().fill(WidgetTheme.hairline).frame(height: 1)
            body(for: state)
        }
    }

    private var header: some View {
        HStack(spacing: 8) {
            Image(systemName: "dumbbell.fill")
                .font(WidgetTheme.font(13, .semibold))
                .foregroundStyle(state.pausedAt == nil ? WidgetTheme.accentBlue : WidgetTheme.muted)
            Text(state.workoutName)
                .font(WidgetTheme.font(15, .semibold))
                .foregroundStyle(state.pausedAt == nil ? WidgetTheme.ink : WidgetTheme.muted)
                .lineLimit(1)
            if state.pausedAt == nil {
                Circle().fill(WidgetTheme.positive).frame(width: 7, height: 7)
            }
            Spacer(minLength: 12)
            VStack(alignment: .trailing, spacing: 1) {
                Text(state.pausedAt == nil ? "ELAPSED" : "PAUSED")
                    .font(WidgetTheme.mono(9, .semibold)).kerning(1)
                    .foregroundStyle(state.pausedAt == nil ? WidgetTheme.muted2 : WidgetTheme.warning)
                elapsedText(state)
                    .font(WidgetTheme.mono(16, .bold))
                    .foregroundStyle(state.pausedAt == nil ? WidgetTheme.ink : WidgetTheme.muted2)
                    .fixedSize()
            }
        }
    }

    @ViewBuilder
    private func body(for state: WorkoutState) -> some View {
        if let endsAt = restEnd(state) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("RESTING")
                            .font(WidgetTheme.mono(10, .semibold)).kerning(1.2)
                            .foregroundStyle(WidgetTheme.muted)
                        Text(restingSubtitle(state))
                            .font(WidgetTheme.font(13, .semibold))
                            .foregroundStyle(WidgetTheme.inkSecondary)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 8)
                    Text(timerInterval: Date.now...endsAt, countsDown: true)
                        .font(WidgetTheme.mono(24, .heavy))
                        .foregroundStyle(WidgetTheme.accentBlueSoft)
                        .fixedSize()
                }
                ProgressView(timerInterval: Date.now...endsAt) {
                    EmptyView()
                } currentValueLabel: {
                    EmptyView()
                }
                .tint(WidgetTheme.accentBlue)
            }
        } else if state.pausedAt != nil {
            HStack(spacing: 9) {
                Circle().fill(WidgetTheme.warning).frame(width: 8, height: 8)
                Text("Paused on \(exerciseTitle(state))")
                    .font(WidgetTheme.font(14, .semibold))
                    .foregroundStyle(WidgetTheme.warning)
                    .lineLimit(1)
                Spacer(minLength: 8)
                Text("Tap to resume")
                    .font(WidgetTheme.font(12))
                    .foregroundStyle(WidgetTheme.muted2)
                    .fixedSize()
            }
        } else {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(exerciseTitle(state))
                        .font(WidgetTheme.font(15, .semibold))
                        .foregroundStyle(WidgetTheme.ink)
                        .lineLimit(1)
                    if let detail = state.setDetail {
                        Spacer(minLength: 8)
                        Text(detail)
                            .font(WidgetTheme.mono(12))
                            .foregroundStyle(WidgetTheme.muted)
                            .fixedSize()
                    }
                }
                HStack(spacing: 10) {
                    SetPips(completed: state.completedSets, total: state.totalSets)
                    Text(setProgress(state))
                        .font(WidgetTheme.mono(11, .semibold))
                        .foregroundStyle(WidgetTheme.muted)
                        .fixedSize()
                }
            }
        }
    }

    private func restingSubtitle(_ state: WorkoutState) -> String {
        if state.exerciseName != nil {
            return "\(exerciseTitle(state)) · set \(currentSet(state)) of \(state.totalSets)"
        }
        return "Set \(currentSet(state)) of \(state.totalSets)"
    }
}
