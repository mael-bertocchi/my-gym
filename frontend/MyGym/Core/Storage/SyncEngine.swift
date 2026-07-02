import Foundation
import Observation

@MainActor
@Observable
final class SyncEngine {
    enum Status: Equatable {
        case idle
        case syncing
        case offline
        case failed(String)
    }

    private(set) var status: Status = .idle
    private(set) var lastSuccessAt: Date?

    private let store: LocalStore
    private var inFlight = false

    init(store: LocalStore) {
        self.store = store
    }

    func sync() async {
        guard !inFlight, TokenStore.load() != nil else { return }
        inFlight = true
        status = .syncing
        defer { inFlight = false }

        do {
            let push = store.snapshotForPush()
            if !push.workouts.isEmpty || !push.exerciseSettings.isEmpty || !push.deletions.isEmpty {
                let result = try await API.syncPush(push)
                store.applyPushResult(result, pushed: push)
            }
            let pull = try await API.syncPull(since: store.lastSyncAt)
            store.applyPull(pull)
            status = .idle
            lastSuccessAt = .now
        } catch is NetworkError {
            status = .offline
        } catch {
            status = .failed(error.localizedDescription)
        }
    }
}
