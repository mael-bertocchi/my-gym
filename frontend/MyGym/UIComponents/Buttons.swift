import SwiftUI

private struct ExpandedTapTarget: ViewModifier {
    var vertical: CGFloat
    var horizontal: CGFloat

    func body(content: Content) -> some View {
        content
            .padding(.vertical, vertical)
            .padding(.horizontal, horizontal)
            .contentShape(Rectangle())
            .padding(.vertical, -vertical)
            .padding(.horizontal, -horizontal)
    }
}

extension View {
    func expandedTapTarget(vertical: CGFloat = 10, horizontal: CGFloat = 8) -> some View {
        modifier(ExpandedTapTarget(vertical: vertical, horizontal: horizontal))
    }
}

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
                        .tint(isDisabled ? Theme.muted2 : Theme.onAccent)
                } else {
                    Text(title)
                        .font(Theme.font(16, .bold))
                        .foregroundStyle(isDisabled ? Theme.muted2 : Theme.onAccent)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(minHeight: Theme.primaryButtonHeight)
            .background(
                isDisabled ? Theme.fieldFill : fillColor,
                in: RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous)
            )
            .shadow(color: isDisabled ? .clear : fillColor.opacity(0.35), radius: 12, y: 6)
        }
        .disabled(isDisabled || isLoading)
    }

    private var fillColor: Color {
        isDestructive ? Theme.danger : Theme.accentBlue
    }
}

struct FilterChipLabel: View {
    let title: String
    var systemImage: String?
    var isActive = false
    var expands = false

    var body: some View {
        HStack(spacing: 4) {
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.system(size: 11, weight: .semibold))
            }
            Text(title)
                .font(Theme.font(13, .semibold))
        }
        .foregroundStyle(isActive ? .white : Theme.inkSecondary)
        .frame(maxWidth: expands ? .infinity : nil)
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(isActive ? Theme.accentBlue : Theme.fieldFill, in: Capsule())
        .overlay(
            Capsule().strokeBorder(isActive ? Color.clear : Theme.fieldBorder, lineWidth: 1)
        )
        .expandedTapTarget(vertical: 6, horizontal: 2)
    }
}

struct FilterChip: View {
    let title: String
    var systemImage: String?
    var isActive = false
    var expands = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            FilterChipLabel(
                title: title,
                systemImage: systemImage,
                isActive: isActive,
                expands: expands
            )
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isActive ? [.isSelected] : [])
    }
}

struct SegmentedPicker<T: Hashable>: View {
    let options: [(value: T, label: String)]
    @Binding var selection: T
    var fillsWidth = true

    var body: some View {
        HStack(spacing: 4) {
            ForEach(options, id: \.value) { option in
                segment(option.value, label: option.label)
            }
        }
        .padding(3)
        .background(
            Theme.fieldFill,
            in: RoundedRectangle(cornerRadius: Theme.tileRadius + 3, style: .continuous)
        )
    }

    private func segment(_ value: T, label: String) -> some View {
        let isSelected = selection == value
        return Button {
            withAnimation(.easeOut(duration: 0.15)) {
                selection = value
            }
        } label: {
            Text(label)
                .font(Theme.font(13, .semibold))
                .foregroundStyle(isSelected ? Theme.ink : Theme.muted)
                .frame(maxWidth: fillsWidth ? .infinity : nil)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                    isSelected ? Theme.surface : Color.clear,
                    in: RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
                )
                .expandedTapTarget(vertical: 6, horizontal: 2)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}

struct LabeledField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var isSecure = false
    var keyboard: UIKeyboardType = .default
    var contentType: UITextContentType?
    var autocapitalization: TextInputAutocapitalization = .never

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            EyebrowText(label)
            Group {
                if isSecure {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                        .keyboardType(keyboard)
                        .textInputAutocapitalization(autocapitalization)
                        .autocorrectionDisabled()
                }
            }
            .textContentType(contentType)
            .font(Theme.font(15))
            .foregroundStyle(Theme.ink)
            .padding(.horizontal, 16)
            .frame(minHeight: 54)
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
    var systemImage: String?
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
            .foregroundStyle(Theme.accentBlue)
            .expandedTapTarget(vertical: 14, horizontal: 10)
        }
        .buttonStyle(.plain)
    }
}

struct ModalHeader: View {
    let title: String
    var dismissTitle = "Cancel"
    var onDismiss: () -> Void
    var trailingTitle: String?
    var trailingDisabled = false
    var trailingAction: () -> Void = {}

    var body: some View {
        ZStack {
            Text(title)
                .font(Theme.font(16, .bold))
                .foregroundStyle(Theme.ink)
            HStack {
                Button(action: onDismiss) {
                    Text(dismissTitle)
                        .font(Theme.font(15))
                        .foregroundStyle(Theme.muted2)
                        .expandedTapTarget(vertical: 12, horizontal: 10)
                }
                .buttonStyle(.plain)
                Spacer()
                if let trailingTitle {
                    Button(action: trailingAction) {
                        Text(trailingTitle)
                            .font(Theme.font(15, .semibold))
                            .foregroundStyle(trailingDisabled ? Theme.tabInactive : Theme.accentBlue)
                            .expandedTapTarget(vertical: 12, horizontal: 10)
                    }
                    .buttonStyle(.plain)
                    .disabled(trailingDisabled)
                }
            }
        }
        .frame(minHeight: 44)
    }
}
