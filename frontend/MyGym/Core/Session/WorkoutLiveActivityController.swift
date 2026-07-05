import ActivityKit
import Foundation

@MainActor
final class WorkoutLiveActivityController {
    private var activity: Activity<WorkoutActivityAttributes>?
    private var lastState: WorkoutActivityAttributes.ContentState?

    func sync(_ state: WorkoutActivityAttributes.ContentState?) {
        guard let state else {
            end()
            return
        }
        guard isEnabled else { return }
        if activity == nil {
            activity = Activity<WorkoutActivityAttributes>.activities.first
        }
        if let activity {
            guard state != lastState else { return }
            let content = ActivityContent(state: state, staleDate: nil)
            Task { await activity.update(content) }
        } else {
            activity = try? Activity.request(
                attributes: WorkoutActivityAttributes(),
                content: ActivityContent(state: state, staleDate: nil)
            )
        }
        lastState = state
    }

    private func end() {
        let existing = activity ?? Activity<WorkoutActivityAttributes>.activities.first
        activity = nil
        lastState = nil
        guard let existing else { return }
        Task { await existing.end(nil, dismissalPolicy: .immediate) }
    }

    private var isEnabled: Bool {
        #if DEBUG
        if CommandLine.arguments.contains("-demo") || CommandLine.arguments.contains("-demo-empty") {
            return false
        }
        #endif
        return ActivityAuthorizationInfo().areActivitiesEnabled
    }
}
