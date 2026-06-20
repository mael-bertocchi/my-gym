import { useState } from 'react';
import { StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactElement } from 'react';
import { Text } from '@/components/text';
import { theme } from '@/theme/theme';
import { typography } from '@/theme/typography';

/**
 * @interface TextInputProps
 * @description Props for the labelled, bottom-border `TextInput` primitive.
 */
export interface TextInputProps {
    value: string; /*!< Current field value */
    onChangeText: (text: string) => void; /*!< Change handler */
    label?: string; /*!< Optional caption label above the field */
    placeholder?: string; /*!< Placeholder shown when empty */
    error?: string; /*!< Optional one-line error below the field */
    secureTextEntry?: boolean; /*!< Masks input for passwords */
    autoFocus?: boolean; /*!< Focuses the field on mount */
    keyboardType?: 'default' | 'email-address'; /*!< Soft-keyboard variant */
    autoCapitalize?: 'none' | 'sentences'; /*!< Auto-capitalization behavior */
    returnKeyType?: 'done' | 'go' | 'next'; /*!< Return-key label */
    onSubmitEditing?: () => void; /*!< Return-key submit handler */
    style?: StyleProp<ViewStyle>; /*!< Extra container style */
}

const styles = StyleSheet.create({
    label: {
        marginBottom: theme.spacing.xs4
    },
    field: {
        backgroundColor: theme.color.surface,
        borderBottomWidth: 1,
        paddingHorizontal: theme.spacing.md12,
        paddingVertical: theme.spacing.sm8,
        borderTopLeftRadius: theme.radius.control12,
        borderTopRightRadius: theme.radius.control12
    },
    input: {
        ...typography.body,
        color: theme.color.textPrimary,
        padding: 0
    },
    error: {
        marginTop: theme.spacing.xs4
    }
});

/**
 * @function TextInput
 * @description Renders a themed text field with an optional label, focus-driven accent underline, and an error line.
 *
 * @param {TextInputProps} props The text-input props.
 * @returns {ReactElement} The text-input element.
 */
export function TextInput(props: TextInputProps): ReactElement {
    const [focused, setFocused] = useState<boolean>(false);

    const hasError: boolean = props.error !== undefined && props.error.length > 0;
    let borderColor: string = theme.color.borderSubtle;
    if (hasError) {
        borderColor = theme.color.danger;
    } else if (focused) {
        borderColor = theme.color.accent;
    }

    const onFocus = (): void => {
        setFocused(true);
    };
    const onBlur = (): void => {
        setFocused(false);
    };

    return (
        <View style={props.style}>
            {props.label !== undefined ? <Text variant="caption" tone="secondary" style={styles.label}>{props.label}</Text> : null}
            <View style={[styles.field, { borderBottomColor: borderColor }]}>
                <RNTextInput value={props.value} onChangeText={props.onChangeText} placeholder={props.placeholder} placeholderTextColor={theme.color.textTertiary} secureTextEntry={props.secureTextEntry} autoFocus={props.autoFocus} keyboardType={props.keyboardType} autoCapitalize={props.autoCapitalize} returnKeyType={props.returnKeyType} onSubmitEditing={props.onSubmitEditing} onFocus={onFocus} onBlur={onBlur} style={styles.input} />
            </View>
            {hasError ? <Text variant="footnote" tone="danger" style={styles.error}>{props.error}</Text> : null}
        </View>
    );
}
