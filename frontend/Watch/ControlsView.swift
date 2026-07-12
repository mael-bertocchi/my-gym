import SwiftUI

struct ControlsView: View {
    @Environment(WatchSessionStore.self) private var mirror

    @State private var confirmDiscard = false

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            if let session = mirror.session {
                content(session, now: context.date)
            }
        }
    }

    private func content(_ session: WorkoutSessionState, now: Date) -> some View {
        VStack(spacing: 7) {
            HStack(spacing: 4) {
                Circle()
                    .fill(session.isPaused ? SessionPalette.warning : SessionPalette.positive)
                    .frame(width: 5, height: 5)
                Text(Formatting.elapsed(session.elapsed(at: now)))
                    .font(SessionPalette.mono(14, .bold))
                    .foregroundStyle(SessionPalette.ink)
                    .contentTransition(.numericText())
                if session.isPaused {
                    SessionEyebrow(text: "PAUSED", color: SessionPalette.warning, size: 7.5, kerning: 0.75)
                }
                Spacer(minLength: 0)
            }
            Grid(horizontalSpacing: 6, verticalSpacing: 6) {
                GridRow {
                    if session.isPaused {
                        controlTile("Resume", icon: "play.fill", iconColor: SessionPalette.positive) {
                            WatchHaptics.play(.click)
                            mirror.send(.resume)
                        }
                    } else {
                        controlTile("Pause", icon: "pause.fill", iconColor: SessionPalette.warning) {
                            WatchHaptics.play(.click)
                            mirror.send(.pause)
                        }
                    }
                    controlTile("Finish", icon: "checkmark", iconColor: SessionPalette.accent, highlighted: true) {
                        WatchHaptics.play(.success)
                        mirror.send(.finish)
                    }
                }
                GridRow {
                    controlTile("Discard", icon: "xmark", iconColor: SessionPalette.danger) {
                        confirmDiscard = true
                    }
                    controlTile("iPhone", icon: "iphone", iconColor: SessionPalette.muted) {
                        WatchHaptics.play(.click)
                        mirror.send(.openPhone)
                    }
                }
            }
            .frame(maxHeight: .infinity)
        }
        .padding(.horizontal, 4)
        .padding(.bottom, 2)
        .alert("Discard workout?", isPresented: $confirmDiscard) {
            Button("Cancel", role: .cancel) {}
            Button("Discard", role: .destructive) {
                mirror.send(.discard)
            }
        } message: {
            Text("This cannot be undone.")
        }
    }

    private func controlTile(
        _ title: String,
        icon: String,
        iconColor: Color,
        highlighted: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(iconColor)
                Text(title)
                    .font(SessionPalette.font(11, .semibold))
                    .foregroundStyle(SessionPalette.ink)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(
                highlighted ? SessionPalette.tint : SessionPalette.tile,
                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
            )
            .overlay {
                if highlighted {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(SessionPalette.tintBorder, lineWidth: 1)
                }
            }
        }
        .buttonStyle(.plain)
    }
}
