import Foundation
import Observation

@MainActor
@Observable
final class AppSession {
    enum IdentityState: Equatable {
        case loading
        case signedOut
        case signedIn
    }

    private(set) var identityState: IdentityState = .loading
    private(set) var currentUser: UserProfile?

    private let store: LocalStore
    private let syncEngine: SyncEngine

    init(store: LocalStore, syncEngine: SyncEngine) {
        self.store = store
        self.syncEngine = syncEngine
    }

    var isAdministrator: Bool { currentUser?.isAdministrator ?? false }
    var weightUnit: WeightUnit { currentUser?.weightUnit ?? .kilograms }
    var defaultGymId: String? { currentUser?.defaultGymId }

    var restTimerSeconds: Int {
        get {
            let value = UserDefaults.standard.integer(forKey: "restTimerSeconds")
            return value > 0 ? value : 90
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "restTimerSeconds")
        }
    }

    func bootstrap() async {
        guard TokenStore.load() != nil else {
            identityState = .signedOut
            return
        }
        if let cached = Self.cachedProfile() {
            currentUser = cached
            identityState = .signedIn
            Task {
                await refreshProfile()
                await syncEngine.sync()
            }
            return
        }
        do {
            let profile = try await API.me()
            setProfile(profile)
            identityState = .signedIn
            await syncEngine.sync()
        } catch let error as APIError where error.isUnauthorized {
            TokenStore.clear()
            identityState = .signedOut
        } catch {
            identityState = TokenStore.load() != nil ? .signedIn : .signedOut
        }
    }

    func signIn(email: String, password: String) async throws {
        let tokens = try await API.login(email: email, password: password)
        TokenStore.save(tokens)
        let profile = try await API.me()
        setProfile(profile)
        identityState = .signedIn
        Task { await syncEngine.sync() }
    }

    func signOut() async {
        if let tokens = TokenStore.load() {
            try? await API.logout(refreshToken: tokens.refreshToken)
        }
        TokenStore.clear()
        UserDefaults.standard.removeObject(forKey: Self.profileKey)
        store.clearAll()
        currentUser = nil
        identityState = .signedOut
    }

    func refreshProfile() async {
        guard let profile = try? await API.me() else { return }
        setProfile(profile)
    }

    func updateProfile(
        displayName: String? = nil,
        weightUnit: WeightUnit? = nil,
        defaultGymId: String?? = nil
    ) async throws {
        let profile = try await API.updateMe(.init(
            displayName: displayName,
            weightUnit: weightUnit,
            defaultGymId: defaultGymId
        ))
        setProfile(profile)
    }

    #if DEBUG
    func enterDemo(profile: UserProfile) {
        currentUser = profile
        identityState = .signedIn
    }
    #endif

    private static let profileKey = "cachedProfile"

    private func setProfile(_ profile: UserProfile) {
        currentUser = profile
        if let data = try? APIClient.encoder.encode(profile) {
            UserDefaults.standard.set(data, forKey: Self.profileKey)
        }
    }

    private static func cachedProfile() -> UserProfile? {
        guard let data = UserDefaults.standard.data(forKey: profileKey) else { return nil }
        return try? APIClient.decoder.decode(UserProfile.self, from: data)
    }
}
