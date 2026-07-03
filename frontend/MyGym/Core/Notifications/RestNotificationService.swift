import Foundation
import UserNotifications

@MainActor
final class RestNotificationService: NSObject, UNUserNotificationCenterDelegate {
    private static let identifier = "rest-timer-complete"

    private let center = UNUserNotificationCenter.current()
    private var generation = 0

    override init() {
        super.init()
        center.delegate = self
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }

    func schedule(endsAt: Date) {
        guard isAvailable else { return }
        generation += 1
        let current = generation
        Task {
            guard await ensureAuthorization(), generation == current else { return }
            center.removeDeliveredNotifications(withIdentifiers: [Self.identifier])
            let remaining = endsAt.timeIntervalSinceNow
            guard remaining > 0 else { return }

            let content = UNMutableNotificationContent()
            content.title = "Rest over"
            content.body = "Time for your next set."
            content.sound = .default

            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: remaining, repeats: false)
            try? await center.add(UNNotificationRequest(identifier: Self.identifier, content: content, trigger: trigger))
        }
    }

    func cancel() {
        guard isAvailable else { return }
        generation += 1
        center.removePendingNotificationRequests(withIdentifiers: [Self.identifier])
        center.removeDeliveredNotifications(withIdentifiers: [Self.identifier])
    }

    private var isAvailable: Bool {
        #if DEBUG
        !CommandLine.arguments.contains("-demo") && !CommandLine.arguments.contains("-demo-empty")
        #else
        true
        #endif
    }

    private func ensureAuthorization() async -> Bool {
        switch await center.notificationSettings().authorizationStatus {
        case .notDetermined:
            return (try? await center.requestAuthorization(options: [.alert, .sound])) ?? false
        case .denied:
            return false
        default:
            return true
        }
    }
}
