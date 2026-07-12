import SwiftUI
import WatchKit

enum WatchLayout {
    static let isCompact = WKInterfaceDevice.current().screenBounds.height < 235
}

struct WatchPillButton: View {
    enum Style {
        case accent
        case positive
        case tinted
        case control
    }

    var title: String
    var style: Style = .accent
    var systemImage: String?
    var height: CGFloat = 40
    var fontSize: CGFloat = 13
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: fontSize - 2.5, weight: .bold))
                }
                Text(title)
                    .font(SessionPalette.font(fontSize, .bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .foregroundStyle(foreground)
            .frame(maxWidth: .infinity)
            .frame(height: height)
            .background(background, in: Capsule())
            .overlay {
                if case .tinted = style {
                    Capsule().strokeBorder(SessionPalette.tintBorder, lineWidth: 1)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private var foreground: Color {
        switch style {
        case .accent, .positive: SessionPalette.onAccent
        case .tinted: SessionPalette.ink
        case .control: SessionPalette.inkSecondary
        }
    }

    private var background: Color {
        switch style {
        case .accent: SessionPalette.accent
        case .positive: SessionPalette.positive
        case .tinted: SessionPalette.tint
        case .control: SessionPalette.control
        }
    }
}

struct WatchStatTile: View {
    var value: String
    var label: String
    var icon: String?
    var iconColor: Color = SessionPalette.danger
    var highlighted = false
    var labelColor: Color = SessionPalette.muted2
    var starred = false
    var radius: CGFloat = 14

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(iconColor)
                }
                if starred {
                    Image(systemName: "star.fill")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(SessionPalette.accent)
                }
                Text(value)
                    .font(SessionPalette.mono(15, .bold))
                    .foregroundStyle(SessionPalette.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .contentTransition(.numericText())
            }
            Text(label)
                .font(SessionPalette.mono(7.5, .medium))
                .kerning(1)
                .foregroundStyle(labelColor)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .background(
            highlighted ? SessionPalette.tint : SessionPalette.tile,
            in: RoundedRectangle(cornerRadius: radius, style: .continuous)
        )
        .overlay {
            if highlighted {
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .strokeBorder(SessionPalette.tintBorder, lineWidth: 1)
            }
        }
    }
}
