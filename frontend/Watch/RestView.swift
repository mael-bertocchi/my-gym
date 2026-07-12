import SwiftUI

struct RestView: View {
    @Environment(WatchSessionStore.self) private var mirror

    let session: WorkoutSessionState
    let rest: WorkoutSessionState.Rest
    let now: Date

    var body: some View {
        VStack(spacing: 6) {
            HStack {
                SessionEyebrow(text: rest.eyebrow, color: SessionPalette.accent, size: 8, kerning: 1)
                Spacer(minLength: 0)
            }
            ZStack {
                SessionRing(progress: rest.progress(at: now), lineWidth: 6)
                    .animation(.linear(duration: 0.5), value: rest.progress(at: now))
                VStack(spacing: 1) {
                    Text(Formatting.countdown(rest.remainingSeconds(at: now)))
                        .font(SessionPalette.mono(36, .bold))
                        .foregroundStyle(SessionPalette.ink)
                        .contentTransition(.numericText(countsDown: true))
                    if let next = session.target?.exerciseName {
                        Text("Next · \(next)")
                            .font(SessionPalette.font(9))
                            .foregroundStyle(SessionPalette.inkSecondary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                            .frame(maxWidth: 84)
                    }
                }
            }
            .frame(width: 120, height: 120)
            .frame(maxHeight: .infinity)
            HStack(spacing: 5) {
                restButton("−15", flex: 1) {
                    WatchHaptics.play(.click)
                    mirror.send(.adjustRest(seconds: -15))
                }
                restButton("+15", flex: 1) {
                    WatchHaptics.play(.click)
                    mirror.send(.adjustRest(seconds: 15))
                }
                Button {
                    WatchHaptics.play(.click)
                    mirror.send(.skipRest)
                } label: {
                    Text("Skip")
                        .font(SessionPalette.font(11.5, .bold))
                        .foregroundStyle(SessionPalette.onAccent)
                        .frame(maxWidth: .infinity)
                        .frame(height: 34)
                        .background(SessionPalette.accent, in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 4)
        .padding(.bottom, 2)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SessionPalette.restBackground.ignoresSafeArea())
    }

    private func restButton(_ title: String, flex: CGFloat, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(SessionPalette.mono(11, .bold))
                .foregroundStyle(SessionPalette.inkSecondary)
                .frame(width: 53, height: 34)
                .background(SessionPalette.control, in: Capsule())
        }
        .buttonStyle(.plain)
    }
}
