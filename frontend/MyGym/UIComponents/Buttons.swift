import SwiftUI

struct PrimaryButton: View {
    let title: String
    var isDestructive = false
    var isLoading = false
    var isDisabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text(title)
                        .font(Theme.font(16, .bold))
                        .foregroundStyle(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: Theme.primaryButtonHeight)
            .background(
                fillColor,
                in: RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous)
            )
            .shadow(color: fillColor.opacity(0.35), radius: 12, y: 6)
        }
        .disabled(isDisabled || isLoading)
        .opacity(isDisabled ? 0.5 : 1)
    }

    private var fillColor: Color {
        isDestructive ? Theme.danger : Theme.accentBlue
    }
}

struct FilterChip: View {
    let title: String
    var systemImage: String?
    var isActive = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 11, weight: .semibold))
                }
                Text(title)
                    .font(Theme.font(13, .semibold))
            }
            .foregroundStyle(isActive ? .white : Theme.inkSecondary)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isActive ? Theme.accentBlue : Theme.fieldFill, in: Capsule())
            .overlay(
                Capsule().strokeBorder(isActive ? Color.clear : Theme.fieldBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

struct SegmentedPicker<T: Hashable>: View {
    let options: [(value: T, label: String)]
    @Binding var selection: T

    var body: some View {
        HStack(spacing: 4) {
            ForEach(options, id: \.value) { option in
                Button {
                    withAnimation(.easeOut(duration: 0.15)) {
                        selection = option.value
                    }
                } label: {
                    Text(option.label)
                        .font(Theme.font(13, .semibold))
                        .foregroundStyle(selection == option.value ? .white : Theme.muted)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .background(
                            selection == option.value ? Theme.ink : Color.clear,
                            in: Capsule()
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .background(Theme.fieldFill, in: Capsule())
        .overlay(Capsule().strokeBorder(Theme.fieldBorder, lineWidth: 1))
    }
}

struct LabeledField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var isSecure = false
    var keyboard: UIKeyboardType = .default
    var contentType: UITextContentType?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            EyebrowText(label)
            Group {
                if isSecure {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                        .keyboardType(keyboard)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }
            }
            .textContentType(contentType)
            .font(Theme.font(15))
            .foregroundStyle(Theme.ink)
            .padding(.horizontal, 16)
            .frame(height: 54)
            .background(Theme.fieldFill, in: RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous)
                    .strokeBorder(Theme.fieldBorder, lineWidth: 1)
            )
        }
    }
}

struct InlineLink: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(Theme.font(13, .semibold))
                .foregroundStyle(Theme.accentBlue)
        }
        .buttonStyle(.plain)
    }
}
