import SwiftUI

struct DashboardView: View {
    @Environment(WatchSessionStore.self) private var mirror

    let session: WorkoutSessionState
    let now: Date

    @State private var path: [DashboardRoute] = []

    var body: some View {
        NavigationStack(path: $path) {
            content
                .navigationDestination(for: DashboardRoute.self) { _ in
                    AdjustLogView(onLogged: { path = [] })
                }
        }
        .onAppear {
            if mirror.autoOpenAdjust {
                mirror.autoOpenAdjust = false
                path = [.adjust]
            }
        }
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: WatchLayout.isCompact ? 5 : 6) {
            HStack(spacing: 6) {
                WatchStatTile(
                    value: (mirror.liveHeartRate ?? session.heartRate).map(String.init) ?? "—",
                    label: "BPM",
                    icon: "heart.fill",
                    radius: 12
                )
                WatchStatTile(
                    value: "\(session.completedSets)/\(session.totalSets)",
                    label: "SETS",
                    radius: 12
                )
            }
            .frame(height: WatchLayout.isCompact ? 40 : 46)

            if let target = session.target {
                Button {
                    path = [.adjust]
                } label: {
                    VStack(alignment: .leading, spacing: 3) {
                        SessionEyebrow(
                            text: target.supersetEyebrow ?? "SET \(target.setNumber) OF \(target.setCount)",
                            color: SessionPalette.accent,
                            size: 8,
                            kerning: 1
                        )
                        Text(target.exerciseName)
                            .font(SessionPalette.font(15, .bold))
                            .foregroundStyle(SessionPalette.ink)
                            .lineLimit(1)
                        Text(upNextDetail(target))
                            .font(SessionPalette.mono(11, .medium))
                            .foregroundStyle(SessionPalette.inkSecondary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 9)
                    .padding(.horizontal, 10)
                    .background(SessionPalette.tint, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .strokeBorder(SessionPalette.tintBorder, lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)

                Spacer(minLength: 0)

                WatchPillButton(
                    title: "Log set",
                    style: .accent,
                    height: WatchLayout.isCompact ? 38 : 40,
                    fontSize: 13.5
                ) {
                    WatchHaptics.play(.click)
                    mirror.send(.logTarget(
                        entryId: target.entryId,
                        setId: target.setId,
                        weightKg: target.isWeighted ? target.weightKg : nil,
                        reps: target.reps ?? 0
                    ))
                }
            } else {
                VStack(alignment: .leading, spacing: 3) {
                    SessionEyebrow(text: "ALL SETS LOGGED", color: SessionPalette.accent, size: 8, kerning: 1)
                    Text(session.workoutName)
                        .font(SessionPalette.font(15, .bold))
                        .foregroundStyle(SessionPalette.ink)
                        .lineLimit(1)
                    Text("Finish from the controls page.")
                        .font(SessionPalette.font(10.5))
                        .foregroundStyle(SessionPalette.muted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 9)
                .padding(.horizontal, 10)
                .background(SessionPalette.tint, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(SessionPalette.tintBorder, lineWidth: 1)
                )
                Spacer(minLength: 0)
            }
        }
        .padding(.horizontal, 4)
        .padding(.bottom, 2)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                HStack(spacing: 5) {
                    Circle()
                        .fill(session.isPaused ? SessionPalette.warning : SessionPalette.positive)
                        .frame(width: 6, height: 6)
                    Text(Formatting.elapsed(session.elapsed(at: now)))
                        .font(SessionPalette.mono(17, .bold))
                        .foregroundStyle(SessionPalette.ink)
                        .contentTransition(.numericText())
                }
            }
        }
    }

    private func upNextDetail(_ target: WorkoutSessionState.TargetSet) -> String {
        var line = target.valueLine
        if let partnerLetter = target.partnerLetter, let partnerName = target.partnerName {
            line += " · then \(partnerLetter) \(partnerName)"
        }
        return line
    }
}

enum DashboardRoute: Hashable {
    case adjust
}
