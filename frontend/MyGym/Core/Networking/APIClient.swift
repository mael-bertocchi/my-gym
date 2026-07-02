import Foundation

enum AppConfig {
    static var baseURL: URL {
        if let raw = UserDefaults.standard.string(forKey: "apiBaseURL"), let url = URL(string: raw) {
            return url
        }
        #if targetEnvironment(simulator)
        return URL(string: "http://localhost:8080/api/v1")!
        #else
        return URL(string: "https://my-gym.mael-bertocchi.fr/api/v1")!
        #endif
    }
}

struct APIError: Error, LocalizedError {
    var statusCode: Int
    var message: String

    var errorDescription: String? { message }

    var isUnauthorized: Bool { statusCode == 401 }
}

enum NetworkError: Error {
    case offline
    case notAuthenticated
}

private struct Envelope<T: Decodable>: Decodable {
    var data: T
}

struct Page<T: Decodable>: Decodable {
    var data: [T]
    var nextCursor: String?
}

private struct ErrorBody: Decodable {
    var message: String
}

struct EmptyBody: Encodable {}

actor APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private var refreshTask: Task<Bool, Never>?

    init(session: URLSession = .shared) {
        self.session = session
    }

    static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let string = try container.decode(String.self)
            if let date = isoFormatterFractional.date(from: string) ?? isoFormatter.date(from: string) {
                return date
            }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unparseable date: \(string)")
        }
        return decoder
    }()

    static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .custom { date, encoder in
            var container = encoder.singleValueContainer()
            try container.encode(isoFormatterFractional.string(from: date))
        }
        return encoder
    }()

    private static let isoFormatterFractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let isoFormatter = ISO8601DateFormatter()

    func get<T: Decodable>(_ path: String, query: [String: String?] = [:]) async throws -> T {
        try await send("GET", path, query: query, body: nil as EmptyBody?)
    }

    func post<T: Decodable>(_ path: String, body: some Encodable) async throws -> T {
        try await send("POST", path, body: body)
    }

    func patch<T: Decodable>(_ path: String, body: some Encodable) async throws -> T {
        try await send("PATCH", path, body: body)
    }

    func put<T: Decodable>(_ path: String, body: some Encodable) async throws -> T {
        try await send("PUT", path, body: body)
    }

    func delete<T: Decodable>(_ path: String) async throws -> T {
        try await send("DELETE", path, body: nil as EmptyBody?)
    }

    func page<T: Decodable>(_ path: String, query: [String: String?] = [:]) async throws -> Page<T> {
        let data = try await raw("GET", path, query: query, body: nil)
        return try Self.decoder.decode(Page<T>.self, from: data)
    }

    private func send<T: Decodable>(
        _ method: String,
        _ path: String,
        query: [String: String?] = [:],
        body: (some Encodable)?
    ) async throws -> T {
        let encoded = try body.map { try Self.encoder.encode($0) }
        let data = try await raw(method, path, query: query, body: encoded)
        return try Self.decoder.decode(Envelope<T>.self, from: data).data
    }

    private func raw(
        _ method: String,
        _ path: String,
        query: [String: String?] = [:],
        body: Data?,
        allowRefresh: Bool = true
    ) async throws -> Data {
        var components = URLComponents(
            url: AppConfig.baseURL.appending(path: path),
            resolvingAgainstBaseURL: false
        )!
        let items = query.compactMap { key, value in value.map { URLQueryItem(name: key, value: $0) } }
        if !items.isEmpty {
            components.queryItems = items
        }

        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.timeoutInterval = 60
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if let tokens = TokenStore.load() {
            request.setValue("Bearer \(tokens.accessToken)", forHTTPHeaderField: "Authorization")
        }

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw NetworkError.offline
        }

        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if (200..<300).contains(status) {
            return data
        }

        if status == 401, allowRefresh, path != "identity/login", path != "identity/refresh" {
            if await refreshTokens() {
                return try await raw(method, path, query: query, body: body, allowRefresh: false)
            }
        }

        let message = (try? Self.decoder.decode(ErrorBody.self, from: data))?.message ?? "Request failed"
        throw APIError(statusCode: status, message: message)
    }

    private func refreshTokens() async -> Bool {
        if let refreshTask {
            return await refreshTask.value
        }
        let task = Task<Bool, Never> {
            guard let tokens = TokenStore.load() else { return false }
            do {
                let body = try Self.encoder.encode(["refreshToken": tokens.refreshToken])
                let data = try await raw("POST", "identity/refresh", body: body, allowRefresh: false)
                let pair = try Self.decoder.decode(Envelope<TokenPair>.self, from: data).data
                TokenStore.save(pair)
                return true
            } catch {
                if let apiError = error as? APIError, apiError.isUnauthorized {
                    TokenStore.clear()
                }
                return false
            }
        }
        refreshTask = task
        let result = await task.value
        refreshTask = nil
        return result
    }
}
