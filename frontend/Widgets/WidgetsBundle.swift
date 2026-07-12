import ActivityKit
import SwiftUI
import WidgetKit

@main
struct WidgetsBundle: WidgetBundle {
    var body: some Widget {
        WorkoutLiveActivity()
    }
}

struct WorkoutLiveActivity: Widget {
    private static let deepLink = URL(string: "mygym://active")

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            WorkoutLockScreenView(state: context.state.session, isStale: context.isStale)
                .activityBackgroundTint(SessionPalette.card.opacity(0.94))
                .activitySystemActionForegroundColor(SessionPalette.ink)
                .widgetURL(Self.deepLink)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    ExpandedElapsedView(state: context.state.session)
                        .widgetURL(Self.deepLink)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ExpandedHeartView(state: context.state.session)
                        .widgetURL(Self.deepLink)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ExpandedBottomView(state: context.state.session, isStale: context.isStale)
                        .widgetURL(Self.deepLink)
                }
            } compactLeading: {
                WorkoutLogoBadge(size: 18, radius: 5)
                    .widgetURL(Self.deepLink)
            } compactTrailing: {
                CompactTrailingView(state: context.state.session, isStale: context.isStale)
                    .widgetURL(Self.deepLink)
            } minimal: {
                MinimalRingView(state: context.state.session, isStale: context.isStale)
                    .widgetURL(Self.deepLink)
            }
            .keylineTint(SessionPalette.accent)
        }
    }
}
