import SwiftUI

struct RevealAction: Identifiable {
    var title: String
    var tint: Color = Theme.danger
    var action: () -> Void

    var id: String { title }
}

struct RevealActionsRow<Content: View>: View {
    var actions: [RevealAction]
    @ViewBuilder var content: () -> Content

    @State private var dragOffset: CGFloat = 0
    @State private var isSwipedOpen = false

    private static var buttonWidth: CGFloat { 74 }
    private static var buttonSpacing: CGFloat { 10 }

    private var revealWidth: CGFloat {
        CGFloat(actions.count) * (Self.buttonWidth + Self.buttonSpacing)
    }

    var body: some View {
        ZStack(alignment: .trailing) {
            if dragOffset < 0 {
                HStack(spacing: Self.buttonSpacing) {
                    ForEach(actions) { action in
                        Button {
                            closeSwipe()
                            action.action()
                        } label: {
                            Text(action.title)
                                .font(Theme.font(13, .bold))
                                .foregroundStyle(.white)
                                .frame(width: Self.buttonWidth, height: 38)
                                .background(action.tint, in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            content()
                .offset(x: dragOffset)
                .overlay {
                    if isSwipedOpen {
                        Color.black.opacity(0.001)
                            .contentShape(Rectangle())
                            .onTapGesture(perform: closeSwipe)
                            .offset(x: dragOffset)
                    }
                }
        }
        .gesture(swipeGesture)
    }

    private var swipeGesture: some Gesture {
        DragGesture(minimumDistance: 25)
            .onChanged { value in
                guard abs(value.translation.width) > abs(value.translation.height) else { return }
                let base: CGFloat = isSwipedOpen ? -revealWidth : 0
                dragOffset = min(0, max(-revealWidth, base + value.translation.width))
            }
            .onEnded { _ in
                let shouldOpen = dragOffset < -revealWidth / 2
                withAnimation(.snappy(duration: 0.22)) {
                    dragOffset = shouldOpen ? -revealWidth : 0
                }
                isSwipedOpen = shouldOpen
            }
    }

    private func closeSwipe() {
        withAnimation(.snappy(duration: 0.22)) {
            dragOffset = 0
        }
        isSwipedOpen = false
    }
}
