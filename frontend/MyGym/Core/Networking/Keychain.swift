import Foundation
import Security

enum Keychain {
    private static let service = "fr.mael-bertocchi.MyGym"

    static func save(_ data: Data, for key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)

        var attributes = query
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(attributes as CFDictionary, nil)
    }

    static func load(for key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess else { return nil }
        return result as? Data
    }

    static func delete(for key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

enum TokenStore {
    private static let key = "auth.tokens"

    static func save(_ tokens: TokenPair) {
        if let data = try? JSONEncoder().encode(tokens) {
            Keychain.save(data, for: key)
        }
    }

    static func load() -> TokenPair? {
        guard let data = Keychain.load(for: key) else { return nil }
        return try? JSONDecoder().decode(TokenPair.self, from: data)
    }

    static func clear() {
        Keychain.delete(for: key)
    }
}
