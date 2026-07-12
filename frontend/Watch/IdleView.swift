import SwiftUI

struct IdleView: View {
    @Environment(WatchSessionStore.self) private var mirror

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            VStack(alignment: .leading, spacing: 3) {
                Text("No active workout")
                    .font(SessionPalette.font(15, .bold))
                    .foregroundStyle(SessionPalette.ink)
                Text("Sessions sync live from your iPhone.")
                    .font(SessionPalette.font(10.5))
                    .foregroundStyle(SessionPalette.muted)
                    .lineSpacing(2)
            }
            .frame(maxHeight: .infinity, alignment: .center)
            WatchPillButton(title: mirror.isStartingWorkout ? "Starting…" : "Start workout", style: .accent) {
                WatchHaptics.play(.click)
                mirror.startWorkout()
            }
            .disabled(mirror.isStartingWorkout)
            .opacity(mirror.isStartingWorkout ? 0.6 : 1)
        }
        .padding(.horizontal, 4)
        .padding(.bottom, 2)
    }
}
