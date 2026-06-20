import { Pressable, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactElement } from 'react';
import { Text } from '@/components/text';
import type { TextTone } from '@/components/text';
import { Spinner } from '@/components/spinner';
import { theme } from '@/theme/theme';

/**
 * @type ButtonVariant
 * @description Visual variants available to the `Button` primitive.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * @interface ButtonProps
 * @description Props for the pressable `Button` primitive.
 */
export interface ButtonProps {
    label: string; /*!< Visible button label */
    onPress: () => void; /*!< Tap handler */
    variant?: ButtonVariant; /*!< Visual variant; defaults to `primary` */
    loading?: boolean; /*!< Shows a spinner and blocks presses */
    disabled?: boolean; /*!< Disables the control and dims it */
    style?: StyleProp<ViewStyle>; /*!< Extra container style */
}

const styles = StyleSheet.create({
    base: {
        minHeight: 52,
        borderRadius: theme.radius.control12,
        paddingHorizontal: theme.spacing.lg16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    primary: { backgroundColor: theme.color.accent },
    secondary: { backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.borderSubtle },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: theme.color.dangerFill }
});

/**
 * @constant variantStyle
 * @description Resolves each variant to its container style, avoiding index-access undefined.
 */
const variantStyle: Record<ButtonVariant, StyleProp<ViewStyle>> = {
    primary: styles.primary,
    secondary: styles.secondary,
    ghost: styles.ghost,
    danger: styles.danger
};

/**
 * @constant variantTone
 * @description Resolves each variant to its label ink tone.
 */
const variantTone: Record<ButtonVariant, TextTone> = {
    primary: 'onAccent',
    secondary: 'primary',
    ghost: 'accent',
    danger: 'danger'
};

/**
 * @function Button
 * @description Renders a themed pressable with per-variant fills, a 52pt tap target, loading and disabled states.
 *
 * @param {ButtonProps} props The button props.
 * @returns {ReactElement} The button element.
 */
export function Button(props: ButtonProps): ReactElement {
    const variant: ButtonVariant = props.variant ?? 'primary';
    const loading: boolean = props.loading ?? false;
    const blocked: boolean = loading || (props.disabled ?? false);
    const tone: TextTone = blocked ? 'disabled' : variantTone[variant];
    const spinnerColor: string = variant !== 'primary' ? theme.color.accent : theme.color.onAccent;
    const containerStyle = [styles.base, variantStyle[variant], blocked ? { opacity: 0.5 } : null, props.style];

    return (
        <Pressable accessibilityRole="button" onPress={props.onPress} disabled={blocked} style={containerStyle}>
            {loading ? <Spinner color={spinnerColor} /> : <Text variant="headline" tone={tone}>{props.label}</Text>}
        </Pressable>
    );
}
