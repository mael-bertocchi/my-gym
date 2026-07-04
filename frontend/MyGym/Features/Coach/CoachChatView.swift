import SwiftUI

struct CoachChatView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(LocalStore.self) private var store

    @State private var conversationId: String?
    @State private var messages: [ChatMessage] = []
    @State private var input = ""
    @State private var hasBootstrapped = false
    @State private var isBootstrapping = true
    @State private var isSending = false
    @State private var failedContent: String?
    @State private var isOffline = false
    @State private var bootstrapFailed = false

    private static let greeting = "Ask me about your training — I only use your own data."

    private static let starterPrompts = [
        "Am I progressing on my main lifts?",
        "What should I train today?",
        "Where am I plateauing?",
    ]

    var body: some View {
        VStack(spacing: 0) {
            header
            Rectangle()
                .fill(Theme.divider)
                .frame(height: 1)
            messageList
        }
        .background(Theme.screenBackground)
        .hidesAppTabBar()
        .safeAreaInset(edge: .bottom, spacing: 0) { composer }
        .toolbar(.hidden, for: .navigationBar)
        .task { await bootstrap() }
    }

    private var header: some View {
        HStack(spacing: 12) {
            Button {
                dismiss()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Theme.muted2)
                    .frame(width: 44, height: 44, alignment: .leading)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Back")

            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Theme.accentBlue)
                .frame(width: 34, height: 34)
                .overlay(
                    Image(systemName: "figure.strengthtraining.traditional")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white)
                )

            VStack(alignment: .leading, spacing: 1) {
                Text("Coach")
                    .font(Theme.font(15, .bold))
                    .foregroundStyle(Theme.ink)
                Text("Gemini · your data only")
                    .font(Theme.font(11))
                    .foregroundStyle(Theme.muted2)
            }

            Spacer()
        }
        .padding(.top, 6)
        .padding(.horizontal, Theme.screenPadding)
        .padding(.bottom, 8)
    }

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if isBootstrapping {
                        HStack {
                            Spacer()
                            ProgressView()
                                .tint(Theme.muted2)
                            Spacer()
                        }
                        .padding(.top, 24)
                    } else {
                        if messages.isEmpty {
                            CoachChatBubble(role: .assistant, content: Self.greeting)
                            if !isOffline {
                                starterPromptRow
                            }
                        }

                        if bootstrapFailed {
                            Button(action: retryBootstrap) {
                                Text("Couldn't load your conversation")
                                    .font(Theme.font(12))
                                    .foregroundStyle(Theme.danger)
                                    .frame(maxWidth: .infinity)
                                    .expandedTapTarget(vertical: 10)
                            }
                            .buttonStyle(.plain)
                        }

                        ForEach(messages) { message in
                            CoachChatBubble(role: message.role, content: message.content)

                            if message.id == latestAssistantId, let exercise = suggestedExercise {
                                NavigationLink {
                                    ExerciseDetailView(exerciseId: exercise.id)
                                } label: {
                                    CoachSuggestionChip(title: "Show progression")
                                }
                                .buttonStyle(.plain)
                            }
                        }

                        if isSending {
                            CoachTypingIndicator()
                        }

                        if failedContent != nil {
                            Button(action: retry) {
                                Text("Couldn't reach your coach")
                                    .font(Theme.font(12))
                                    .foregroundStyle(Theme.danger)
                                    .frame(maxWidth: .infinity)
                                    .expandedTapTarget(vertical: 10)
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    Color.clear
                        .frame(height: 1)
                        .id("bottom")
                }
                .padding(.vertical, 18)
                .padding(.horizontal, Theme.screenPadding)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: messages.count) { scrollToBottom(proxy) }
            .onChange(of: isSending) { scrollToBottom(proxy) }
            .onChange(of: failedContent) { scrollToBottom(proxy) }
            .onChange(of: isBootstrapping) { scrollToBottom(proxy, animated: false) }
        }
    }

    private var starterPromptRow: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Self.starterPrompts, id: \.self) { prompt in
                Button {
                    input = prompt
                    send()
                } label: {
                    CoachSuggestionChip(title: prompt)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.top, 2)
    }

    private var latestAssistantId: String? {
        messages.last(where: { $0.role == .assistant })?.id
    }

    private var suggestedExercise: Exercise? {
        guard let content = messages.last(where: { $0.role == .assistant })?.content else { return nil }
        let haystack = content.lowercased()
        return store.exercises
            .filter { !$0.name.isEmpty && haystack.contains($0.name.lowercased()) }
            .max { $0.name.count < $1.name.count }
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy, animated: Bool = true) {
        if animated {
            withAnimation(.easeOut(duration: 0.2)) {
                proxy.scrollTo("bottom", anchor: .bottom)
            }
        } else {
            proxy.scrollTo("bottom", anchor: .bottom)
        }
    }

    private var composer: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Theme.divider)
                .frame(height: 1)

            VStack(spacing: 8) {
                HStack(spacing: 10) {
                    TextField("Ask about your training…", text: $input, axis: .vertical)
                        .font(Theme.font(14))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1...4)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .frame(minHeight: 44)
                        .background(
                            Theme.surface,
                            in: RoundedRectangle(cornerRadius: 22, style: .continuous)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 22, style: .continuous)
                                .strokeBorder(Theme.fieldBorder, lineWidth: 1)
                        )
                        .disabled(isOffline)
                        .onSubmit(send)

                    Button(action: send) {
                        ZStack {
                            Circle()
                                .fill(Theme.accentBlue)
                            Image(systemName: "arrow.up")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundStyle(.white)
                        }
                        .frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)
                    .disabled(!canSend)
                    .opacity(canSend ? 1 : 0.5)
                    .accessibilityLabel("Send")
                }
                .opacity(isOffline ? 0.55 : 1)

                if isOffline {
                    Text("Coach needs a connection.")
                        .font(Theme.font(12))
                        .foregroundStyle(Theme.muted2)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.top, 14)
            .padding(.horizontal, Theme.screenPadding)
            .padding(.bottom, 12)
        }
        .background(Theme.screenBackground)
    }

    private var trimmedInput: String {
        input.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var canSend: Bool {
        !isOffline && !isSending && !trimmedInput.isEmpty
    }

    @MainActor
    private func bootstrap() async {
        guard !hasBootstrapped else { return }
        hasBootstrapped = true
        defer { isBootstrapping = false }
        do {
            guard let latest = try await API.conversations().data.first else { return }
            conversationId = latest.id
            let detail = try await API.conversation(id: latest.id)
            messages = detail.messages
            isOffline = false
            bootstrapFailed = false
        } catch NetworkError.offline {
            isOffline = true
        } catch {
            bootstrapFailed = true
        }
    }

    private func retryBootstrap() {
        hasBootstrapped = false
        bootstrapFailed = false
        isBootstrapping = true
        Task { await bootstrap() }
    }

    private func send() {
        guard canSend else { return }
        let content = trimmedInput
        input = ""
        failedContent = nil
        messages.append(
            ChatMessage(id: "local-\(UUID().uuidString)", role: .user, content: content, createdAt: Date())
        )
        Task { await deliver(content) }
    }

    private func retry() {
        guard let content = failedContent, !isSending else { return }
        failedContent = nil
        Task { await deliver(content) }
    }

    @MainActor
    private func deliver(_ content: String) async {
        isSending = true
        defer { isSending = false }
        do {
            let id: String
            if let conversationId {
                id = conversationId
            } else {
                let conversation = try await API.createConversation(title: "Coaching")
                conversationId = conversation.id
                id = conversation.id
            }
            let reply = try await API.sendMessage(conversationId: id, content: content)
            messages.append(reply)
            isOffline = false
        } catch NetworkError.offline {
            isOffline = true
            failedContent = content
        } catch {
            failedContent = content
        }
    }
}

