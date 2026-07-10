import SwiftUI

struct FinishWorkoutSheet: View {
    var onFinish: (Int?, Int?) -> Void

    @State private var difficulty: Int?
    @State private var enjoyment: Int?

    var body: some View {
        VStack(spacing: 0) {
            ModalHeader(title: "Finish workout")
                .padding(.top, 24)
                .padding(.bottom, 6)

            Text("Saved to your history, both ratings are optional.")
                .font(Theme.font(13))
                .foregroundStyle(Theme.muted2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.bottom, 26)

            VStack(alignment: .leading, spacing: 0) {
                EyebrowText("DIFFICULTY", size: 11)
                    .padding(.bottom, 10)
                difficultyScale
                    .padding(.bottom, 8)
                Text(difficultyLabel)
                    .font(Theme.font(12, .semibold))
                    .foregroundStyle(difficulty == nil ? Theme.muted2 : Theme.accentBlueSoft)
                    .padding(.bottom, 26)

                EyebrowText("ENJOYMENT", size: 11)
                    .padding(.bottom, 6)
                enjoymentScale
            }

            Spacer(minLength: 16)
        }
        .padding(.horizontal, 24)
        .background(Theme.surface.ignoresSafeArea())
        .safeAreaInset(edge: .bottom) { footer }
        .presentationDetents([.height(440)])
        .presentationDragIndicator(.visible)
    }

    private var difficultyScale: some View {
        HStack(spacing: 4) {
            ForEach(1...10, id: \.self) { value in
                let isSelected = difficulty == value
                Button {
                    difficulty = isSelected ? nil : value
                    Haptics.impact(.light)
                } label: {
                    Text("\(value)")
                        .font(Theme.font(14, .bold))
                        .foregroundStyle(isSelected ? Theme.onAccent : Theme.ink)
                        .frame(maxWidth: .infinity)
                        .frame(height: 42)
                        .background(
                            isSelected ? Theme.accentBlue : Theme.fieldFill,
                            in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
                                .strokeBorder(isSelected ? Theme.accentBlue : Theme.fieldBorder, lineWidth: 1)
                        )
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Difficulty \(value) of 10")
                .accessibilityAddTraits(isSelected ? [.isSelected] : [])
            }
        }
    }

    private var difficultyLabel: String {
        switch difficulty {
        case nil: "How hard did it feel?"
        case 1, 2: "Easy"
        case 3, 4: "Moderate"
        case 5, 6: "Somewhat hard"
        case 7, 8: "Hard"
        case 9: "Very hard"
        default: "Max effort"
        }
    }

    private var enjoymentScale: some View {
        HStack(spacing: 6) {
            ForEach(1...5, id: \.self) { value in
                let isFilled = value <= (enjoyment ?? 0)
                Button {
                    enjoyment = enjoyment == value ? nil : value
                    Haptics.impact(.light)
                } label: {
                    Image(systemName: isFilled ? "star.fill" : "star")
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundStyle(isFilled ? Theme.accentBlue : Theme.muted2)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Enjoyment \(value) of 5")
                .accessibilityAddTraits(value <= (enjoyment ?? 0) ? [.isSelected] : [])
            }
        }
    }

    private var footer: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Theme.divider)
                .frame(height: 1)
            PrimaryButton(title: "Finish workout") {
                onFinish(difficulty, enjoyment)
            }
            .padding(.horizontal, 24)
            .padding(.top, 16)
            .padding(.bottom, 12)
        }
        .background(Theme.surface)
    }
}
