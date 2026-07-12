import SwiftUI
import WatchKit

@main
struct WatchApplication: App {
    @WKApplicationDelegateAdaptor(WatchAppDelegate.self) private var appDelegate

    @State private var mirror = WatchSessionStore()

    var body: some Scene {
        WindowGroup {
            WatchRootView()
                .environment(mirror)
        }
    }
}
