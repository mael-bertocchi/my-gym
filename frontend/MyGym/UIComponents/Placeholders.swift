import SwiftUI

struct AvatarView: View {
    let name: String
    var size: CGFloat = 42

    var body: some View {
        Circle()
            .fill(Theme.fieldFill)
            .overlay(
                Text(initials)
                    .font(Theme.font(size * 0.36, .bold))
                    .foregroundStyle(Theme.muted)
            )
            .overlay(Circle().strokeBorder(Theme.fieldBorder, lineWidth: 1))
            .frame(width: size, height: size)
    }

    private var initials: String {
        let parts = name.split(separator: " ").prefix(2)
        return parts.map { String($0.prefix(1)) }.joined().uppercased()
    }
}

struct ExerciseThumb: View {
    var size: CGFloat = 42

    var body: some View {
        RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
            .fill(Theme.fieldFill)
            .overlay(
                Image(systemName: "figure.strengthtraining.traditional")
                    .font(.system(size: size * 0.4, weight: .medium))
                    .foregroundStyle(Theme.muted2)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
                    .strokeBorder(Theme.fieldBorder, lineWidth: 1)
            )
            .frame(width: size, height: size)
    }
}

struct LogoMark: View {
    var size: CGFloat = 60

    var body: some View {
        RoundedRectangle(cornerRadius: size * 0.3, style: .continuous)
            .fill(Theme.accentBlue)
            .overlay(
                Image(systemName: "dumbbell.fill")
                    .font(.system(size: size * 0.42, weight: .semibold))
                    .foregroundStyle(.white)
            )
            .frame(width: size, height: size)
            .shadow(color: Theme.accentBlue.opacity(0.35), radius: 12, y: 6)
    }
}
