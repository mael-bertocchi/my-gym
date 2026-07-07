import SwiftUI
import Observation

@MainActor
@Observable
final class TabChromeState {
    private var hiddenCount = 0

    var isHidden: Bool { hiddenCount > 0 }

    func push() {
        hiddenCount += 1
    }

    func pop() {
        hiddenCount = max(0, hiddenCount - 1)
    }
}

private struct HidesApplicationTabBar: ViewModifier {
    @Environment(TabChromeState.self) private var chrome

    func body(content: Content) -> some View {
        content
            .onAppear { chrome.push() }
            .onDisappear { chrome.pop() }
    }
}

extension View {
    func hidesApplicationTabBar() -> some View {
        modifier(HidesApplicationTabBar())
    }
}
