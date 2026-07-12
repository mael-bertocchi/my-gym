import SwiftUI

struct PRCelebrationView: View {
    @Environment(WatchSessionStore.self) private var mirror

    let record: WorkoutSessionState.PersonalRecord

    var body: some View {
        VStack(spacing: 5) {
            Image(systemName: "star.fill")
                .font(.system(size: 34, weight: .bold))
                .foregroundStyle(SessionPalette.accent)
                .padding(.bottom, 3)
            Text("New Personal Record")
                .font(SessionPalette.font(16, .bold))
                .foregroundStyle(SessionPalette.ink)
                .multilineTextAlignment(.center)
            Text(record.exerciseName)
                .font(SessionPalette.font(12))
                .foregroundStyle(SessionPalette.inkSecondary)
                .lineLimit(1)
            Text(record.valueLine)
                .font(SessionPalette.mono(22, .bold))
                .foregroundStyle(SessionPalette.accent)
            Button {
                mirror.dismissPersonalRecord()
            } label: {
                Text("Nice")
                    .font(SessionPalette.font(12, .bold))
                    .foregroundStyle(SessionPalette.ink)
                    .padding(.vertical, 8)
                    .padding(.horizontal, 24)
                    .background(SessionPalette.tint, in: Capsule())
                    .overlay(
                        Capsule().strokeBorder(SessionPalette.tintBorder, lineWidth: 1)
                    )
            }
            .buttonStyle(.plain)
            .padding(.top, 7)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.ignoresSafeArea())
    }
}
