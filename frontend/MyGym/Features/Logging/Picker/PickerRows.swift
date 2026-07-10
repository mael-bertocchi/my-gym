import SwiftUI

struct PickerSearchField: View {
    @Binding var text: String

    var body: some View {
        SearchField(
            text: $text,
            prompt: "Search exercises…",
            accessibilityLabel: "Search exercises"
        )
    }
}

struct PickerExerciseRow: View {
    let exercise: Exercise
    let subtitle: String
    let prText: String?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 13) {
                ExerciseThumb(size: 42)
                VStack(alignment: .leading, spacing: 2) {
                    Text(exercise.name)
                        .font(Theme.font(15, .bold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                    Text(subtitle)
                        .font(Theme.mono(11))
                        .foregroundStyle(Theme.muted2)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                if let prText {
                    Text(prText)
                        .font(Theme.font(11))
                        .foregroundStyle(Theme.muted2)
                        .multilineTextAlignment(.trailing)
                }
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
        }
        .buttonStyle(.plain)
        .card()
    }
}

struct PickerCreateRow: View {
    let title: String
    var subtitle = "Add a machine you don't see"
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 13) {
                RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
                    .fill(Theme.accentBlueTint)
                    .frame(width: 42, height: 42)
                    .overlay(
                        Image(systemName: "plus")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(Theme.accentBlue)
                    )
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(Theme.font(14, .bold))
                        .foregroundStyle(Theme.accentBlue)
                        .lineLimit(1)
                    Text(subtitle)
                        .font(Theme.font(12))
                        .foregroundStyle(Theme.muted2)
                }
                Spacer(minLength: 0)
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                Theme.screenBackground,
                in: RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                    .strokeBorder(
                        Theme.controlOutline,
                        style: StrokeStyle(lineWidth: 1, dash: [5, 4])
                    )
            )
            .contentShape(RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct PickerEmptyState: View {
    var body: some View {
        VStack(spacing: 12) {
            ExerciseThumb(size: 56)
            Text("No exercises yet")
                .font(Theme.font(16, .bold))
                .foregroundStyle(Theme.ink)
            Text("The machines you train on will show up here.\nCreate the first one to start logging.")
                .font(Theme.font(13))
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)
                .lineSpacing(3)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 44)
        .padding(.bottom, 24)
    }
}
