import SwiftUI

struct RestTimerBar: View {
    let timer: ActiveWorkoutStore.RestTimer
    var eyebrow = "REST"
    var onAdjust: (Int) -> Void
    var onSkip: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .stroke(Theme.chartSoft, lineWidth: 2.5)
                Circle()
                    .trim(from: 0, to: min(1, max(0.02, timer.progress)))
                    .stroke(Theme.accentBlue, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }
            .frame(width: 30, height: 30)

            VStack(alignment: .leading, spacing: 2) {
                EyebrowText(eyebrow, color: Theme.muted, size: 10)
                    .lineLimit(1)
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
                        .foregroundStyle(Theme.onAccent)
                        .fixedSize()
                        .padding(.vertical, 7)
                        .padding(.horizontal, 13)
                        .background(Theme.accentBlue, in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous))
                        .expandedTapTarget(vertical: 8, horizontal: 3)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Skip rest")
            }
        }
        .padding(.vertical, 11)
        .padding(.horizontal, 18)
        .frame(maxWidth: .infinity)
        .background(Theme.restBarFill)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Theme.hairline).frame(height: 1)
        }
    }

    private func adjustChip(_ title: String, delta: Int) -> some View {
        Button {
            onAdjust(delta)
        } label: {
            Text(title)
                .font(Theme.mono(12, .bold))
                .foregroundStyle(Theme.inkSecondary)
                .fixedSize()
                .padding(.vertical, 7)
                .padding(.horizontal, 11)
                .background(Theme.surface, in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
                        .strokeBorder(Theme.fieldBorder, lineWidth: 1)
                )
                .expandedTapTarget(vertical: 8, horizontal: 3)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(delta < 0 ? "Reduce rest by 15 seconds" : "Extend rest by 15 seconds")
    }
}
