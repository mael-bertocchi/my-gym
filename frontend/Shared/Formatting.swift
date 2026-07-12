import Foundation

enum Formatting {
    static let kilogramsPerPound = 0.45359237

    static func eyebrowDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "EEE · MMM d"
        return formatter.string(from: date).uppercased()
    }

    static func monoDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "EEE MMM d"
        return formatter.string(from: date).uppercased()
    }

    static func shortDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    static func monthLabel(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: date).uppercased()
    }

    static func relativeDay(_ date: Date) -> String {
        if Calendar.current.isDateInToday(date) { return "Today" }
        if Calendar.current.isDateInYesterday(date) { return "Yesterday" }
        return shortDate(date)
    }

    static func elapsed(_ interval: TimeInterval) -> String {
        let total = max(0, Int(interval))
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        let seconds = total % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%d:%02d", minutes, seconds)
    }

    static func countdown(_ seconds: Int) -> String {
        String(format: "%d:%02d", max(0, seconds) / 60, max(0, seconds) % 60)
    }

    static func duration(_ interval: TimeInterval) -> String {
        let minutes = max(0, Int(interval) / 60)
        if minutes >= 60 {
            return "\(minutes / 60)h \(minutes % 60)m"
        }
        return "\(minutes)m"
    }

    static func displayWeight(_ kilograms: Double, unit: WeightUnit) -> Double {
        unit == .kilograms ? kilograms : kilograms / kilogramsPerPound
    }

    static func weightNumber(_ kilograms: Double, unit: WeightUnit = .kilograms) -> String {
        let value = displayWeight(kilograms, unit: unit)
        if value.truncatingRemainder(dividingBy: 1) == 0 {
            return String(format: "%.0f", value)
        }
        return String(format: "%.1f", value)
    }

    static func weight(_ kilograms: Double, unit: WeightUnit = .kilograms) -> String {
        weightNumber(kilograms, unit: unit) + unit.suffix
    }

    static func spacedWeight(_ kilograms: Double, unit: WeightUnit = .kilograms) -> String {
        weightNumber(kilograms, unit: unit) + " " + unit.suffix
    }

    static func compactVolume(_ kilograms: Double, unit: WeightUnit = .kilograms) -> String {
        let value = displayWeight(kilograms, unit: unit)
        if value >= 1000 {
            let thousands = value / 1000
            if thousands >= 100 {
                return String(format: "%.0fk", thousands)
            }
            return String(format: "%.1fk", thousands)
        }
        return String(format: "%.0f", value)
    }
}

enum WeightUnit: String, Codable, CaseIterable {
    case kilograms = "KG"
    case pounds = "LBS"

    var suffix: String { self == .kilograms ? "kg" : "lb" }
    var label: String { self == .kilograms ? "kg" : "lb" }
}
