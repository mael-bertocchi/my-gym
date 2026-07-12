import SwiftUI

struct AdjustLogView: View {
    @Environment(WatchSessionStore.self) private var mirror

    var onLogged: () -> Void

    @State private var weightKg: Double = 0
    @State private var reps: Int = 0
    @State private var crownWeight: Double = 0
    @State private var loaded = false

    private let isCompactScreen = WatchLayout.isCompact

    private var target: WorkoutSessionState.TargetSet? {
        mirror.session?.target
    }

    var body: some View {
        Group {
            if let target {
                ScrollView {
                    VStack(spacing: isCompactScreen ? 8 : 12) {
                        if target.isWeighted {
                            stepperRow(
                                minus: "−\(Formatting.weightNumber(target.weightStep))",
                                plus: "+\(Formatting.weightNumber(target.weightStep))",
                                stepperFont: 11,
                                value: Formatting.weightNumber(weightKg),
                                label: "KG · CROWN",
                                onMinus: { adjustWeight(-target.weightStep) },
                                onPlus: { adjustWeight(target.weightStep) }
                            )
                        }
                        stepperRow(
                            minus: "−1",
                            plus: "+1",
                            stepperFont: 13,
                            value: "\(reps)",
                            label: "REPS",
                            onMinus: { adjustReps(-1) },
                            onPlus: { adjustReps(1) }
                        )
                    }
                    .padding(.horizontal, 4)
                    .padding(.top, 2)
                }
                .safeAreaInset(edge: .bottom) {
                    WatchPillButton(
                        title: logLabel(target),
                        style: .positive,
                        height: isCompactScreen ? 38 : 40,
                        fontSize: 13.5
                    ) {
                        WatchHaptics.play(.success)
                        mirror.send(.logTarget(
                            entryId: target.entryId,
                            setId: target.setId,
                            weightKg: target.isWeighted ? weightKg : nil,
                            reps: reps
                        ))
                        onLogged()
                    }
                    .padding(.horizontal, 4)
                    .padding(.bottom, 2)
                }
                .navigationTitle(target.exerciseName)
                .navigationBarTitleDisplayMode(.inline)
                .focusable(true)
                .digitalCrownRotation(
                    $crownWeight,
                    from: 0,
                    through: 400,
                    by: target.weightStep,
                    sensitivity: .medium,
                    isContinuous: false,
                    isHapticFeedbackEnabled: true
                )
                .onChange(of: crownWeight) { _, value in
                    guard loaded, target.isWeighted else { return }
                    weightKg = value
                }
            }
        }
        .onAppear(perform: load)
        .onChange(of: target?.setId) { _, _ in load() }
    }

    private func load() {
        guard let target else { return }
        weightKg = target.weightKg ?? 0
        reps = target.reps ?? 0
        crownWeight = weightKg
        loaded = true
    }

    private func stepperRow(
        minus: String,
        plus: String,
        stepperFont: CGFloat,
        value: String,
        label: String,
        onMinus: @escaping () -> Void,
        onPlus: @escaping () -> Void
    ) -> some View {
        HStack(spacing: 6) {
            stepperButton(minus, fontSize: stepperFont, action: onMinus)
            VStack(spacing: 1) {
                Text(value)
                    .font(SessionPalette.mono(isCompactScreen ? 25 : 28, .bold))
                    .foregroundStyle(SessionPalette.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .contentTransition(.numericText())
                Text(label)
                    .font(SessionPalette.mono(7.5, .medium))
                    .kerning(1)
                    .foregroundStyle(SessionPalette.muted2)
            }
            .frame(maxWidth: .infinity)
            stepperButton(plus, fontSize: stepperFont, action: onPlus)
        }
    }

    private func stepperButton(_ title: String, fontSize: CGFloat, action: @escaping () -> Void) -> some View {
        let diameter: CGFloat = isCompactScreen ? 34 : 38
        return Button(action: action) {
            Text(title)
                .font(SessionPalette.mono(fontSize, .bold))
                .foregroundStyle(SessionPalette.inkSecondary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .frame(width: diameter, height: diameter)
                .background(SessionPalette.control, in: Circle())
        }
        .buttonStyle(.plain)
    }

    private func logLabel(_ target: WorkoutSessionState.TargetSet) -> String {
        guard target.isWeighted else { return "Log \(reps) reps" }
        return "Log \(Formatting.spacedWeight(weightKg)) × \(reps)"
    }

    private func adjustWeight(_ delta: Double) {
        WatchHaptics.play(.click)
        weightKg = max(0, weightKg + delta)
        crownWeight = weightKg
    }

    private func adjustReps(_ delta: Int) {
        WatchHaptics.play(.click)
        reps = max(0, reps + delta)
    }
}
