import SwiftUI

struct ResumeBanner: View {
    var workoutName: String
    var gymName: String?
    var startedAt: Date
    var exerciseCount: Int
    var onResume: () -> Void

    var body: some View {
        Button(action: onResume) {
            HStack(spacing: 11) {
                StatusDot(color: Theme.positive)
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(workoutName) · in progress")
                        .font(Theme.font(14, .bold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                    TimelineView(.periodic(from: .now, by: 1)) { context in
                        Text(subtitle(at: context.date))
                            .font(Theme.font(11))
                            .foregroundStyle(Color(hex: 0x7E879A))
                            .monospacedDigit()
                    }
                }
                Spacer(minLength: 8)
                Text("Resume")
                    .font(Theme.font(12, .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Theme.accentBlue, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
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
        parts.append(Formatting.elapsed(date.timeIntervalSince(startedAt)))
        parts.append("\(exerciseCount) exercise\(exerciseCount == 1 ? "" : "s")")
        return parts.joined(separator: " · ")
    }
}
