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
    private let activeWorkout: ActiveWorkoutStore

    init(store: LocalStore, syncEngine: SyncEngine, activeWorkout: ActiveWorkoutStore) {
        self.store = store
        self.syncEngine = syncEngine
        self.activeWorkout = activeWorkout
        observeAuthFailures()
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
        if let previousUserId = UserDefaults.standard.string(forKey: Self.lastUserIdKey),
           previousUserId != profile.id {
            clearLocalState()
        }
        setProfile(profile)
        identityState = .signedIn
        Task { await syncEngine.sync() }
    }

    func signOut() async {
        if store.hasPendingChanges {
            await syncEngine.sync()
        }
        if let tokens = TokenStore.load() {
            try? await API.logout(refreshToken: tokens.refreshToken)
        }
        TokenStore.clear()
        UserDefaults.standard.removeObject(forKey: Self.profileKey)
        clearLocalState()
        currentUser = nil
        identityState = .signedOut
    }

    private func clearLocalState() {
        activeWorkout.discard()
        InsightCache.clear()
        store.clearAll()
    }

    private func observeAuthFailures() {
        NotificationCenter.default.addObserver(
            forName: APIClient.authFailedNotification,
            object: nil,
            queue: .main
        ) { _ in
            Task { @MainActor [weak self] in
                guard let self, self.identityState == .signedIn else { return }
                UserDefaults.standard.removeObject(forKey: Self.profileKey)
                self.currentUser = nil
                self.identityState = .signedOut
            }
        }
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
    private static let lastUserIdKey = "lastUserId"

    private func setProfile(_ profile: UserProfile) {
        currentUser = profile
        UserDefaults.standard.set(profile.id, forKey: Self.lastUserIdKey)
        if let data = try? APIClient.encoder.encode(profile) {
            UserDefaults.standard.set(data, forKey: Self.profileKey)
        }
    }

    private static func cachedProfile() -> UserProfile? {
        guard let data = UserDefaults.standard.data(forKey: profileKey) else { return nil }
        return try? APIClient.decoder.decode(UserProfile.self, from: data)
    }
}
