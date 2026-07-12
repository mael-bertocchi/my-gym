import SwiftUI

enum SessionPalette {
    static let accent = rgb(0x5B8DEF)
    static let onAccent = rgb(0x0E0F13)
    static let positive = rgb(0x43C46E)
    static let warning = rgb(0xE9B45A)
    static let danger = rgb(0xEC6360)
    static let ink = rgb(0xEEF1F5)
    static let inkSecondary = rgb(0xC2C8D2)
    static let muted = rgb(0x8B929D)
    static let muted2 = rgb(0x656C77)
    static let control = rgb(0x2A2E37)
    static let ringTrack = rgb(0x33405C)
    static let neutralTrack = rgb(0x2C313A)
    static let tile = rgb(0x1C1F26)
    static let tint = rgb(0x1E2941)
    static let tintBorder = rgb(0x3B4A6B)
    static let restBackground = rgb(0x0E1524)
    static let card = rgb(0x1C1F26)
    static let cardBorder = Color.white.opacity(0.08)

    static func font(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight)
    }

    static func mono(_ size: CGFloat, _ weight: Font.Weight = .medium) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }

    private static func rgb(_ hex: UInt32) -> Color {
        Color(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

struct SessionEyebrow: View {
    let text: String
    var color: Color = SessionPalette.muted
    var size: CGFloat = 10
    var kerning: CGFloat = 1.5

    var body: some View {
        Text(text.uppercased())
            .font(SessionPalette.mono(size, .semibold))
            .kerning(kerning)
            .foregroundStyle(color)
    }
}

struct WorkoutLogoBadge: View {
    var size: CGFloat
    var radius: CGFloat

    var body: some View {
        Image("WorkoutLogo")
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
    }
}

struct SessionRing: View {
    var progress: Double
    var lineWidth: CGFloat
    var track: Color = SessionPalette.ringTrack
    var fill: Color = SessionPalette.accent

    var body: some View {
        ZStack {
            Circle()
                .stroke(track, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: min(1, max(0.001, progress)))
                .stroke(fill, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .padding(lineWidth / 2)
    }
}
