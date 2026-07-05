import SwiftUI
import UIKit

enum WidgetTheme {
    static let accentBlue     = dyn(light: 0x2F6FED, dark: 0x5B8DEF)
    static let accentBlueSoft = dyn(light: 0x5E8BE6, dark: 0x7BA4F2)
    static let ink            = dyn(light: 0x15181C, dark: 0xEEF1F5)
    static let inkSecondary   = dyn(light: 0x33414F, dark: 0xC2C8D2)
    static let muted          = dyn(light: 0x6A7079, dark: 0x8B929D)
    static let muted2         = dyn(light: 0x9098A0, dark: 0x656C77)
    static let hairline       = dyn(light: 0xE7EAEE, dark: 0x2C313A)
    static let chartSoft      = dyn(light: 0xC9D7F2, dark: 0x33405C)
    static let positive       = dyn(light: 0x2E7D32, dark: 0x43C46E)
    static let warning        = dyn(light: 0xE8A33D, dark: 0xE9B45A)

    static func font(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight)
    }

    static func mono(_ size: CGFloat, _ weight: Font.Weight = .medium) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }

    private static func dyn(light: UInt32, dark: UInt32) -> Color {
        Color(UIColor { $0.userInterfaceStyle == .dark ? channel(dark) : channel(light) })
    }

    private static func channel(_ hex: UInt32) -> UIColor {
        UIColor(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}
