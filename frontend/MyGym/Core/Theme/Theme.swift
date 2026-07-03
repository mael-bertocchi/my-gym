import SwiftUI
import UIKit

enum Theme {

    static let accentBlue = Color(hex: 0x2F6FED)
    static let accentBlueSoft = Color(hex: 0x5E8BE6)
    static let accentBlueTint = Color(hex: 0xEAF1FE)
    static let accentBlueTintBorder = Color(hex: 0xD4E2FC)
    static let resumeRing = Color(hex: 0x9DBEF5)

    static let ink = Color(hex: 0x15181C)
    static let inkSecondary = Color(hex: 0x33414F)
    static let muted = Color(hex: 0x6A7079)
    static let muted2 = Color(hex: 0x9098A0)

    static let hairline = Color(hex: 0xE7EAEE)
    static let divider = Color(hex: 0xEEF0F3)
    static let screenBackground = Color(hex: 0xF6F7F9)
    static let canvas = Color(hex: 0xE9EBEE)
    static let surface = Color.white
    static let fieldFill = Color(hex: 0xF1F3F6)
    static let fieldBorder = Color(hex: 0xE4E7EB)
    static let controlOutline = Color(hex: 0xD2D6DB)

    static let positive = Color(hex: 0x2E7D32)
    static let positiveTint = Color(hex: 0xEEF6EE)
    static let positiveBorder = Color(hex: 0xCFE8CF)
    static let warning = Color(hex: 0xE8A33D)
    static let warningText = Color(hex: 0xB2731B)
    static let danger = Color(hex: 0xD14343)

    static let tabInactive = Color(hex: 0x8A9099)
    static let chartMuted = Color(hex: 0xE1E5EA)
    static let chartSoft = Color(hex: 0xC9D7F2)

    static func font(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .system(size: scaled(size), weight: weight)
    }

    static func mono(_ size: CGFloat, _ weight: Font.Weight = .medium) -> Font {
        .system(size: scaled(size), weight: weight, design: .monospaced)
    }

    private static func scaled(_ size: CGFloat) -> CGFloat {
        let metrics = UIFontMetrics(forTextStyle: textStyle(for: size))
        return min(metrics.scaledValue(for: size), size * 1.5)
    }

    private static func textStyle(for size: CGFloat) -> UIFont.TextStyle {
        switch size {
        case ..<11: return .caption2
        case ..<13: return .caption1
        case ..<15: return .footnote
        case ..<17: return .body
        case ..<22: return .title3
        case ..<28: return .title1
        default: return .largeTitle
        }
    }

    static let screenPadding: CGFloat = 20
    static let cardRadius: CGFloat = 20
    static let controlRadius: CGFloat = 14
    static let tileRadius: CGFloat = 10
    static let primaryButtonHeight: CGFloat = 54
    static let minHitTarget: CGFloat = 44
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}
