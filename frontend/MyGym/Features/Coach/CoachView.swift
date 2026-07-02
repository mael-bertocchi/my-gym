import SwiftUI

struct CoachView: View {
    @State private var insights: [CoachInsight] = []
    @State private var isOffline = false
    @State private var hasLoaded = false
    @State private var debugShowChat = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Coach")
                        .font(Theme.font(26, .heavy))
                        .tracking(-0.4)
                        .foregroundStyle(Theme.ink)

                    Text("Grounded in your own training data.")
                        .font(Theme.font(13))
                        .foregroundStyle(Theme.muted2)
                        .padding(.top, 4)

                    NavigationLink {
                        CoachChatView()
                    } label: {
                        chatEntry
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 18)

                    if isOffline {
                        HStack(spacing: 6) {
                            Image(systemName: "wifi.slash")
                                .font(.system(size: 10, weight: .semibold))
                            Text("Offline — showing nothing new")
                                .font(Theme.font(12))
                        }
                        .foregroundStyle(Theme.muted2)
                        .padding(.top, 12)
                    }

                    insightSection
                        .padding(.top, 18)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, Theme.screenPadding)
                .padding(.top, 8)
            }
            .background(Theme.screenBackground)
            .contentMargins(.bottom, Theme.tabBarClearance, for: .scrollContent)
            .refreshable { await load() }
            .task {
                guard !hasLoaded else { return }
                if insights.isEmpty, let cached = InsightCache.read() {
                    insights = cached.map(CoachInsight.parse)
                }
                await load()
            }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(isPresented: $debugShowChat) {
                CoachChatView()
            }
            .onAppear {
                #if DEBUG
                if UserDefaults.standard.string(forKey: "open") == "chat" {
                    debugShowChat = true
                }
                #endif
            }
        }
    }

    private var chatEntry: some View {
        HStack(spacing: 10) {
            Text("Ask about your training…")
                .font(Theme.font(14))
                .foregroundStyle(Theme.muted)

            Spacer(minLength: 0)

            ZStack {
                Circle()
                    .fill(Theme.accentBlue)
                Image(systemName: "arrow.up")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .frame(width: 30, height: 30)
        }
        .padding(.leading, 16)
        .padding(.trailing, 8)
        .padding(.vertical, 8)
        .background(Theme.surface, in: Capsule())
        .overlay(Capsule().strokeBorder(Theme.fieldBorder, lineWidth: 1))
        .contentShape(Capsule())
    }

    @ViewBuilder
    private var insightSection: some View {
        if insights.isEmpty && !hasLoaded {
            HStack {
                Spacer()
                ProgressView()
                    .tint(Theme.muted2)
                Spacer()
            }
            .padding(.vertical, 32)
        } else if insights.isEmpty {
            CoachInsightCard(insight: .placeholder)
        } else {
            VStack(spacing: 12) {
                ForEach(insights) { insight in
                    CoachInsightCard(insight: insight)
                }
            }
        }
    }

    @MainActor
    private func load() async {
        do {
            let fresh = try await API.insights()
            InsightCache.write(fresh)
            insights = fresh.map(CoachInsight.parse)
            isOffline = false
        } catch NetworkError.offline {
            isOffline = true
            fallBackToCache()
        } catch {
            isOffline = false
            fallBackToCache()
        }
        hasLoaded = true
    }

    private func fallBackToCache() {
        if insights.isEmpty, let cached = InsightCache.read() {
            insights = cached.map(CoachInsight.parse)
        }
    }
}

struct CoachInsight: Identifiable {
    let id = UUID()
    var categoryLabel: String
    var dotColor: Color
    var title: String
    var body: String

    static let placeholder = CoachInsight(
        categoryLabel: "COACH",
        dotColor: Theme.muted2,
        title: "Your coach is warming up",
        body: "insights appear once you have a few workouts synced."
    )

    static func parse(_ text: String) -> CoachInsight {
        let lower = text.lowercased()

        let label: String
        let color: Color
        if ["plateau", "stuck", "stall"].contains(where: { lower.contains($0) }) {
            label = "PLATEAU"
            color = Theme.warning
        } else if ["imbalance", "below", "low", "lagging"].contains(where: { lower.contains($0) }) {
            label = "IMBALANCE"
            color = Theme.danger
        } else {
            label = "SUGGESTION"
            color = Theme.positive
        }

        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        var title: String
        var body: String
        if let range = trimmed.range(of: " — ") ?? trimmed.range(of: ": ") {
            title = String(trimmed[..<range.lowerBound])
            body = String(trimmed[range.upperBound...])
        } else if let range = trimmed.range(of: ". "), range.lowerBound != trimmed.startIndex {
            title = String(trimmed[..<range.lowerBound])
            body = String(trimmed[range.upperBound...])
        } else {
            title = label.capitalized
            body = trimmed
        }

        if title.compare(label, options: .caseInsensitive) == .orderedSame,
           let range = body.range(of: " — ") ?? body.range(of: ": ") {
            title = String(body[..<range.lowerBound])
            body = String(body[range.upperBound...])
        }

        title = title.trimmingCharacters(in: .whitespacesAndNewlines)
        body = body.trimmingCharacters(in: .whitespacesAndNewlines)
        if title.isEmpty { title = label.capitalized }
        if body.isEmpty { body = trimmed }

        return CoachInsight(categoryLabel: label, dotColor: color, title: title, body: body)
    }
}

struct CoachInsightCard: View {
    let insight: CoachInsight

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                StatusDot(color: insight.dotColor, size: 8)
                Text(insight.categoryLabel)
                    .font(Theme.mono(11, .semibold))
                    .kerning(1)
                    .foregroundStyle(Theme.muted2)
            }

            Text(insight.title)
                .font(Theme.font(15, .bold))
                .foregroundStyle(Theme.ink)
                .padding(.top, 10)

            Text(insight.body)
                .font(Theme.font(13))
                .foregroundStyle(Theme.muted)
                .lineSpacing(4)
                .padding(.top, 6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .card(radius: 20)
    }
}
