import SwiftUI

struct ResumeBanner: View {
    var workoutName: String
    var gymName: String?
    var isPaused: Bool
    var exerciseCount: Int
    var elapsed: (Date) -> TimeInterval
    var restRemaining: () -> Int? = { nil }
    var onResume: () -> Void

    var body: some View {
        Button(action: onResume) {
            HStack(spacing: 11) {
                StatusDot(color: isPaused ? Theme.warning : Theme.positive)
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(workoutName) · \(isPaused ? "paused" : "in progress")")
                        .font(Theme.font(14, .bold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                    TimelineView(.periodic(from: .now, by: 1)) { context in
                        Text(subtitle(at: context.date))
                            .font(Theme.font(11))
                            .foregroundStyle(Theme.muted2)
                            .monospacedDigit()
                    }
                }
                Spacer(minLength: 8)
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .liquidGlass(radius: 16)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Resume \(workoutName)")
    }

    private func subtitle(at date: Date) -> String {
        var parts: [String] = []
        if let gymName {
            parts.append(gymName)
        }
        parts.append(Formatting.elapsed(elapsed(date)))
        parts.append("\(exerciseCount) exercise\(exerciseCount == 1 ? "" : "s")")
        if !isPaused, let remaining = restRemaining(), remaining > 0 {
            parts.append("rest \(Formatting.countdown(remaining))")
        }
        return parts.joined(separator: " · ")
    }
}
