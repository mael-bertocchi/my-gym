#if DEBUG
import SwiftUI

struct LiveActivityPreviewScreen: View {
    private let resting = WorkoutSessionState.previewResting()
    private let lifting = WorkoutSessionState.previewLifting()
    private let paused = WorkoutSessionState.previewPaused()

    private var islandFirst: Bool {
        UserDefaults.standard.string(forKey: "open") == "la-preview-island"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                if islandFirst {
                    islandSections
                    lockSections
                } else {
                    lockSections
                    islandSections
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Color(hex: 0x0F1114).ignoresSafeArea())
        .environment(\.colorScheme, .dark)
    }

    @ViewBuilder
    private var lockSections: some View {
        section("LOCK · RESTING") {
            lockCard(resting)
        }
        section("LOCK · LIFTING") {
            lockCard(lifting)
        }
        section("LOCK · PAUSED") {
            lockCard(paused)
        }
    }

    @ViewBuilder
    private var islandSections: some View {
        section("ISLAND · EXPANDED") {
            expandedIsland(resting)
        }
        section("ISLAND · COMPACT") {
            VStack(alignment: .leading, spacing: 12) {
                compactPill(resting)
                compactPill(lifting)
            }
        }
        section("ISLAND · MINIMAL") {
            HStack(spacing: 12) {
                minimalCircle(resting)
                minimalCircle(lifting)
            }
        }
    }

    private func section(_ title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SessionEyebrow(text: title, color: SessionPalette.muted2, size: 10, kerning: 2)
            content()
        }
    }

    private func lockCard(_ state: WorkoutSessionState) -> some View {
        WorkoutLockScreenView(state: state)
            .background(SessionPalette.card.opacity(0.94))
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .frame(width: 366)
    }

    private func expandedIsland(_ state: WorkoutSessionState) -> some View {
        VStack(spacing: 16) {
            HStack(alignment: .top) {
                ExpandedElapsedView(state: state)
                Spacer()
                ExpandedHeartView(state: state)
            }
            ExpandedBottomView(state: state)
        }
        .padding(.vertical, 20)
        .padding(.horizontal, 22)
        .frame(width: 386)
        .background(Color.black)
        .clipShape(RoundedRectangle(cornerRadius: 42, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 42, style: .continuous)
                .strokeBorder(Color.white.opacity(0.07), lineWidth: 1)
        )
    }

    private func compactPill(_ state: WorkoutSessionState) -> some View {
        HStack(spacing: 8) {
            WorkoutLogoBadge(size: 18, radius: 5)
            Spacer(minLength: 0)
            CompactTrailingView(state: state)
        }
        .padding(.horizontal, 12)
        .frame(width: 236, height: 37)
        .background(Color.black, in: RoundedRectangle(cornerRadius: 19, style: .continuous))
    }

    private func minimalCircle(_ state: WorkoutSessionState) -> some View {
        MinimalRingView(state: state)
            .frame(width: 37, height: 37)
            .background(Color.black, in: Circle())
    }
}

extension WorkoutSessionState {
    static func previewResting() -> WorkoutSessionState {
        WorkoutSessionState(
            workoutId: "preview",
            workoutName: "Push day",
            startedAt: .now.addingTimeInterval(-1472),
            pausedAt: nil,
            pausedSeconds: 0,
            completedSets: 12,
            totalSets: 20,
            heartRate: 128,
            rest: Rest(endsAt: .now.addingTimeInterval(84), totalSeconds: 150, roundDone: 2),
            target: previewTarget,
            personalRecord: nil
        )
    }

    static func previewLifting() -> WorkoutSessionState {
        var state = previewResting()
        state.rest = nil
        return state
    }

    static func previewPaused() -> WorkoutSessionState {
        var state = previewResting()
        state.rest = nil
        state.pausedAt = .now
        return state
    }

    private static var previewTarget: TargetSet {
        TargetSet(
            entryId: "entry",
            setId: "set",
            exerciseName: "Incline Press",
            setNumber: 3,
            setCount: 4,
            completedNumbers: [1, 2],
            weightKg: 30,
            reps: 10,
            isWeighted: true,
            weightStep: 2.5,
            supersetLetter: "A",
            partnerLetter: "B",
            partnerName: "Seated Row"
        )
    }
}
#endif
