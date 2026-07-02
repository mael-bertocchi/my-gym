import SwiftUI

struct CardBackground: ViewModifier {
    var radius: CGFloat = Theme.cardRadius
    var fill: Color = Theme.surface
    var border: Color = Theme.hairline

    func body(content: Content) -> some View {
        content
            .background(fill, in: RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .strokeBorder(border, lineWidth: 1)
            )
    }
}

struct LiquidGlassBackground: ViewModifier {
    var radius: CGFloat = Theme.cardRadius
    var blueTinted = false

    func body(content: Content) -> some View {
        content
            .background {
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: radius, style: .continuous)
                            .fill(Color.white.opacity(0.75))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: radius, style: .continuous)
                            .fill(blueTinted ? Theme.accentBlue.opacity(0.06) : Color.clear)
                    )
            }
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .strokeBorder(Color.white.opacity(0.85), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.10), radius: 18, y: 8)
    }
}

extension View {
    func card(
        radius: CGFloat = Theme.cardRadius,
        fill: Color = Theme.surface,
        border: Color = Theme.hairline
    ) -> some View {
        modifier(CardBackground(radius: radius, fill: fill, border: border))
    }

    func tintedCard(radius: CGFloat = Theme.cardRadius) -> some View {
        modifier(CardBackground(radius: radius, fill: Theme.accentBlueTint, border: Theme.accentBlueTintBorder))
    }

    func liquidGlass(radius: CGFloat = Theme.cardRadius, blueTinted: Bool = false) -> some View {
        modifier(LiquidGlassBackground(radius: radius, blueTinted: blueTinted))
    }
}

struct EyebrowText: View {
    let text: String
    var color: Color = Theme.muted2
    var size: CGFloat = 11

    init(_ text: String, color: Color = Theme.muted2, size: CGFloat = 11) {
        self.text = text
        self.color = color
        self.size = size
    }

    var body: some View {
        Text(text.uppercased())
            .font(Theme.mono(size, .semibold))
            .kerning(1)
            .foregroundStyle(color)
    }
}

struct SectionLabel: View {
    let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        EyebrowText(text)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct StatusDot: View {
    var color: Color
    var size: CGFloat = 8

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: size, height: size)
    }
}

struct RowDivider: View {
    var body: some View {
        Rectangle()
            .fill(Theme.divider)
            .frame(height: 1)
    }
}