struct CoachChatBubble: View {
    let role: MessageRole
    let content: String

    private var isUser: Bool { role == .user }

    var body: some View {
        Text(content)
            .font(Theme.font(14))
            .lineSpacing(4)
            .foregroundStyle(isUser ? .white : Theme.inkSecondary)
            .padding(.vertical, 12)
            .padding(.horizontal, 15)
            .background(isUser ? Theme.accentBlue : Theme.surface, in: shape)
            .overlay(shape.strokeBorder(isUser ? Color.clear : Theme.hairline, lineWidth: 1))
            .frame(maxWidth: 270, alignment: isUser ? .trailing : .leading)
            .frame(maxWidth: .infinity, alignment: isUser ? .trailing : .leading)
    }

    private var shape: UnevenRoundedRectangle {
        UnevenRoundedRectangle(
            cornerRadii: .init(
                topLeading: 18,
                bottomLeading: isUser ? 18 : 4,
                bottomTrailing: isUser ? 4 : 18,
                topTrailing: 18
            ),
            style: .continuous
        )
    }
}

struct CoachTypingIndicator: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulsing = false

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(Theme.muted2)
                    .frame(width: 7, height: 7)
                    .opacity(reduceMotion ? 0.6 : (pulsing ? 1 : 0.25))
                    .animation(
                        reduceMotion ? nil : .easeInOut(duration: 0.45)
                            .repeatForever(autoreverses: true)
                            .delay(Double(index) * 0.15),
                        value: pulsing
                    )
            }
        }
        .padding(.vertical, 16)
        .padding(.horizontal, 15)
        .background(Theme.surface, in: shape)
        .overlay(shape.strokeBorder(Theme.hairline, lineWidth: 1))
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityLabel("Coach is typing")
        .onAppear { pulsing = true }
    }

    private var shape: UnevenRoundedRectangle {
        UnevenRoundedRectangle(
            cornerRadii: .init(topLeading: 18, bottomLeading: 4, bottomTrailing: 18, topTrailing: 18),
            style: .continuous
        )
    }
}

struct CoachSuggestionChip: View {
    let title: String

    var body: some View {
        Text(title)
            .font(Theme.font(12, .semibold))
            .foregroundStyle(Theme.accentBlue)
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(
                Theme.accentBlueTint,
                in: RoundedRectangle(cornerRadius: 14, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(Theme.accentBlueTintBorder, lineWidth: 1)
            )
    }
}
