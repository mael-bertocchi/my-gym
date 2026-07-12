#if os(iOS)
import AppIntents
import SwiftUI

struct WorkoutLockScreenView: View {
    let state: WorkoutSessionState
    var isStale = false

    private var showsRest: Bool { state.isResting && !isStale }

    var body: some View {
        VStack(spacing: 14) {
            HStack(alignment: .center, spacing: 16) {
                VStack(alignment: .leading, spacing: 7) {
                    HStack(spacing: 8) {
                        WorkoutLogoBadge(size: 22, radius: 6)
                        SessionEyebrow(text: "MY GYM", size: 10)
                        if state.isPaused {
                            SessionEyebrow(text: "● PAUSED", color: SessionPalette.warning, size: 10, kerning: 1)
                        } else if !showsRest {
                            SessionEyebrow(text: "● LIVE", color: SessionPalette.positive, size: 10, kerning: 1)
                        }
                    }
                    Text(state.target?.exerciseName ?? state.workoutName)
                        .font(SessionPalette.font(16, .bold))
                        .foregroundStyle(SessionPalette.ink)
                        .lineLimit(1)
                    Text(detailLine)
                        .font(SessionPalette.font(12))
                        .foregroundStyle(SessionPalette.inkSecondary)
                        .lineLimit(1)
                    if showsRest, let target = state.target {
                        SetSegmentsBar(target: target)
                            .padding(.top, 2)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                if showsRest, let rest = state.rest {
                    RestRingView(rest: rest)
                } else {
                    VStack(alignment: .trailing, spacing: 4) {
                        elapsedText
                            .font(SessionPalette.mono(30, .bold))
                            .foregroundStyle(SessionPalette.ink)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .multilineTextAlignment(.trailing)
                            .frame(maxWidth: 88, alignment: .trailing)
                        HStack(spacing: 5) {
                            Image(systemName: "heart.fill")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(SessionPalette.danger)
                            Text(state.heartRate.map(String.init) ?? "—")
                                .font(SessionPalette.mono(14, .bold))
                                .foregroundStyle(SessionPalette.ink)
                        }
                    }
                }
            }

            if showsRest {
                HStack(spacing: 8) {
                    Button(intent: PauseWorkoutIntent()) {
                        HStack(spacing: 6) {
                            Image(systemName: "pause.fill")
                                .font(.system(size: 10, weight: .bold))
                            Text("Pause")
                                .font(SessionPalette.font(12, .bold))
                        }
                        .foregroundStyle(SessionPalette.inkSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 9)
                        .background(SessionPalette.control, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    Button(intent: SkipRestIntent()) {
                        Text("Skip rest")
                            .font(SessionPalette.font(12, .bold))
                            .foregroundStyle(SessionPalette.onAccent)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 9)
                            .background(SessionPalette.accent, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            } else if state.isPaused {
                Button(intent: ResumeWorkoutIntent()) {
                    Text("Resume")
                        .font(SessionPalette.font(12, .bold))
                        .foregroundStyle(SessionPalette.onAccent)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 9)
                        .background(SessionPalette.accent, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 16)
        .padding(.horizontal, 18)
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .strokeBorder(SessionPalette.cardBorder, lineWidth: 1)
        )
    }

    private var detailLine: String {
        guard let target = state.target else {
            return "\(state.completedSets)/\(state.totalSets) sets done"
        }
        var line = "Set \(target.setNumber) of \(target.setCount) · \(target.valueLine)"
        if !showsRest, !state.isPaused, target.supersetLetter != nil {
            line += " · GO — no rest"
        }
        return line
    }

    private var elapsedText: Text {
        if let pausedAt = state.pausedAt {
            return Text(Formatting.elapsed(state.elapsed(at: pausedAt)))
        }
        return Text(timerInterval: state.elapsedReferenceDate...Date.distantFuture, countsDown: false)
    }
}

struct SetSegmentsBar: View {
    let target: WorkoutSessionState.TargetSet

    var body: some View {
        HStack(spacing: 4) {
            ForEach(1...max(1, target.setCount), id: \.self) { number in
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(color(for: number))
                    .frame(height: 4)
                    .frame(maxWidth: .infinity)
            }
        }
    }

    private func color(for number: Int) -> Color {
        if target.completedNumbers.contains(number) { return SessionPalette.accent }
        if number == target.setNumber { return SessionPalette.ringTrack }
        return SessionPalette.neutralTrack
    }
}

struct RestRingView: View {
    let rest: WorkoutSessionState.Rest
    var size: CGFloat = 78
    var lineWidth: CGFloat = 6

    var body: some View {
        ZStack {
            SessionRing(progress: rest.progress(), lineWidth: lineWidth)
            VStack(spacing: 1) {
                SessionEyebrow(text: "REST", color: SessionPalette.accent, size: 8)
                Text(timerInterval: rest.startedAt...rest.endsAt, countsDown: true)
                    .font(SessionPalette.mono(19, .bold))
                    .foregroundStyle(SessionPalette.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.55)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: size - 22)
            }
        }
        .frame(width: size, height: size)
    }
}

struct ExpandedElapsedView: View {
    let state: WorkoutSessionState

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            SessionEyebrow(text: "ELAPSED", size: 10)
            HStack(spacing: 7) {
                Circle()
                    .fill(state.isPaused ? SessionPalette.warning : SessionPalette.positive)
                    .frame(width: 7, height: 7)
                elapsedText
                    .font(SessionPalette.mono(28, .bold))
                    .foregroundStyle(SessionPalette.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .frame(maxWidth: 104, alignment: .leading)
            }
        }
        .padding(.leading, 4)
        .padding(.top, 6)
    }

    private var elapsedText: Text {
        if let pausedAt = state.pausedAt {
            return Text(Formatting.elapsed(state.elapsed(at: pausedAt)))
        }
        return Text(timerInterval: state.elapsedReferenceDate...Date.distantFuture, countsDown: false)
    }
}

struct ExpandedHeartView: View {
    let state: WorkoutSessionState

    var body: some View {
        VStack(alignment: .trailing, spacing: 3) {
            SessionEyebrow(text: "HEART", size: 10)
            HStack(spacing: 6) {
                Image(systemName: "heart.fill")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(SessionPalette.danger)
                Text(state.heartRate.map(String.init) ?? "—")
                    .font(SessionPalette.mono(28, .bold))
                    .foregroundStyle(SessionPalette.ink)
                    .lineLimit(1)
            }
        }
        .padding(.trailing, 4)
        .padding(.top, 6)
    }
}

struct ExpandedBottomView: View {
    let state: WorkoutSessionState
    var isStale = false

    private var showsRest: Bool { state.isResting && !isStale }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if showsRest, let rest = state.rest {
                HStack(spacing: 8) {
                    restEyebrow(rest)
                        .lineLimit(1)
                    Spacer(minLength: 8)
                    Button(intent: SkipRestIntent()) {
                        Text("Skip")
                            .font(SessionPalette.font(11, .bold))
                            .foregroundStyle(SessionPalette.onAccent)
                            .padding(.vertical, 6)
                            .padding(.horizontal, 12)
                            .background(SessionPalette.accent, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3, style: .continuous)
                            .fill(SessionPalette.ringTrack)
                        RoundedRectangle(cornerRadius: 3, style: .continuous)
                            .fill(SessionPalette.accent)
                            .frame(width: max(6, proxy.size.width * rest.progress()))
                    }
                }
                .frame(height: 6)
            }
            Text(caption)
                .font(SessionPalette.font(11))
                .foregroundStyle(SessionPalette.muted)
                .lineLimit(1)
        }
        .padding(.horizontal, 4)
        .padding(.bottom, 4)
    }

    private func restEyebrow(_ rest: WorkoutSessionState.Rest) -> some View {
        let countdown = Text(timerInterval: rest.startedAt...rest.endsAt, countsDown: true)
        let label = if let round = rest.roundDone {
            Text("REST \(countdown) · ROUND \(round) DONE")
        } else {
            Text("REST \(countdown)")
        }
        return label
            .font(SessionPalette.mono(10, .semibold))
            .kerning(1.5)
            .foregroundStyle(SessionPalette.accent)
    }

    private var caption: String {
        var parts: [String] = []
        if let target = state.target {
            parts.append(target.exerciseName)
            parts.append("set \(target.setNumber) of \(target.setCount)")
        } else {
            parts.append(state.workoutName)
        }
        parts.append("\(state.completedSets)/\(state.totalSets) sets done")
        return parts.joined(separator: " · ")
    }
}

struct CompactTrailingView: View {
    let state: WorkoutSessionState
    var isStale = false

    var body: some View {
        if state.isPaused {
            Text(Formatting.elapsed(state.elapsed(at: state.pausedAt ?? .now)))
                .font(SessionPalette.mono(13, .bold))
                .foregroundStyle(SessionPalette.warning)
                .lineLimit(1)
        } else if state.isResting && !isStale, let rest = state.rest {
            Text(timerInterval: rest.startedAt...rest.endsAt, countsDown: true)
                .font(SessionPalette.mono(14, .bold))
                .foregroundStyle(SessionPalette.accent)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 44)
        } else if let target = state.target {
            Text("SET \(target.setNumber)/\(target.setCount)")
                .font(SessionPalette.mono(13, .bold))
                .foregroundStyle(SessionPalette.positive)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        } else {
            Text("\(state.completedSets)/\(state.totalSets)")
                .font(SessionPalette.mono(13, .bold))
                .foregroundStyle(SessionPalette.positive)
                .lineLimit(1)
        }
    }
}

struct MinimalRingView: View {
    let state: WorkoutSessionState
    var isStale = false

    var body: some View {
        if state.isResting && !isStale, let rest = state.rest {
            SessionRing(progress: rest.progress(), lineWidth: 2.5)
                .frame(width: 19, height: 19)
        } else {
            WorkoutLogoBadge(size: 18, radius: 5)
        }
    }
}
#endif
