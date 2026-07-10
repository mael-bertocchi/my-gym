import SwiftUI
import UIKit

enum Theme {

    static let accentBlue        = dyn(light: 0x2F6FED, dark: 0x5B8DEF)
    static let accentBlueSoft    = dyn(light: 0x5E8BE6, dark: 0x7BA4F2)
    static let accentBlueTint    = dyn(light: 0xEAF1FE, dark: 0x1E2941)
    static let accentBlueTintBorder = dyn(light: 0xD4E2FC, dark: 0x3B4A6B)
    static let resumeRing        = dyn(light: 0x9DBEF5, dark: 0x4F6598)

    static let ink           = dyn(light: 0x15181C, dark: 0xEEF1F5)
    static let inkSecondary  = dyn(light: 0x33414F, dark: 0xC2C8D2)
    static let muted         = dyn(light: 0x6A7079, dark: 0x8B929D)
    static let muted2        = dyn(light: 0x9098A0, dark: 0x656C77)

    static let hairline         = dyn(light: 0xE7EAEE, dark: 0x2C313A)
    static let divider          = dyn(light: 0xEEF0F3, dark: 0x262A32)
    static let screenBackground = dyn(light: 0xF6F7F9, dark: 0x16181D)
    static let canvas           = dyn(light: 0xE9EBEE, dark: 0x0F1114)
    static let surface          = dyn(light: 0xFFFFFF, dark: 0x21242C)
    static let fieldFill        = dyn(light: 0xF1F3F6, dark: 0x2A2E37)
    static let fieldBorder      = dyn(light: 0xE4E7EB, dark: 0x383E48)
    static let controlOutline   = dyn(light: 0xD2D6DB, dark: 0x4A515B)

    static let positive       = dyn(light: 0x2E7D32, dark: 0x43C46E)
    static let positiveTint   = dyn(light: 0xEEF6EE, dark: 0x16291D)
    static let positiveBorder = dyn(light: 0xCFE8CF, dark: 0x285537)
    static let warning        = dyn(light: 0xE8A33D, dark: 0xE9B45A)
    static let warningText    = dyn(light: 0xB2731B, dark: 0xE0AA55)
    static let danger         = dyn(light: 0xD14343, dark: 0xEC6360)

    static let tabInactive = dyn(light: 0x8A9099, dark: 0x656C77)
    static let chartMuted  = dyn(light: 0xE1E5EA, dark: 0x2C313A)
    static let chartSoft   = dyn(light: 0xC9D7F2, dark: 0x33405C)

    static let restBarFill = dyn(light: 0xEAF1FE, dark: 0x1A2740)

    static let onAccent = dyn(light: 0xFFFFFF, dark: 0x0E0F13)

    static let tooltipFill = dyn(light: 0x15181C, dark: 0x3A414E)
    static let tooltipText = dyn(light: 0xFFFFFF, dark: 0xEEF1F5)
    static let segmentTrack = dyn(light: 0xF1F3F6, dark: 0x191C22)
    static let supersetTokenInactive = dyn(light: 0x9098A0, dark: 0x3A4152)

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
    static let supersetCardRadius: CGFloat = 24
    static let controlRadius: CGFloat = 14
    static let tileRadius: CGFloat = 10
    static let primaryButtonHeight: CGFloat = 54
    static let minHitTarget: CGFloat = 44

    private static func dyn(light: UInt32, dark: UInt32) -> Color {
        Color(UIColor { trait in
            trait.userInterfaceStyle == .dark
                ? UIColor(hex: dark)
                : UIColor(hex: light)
        })
    }
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

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}
