import UIKit

enum AppIconOption: String, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var label: String {
        switch self {
        case .system: return "System"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }

    private var alternateIconName: String? {
        switch self {
        case .system: return nil
        case .light: return "AppIconLight"
        case .dark: return "AppIconDark"
        }
    }

    @MainActor
    static var current: AppIconOption {
        let name = UIApplication.shared.alternateIconName
        return allCases.first { $0.alternateIconName == name } ?? .system
    }

    @MainActor
    func apply() async throws {
        guard UIApplication.shared.alternateIconName != alternateIconName else { return }
        try await UIApplication.shared.setAlternateIconName(alternateIconName)
    }
}
