import SwiftUI

struct RestTimerBar: View {
    let timer: ActiveWorkoutStore.RestTimer
    var onAdjust: (Int) -> Void
    var onSkip: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .stroke(Color(hex: 0xBCD2F5), lineWidth: 2.5)
                Circle()
                    .trim(from: 0, to: min(1, max(0.02, timer.progress)))
                    .stroke(Theme.accentBlue, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }
            .frame(width: 30, height: 30)

            VStack(alignment: .leading, spacing: 2) {
                EyebrowText("REST", color: Color(hex: 0x7E879A), size: 10)
                Text(Formatting.countdown(timer.remainingSeconds))
                    .font(Theme.mono(18, .bold))
                    .foregroundStyle(Theme.ink)
            }

            Spacer(minLength: 8)

            HStack(spacing: 7) {
                adjustChip("−15", delta: -15)
                adjustChip("+15", delta: 15)
                Button(action: onSkip) {
                    Text("Skip")
                        .font(Theme.font(12, .bold))
                        .foregroundStyle(.white)
                        .padding(.vertical, 7)
                        .padding(.horizontal, 13)
                        .background(Theme.accentBlue, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 11)
        .padding(.horizontal, 18)
        .frame(maxWidth: .infinity)
        .liquidGlass(radius: 0, blueTinted: true)
    }

    private func adjustChip(_ title: String, delta: Int) -> some View {
        Button {
            onAdjust(delta)
        } label: {
            Text(title)
                .font(Theme.mono(12, .bold))
                .foregroundStyle(Theme.inkSecondary)
                .padding(.vertical, 7)
                .padding(.horizontal, 11)
                .background(Color.white.opacity(0.65), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.9), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}
