import Foundation

enum InsightCache {
    private static let key = "cachedInsights"

    static func read() -> [String]? {
        guard let data = UserDefaults.standard.data(forKey: key),
              let strings = try? JSONDecoder().decode([String].self, from: data),
              !strings.isEmpty
        else { return nil }
        return strings
    }

    static func write(_ strings: [String]) {
        if let data = try? JSONEncoder().encode(strings) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }
}
