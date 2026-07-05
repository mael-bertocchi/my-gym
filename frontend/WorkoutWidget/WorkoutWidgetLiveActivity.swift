import ActivityKit
import SwiftUI
import WidgetKit

struct WorkoutWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            LockScreenView(state: context.state)
                .padding(16)
                .activityBackgroundTint(Color.black.opacity(0.55))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label {
                        Text(context.state.workoutName).lineLimit(1)
                    } icon: {
                        Image(systemName: "dumbbell.fill")
                    }
                    .font(.headline)
                    .foregroundStyle(.green)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    elapsed(context.state)
                        .font(.title3.monospacedDigit())
                        .foregroundStyle(context.state.pausedAt == nil ? .white : .secondary)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if let endsAt = restEnd(context.state) {
                        restBar(endsAt: endsAt)
                    } else {
                        Text(summary(context.state))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            } compactLeading: {
                Image(systemName: "dumbbell.fill").foregroundStyle(.green)
            } compactTrailing: {
                if let endsAt = restEnd(context.state) {
                    Text(timerInterval: Date.now...endsAt, countsDown: true)
                        .monospacedDigit()
                        .foregroundStyle(.green)
                        .frame(width: 48)
                } else {
                    elapsed(context.state)
                        .monospacedDigit()
                        .frame(width: 48)
                }
            } minimal: {
                Image(systemName: "dumbbell.fill").foregroundStyle(.green)
            }
            .widgetURL(URL(string: "mygym://active"))
            .keylineTint(.green)
        }
    }

    private func restEnd(_ state: WorkoutActivityAttributes.ContentState) -> Date? {
        guard state.pausedAt == nil, let endsAt = state.restEndsAt, endsAt > Date.now else { return nil }
        return endsAt
    }

    private func elapsed(_ state: WorkoutActivityAttributes.ContentState) -> Text {
        Text(timerInterval: state.timerStart...Date.distantFuture, pauseTime: state.pausedAt, countsDown: false)
    }

    private func summary(_ state: WorkoutActivityAttributes.ContentState) -> String {
        let exercises = "\(state.exerciseCount) exercise\(state.exerciseCount == 1 ? "" : "s")"
        return "\(state.completedSets)/\(state.totalSets) sets · \(exercises)"
    }

    private func restBar(endsAt: Date) -> some View {
        ProgressView(timerInterval: Date.now...endsAt) {
            EmptyView()
        } currentValueLabel: {
            HStack {
                Text("Rest").foregroundStyle(.secondary)
                Spacer()
                Text(timerInterval: Date.now...endsAt, countsDown: true).monospacedDigit()
            }
            .font(.subheadline)
        }
        .tint(.green)
    }
}

private struct LockScreenView: View {
    let state: WorkoutActivityAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Label {
                    Text(state.workoutName).lineLimit(1)
                } icon: {
                    Image(systemName: "dumbbell.fill")
                }
                .font(.headline)
                .foregroundStyle(.green)
                Spacer(minLength: 8)
                Text(timerInterval: state.timerStart...Date.distantFuture, pauseTime: state.pausedAt, countsDown: false)
                    .font(.title2.monospacedDigit())
                    .foregroundStyle(state.pausedAt == nil ? .primary : .secondary)
            }

            if state.pausedAt == nil, let endsAt = state.restEndsAt, endsAt > Date.now {
                ProgressView(timerInterval: Date.now...endsAt) {
                    EmptyView()
                } currentValueLabel: {
                    HStack {
                        Text("Rest").foregroundStyle(.secondary)
                        Spacer()
                        Text(timerInterval: Date.now...endsAt, countsDown: true).monospacedDigit()
                    }
                    .font(.subheadline)
                }
                .tint(.green)
            } else {
                HStack(spacing: 12) {
                    Text("\(state.completedSets)/\(state.totalSets) sets")
                    Text("\(state.exerciseCount) exercise\(state.exerciseCount == 1 ? "" : "s")")
                    Spacer()
                    if state.pausedAt != nil {
                        Text("Paused").foregroundStyle(.orange)
                    }
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
        }
    }
}
