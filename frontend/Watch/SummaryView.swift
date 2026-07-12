import SwiftUI

struct SummaryView: View {
    @Environment(WatchSessionStore.self) private var mirror

    let summary: WorkoutSessionSummary

    var body: some View {
        VStack(spacing: 7) {
            VStack(alignment: .leading, spacing: 1) {
                Text("Workout complete")
                    .font(SessionPalette.font(13, .bold))
                    .foregroundStyle(SessionPalette.ink)
                SessionEyebrow(
                    text: "\(summary.name) · \(Formatting.monoDate(summary.endedAt))",
                    color: SessionPalette.muted2,
                    size: 7.5,
                    kerning: 1
                )
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Grid(horizontalSpacing: 6, verticalSpacing: 6) {
                GridRow {
                    WatchStatTile(
                        value: Formatting.elapsed(TimeInterval(summary.durationSeconds)),
                        label: "DURATION"
                    )
                    WatchStatTile(
                        value: "\(summary.sets)",
                        label: "SETS"
                    )
                }
                GridRow {
                    WatchStatTile(
                        value: Formatting.compactVolume(summary.volumeKg),
                        label: "KG VOLUME"
                    )
                    WatchStatTile(
                        value: "\(summary.records)",
                        label: "RECORDS",
                        highlighted: true,
                        labelColor: SessionPalette.accent,
                        starred: true
                    )
                }
            }
            .frame(maxHeight: .infinity)
            WatchPillButton(title: "Rate on iPhone", style: .tinted, height: 38, fontSize: 12) {
                WatchHaptics.play(.click)
                mirror.dismissSummary()
            }
        }
        .padding(.horizontal, 4)
        .padding(.bottom, 2)
    }
}
