import { Text as RNText } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import type { ReactElement, ReactNode } from 'react';
import { typography } from '@/theme/typography';
import type { TypographyVariant } from '@/theme/typography';
import { theme } from '@/theme/theme';

/**
 * @type TextTone
 * @description Semantic ink tones mapped to the matching `theme.color` values.
 */
export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'disabled' | 'accent' | 'danger' | 'success' | 'onAccent';

/**
 * @interface TextProps
 * @description Props for the typographic `Text` primitive.
 */
export interface TextProps {
    variant?: TypographyVariant; /*!< Type-scale variant; defaults to `body` */
    tone?: TextTone; /*!< Semantic ink tone; defaults to `primary` */
    style?: StyleProp<TextStyle>; /*!< Extra text style */
    numberOfLines?: number; /*!< Truncation line limit */
    children: ReactNode; /*!< Text content */
}

/**
 * @constant toneColor
 * @description Resolves each `TextTone` to its concrete theme color, avoiding index-access undefined.
 */
const toneColor: Record<TextTone, string> = {
    primary: theme.color.textPrimary,
    secondary: theme.color.textSecondary,
    tertiary: theme.color.textTertiary,
    disabled: theme.color.textDisabled,
    accent: theme.color.accent,
    danger: theme.color.danger,
    success: theme.color.success,
    onAccent: theme.color.onAccent
};

/**
 * @function Text
 * @description Renders themed text using the §2.3 type scale and a semantic ink tone.
 *
 * @param {TextProps} props The text props.
 * @returns {ReactElement} The text element.
 */
export function Text(props: TextProps): ReactElement {
    const variant: TypographyVariant = props.variant ?? 'body';
    const tone: TextTone = props.tone ?? 'primary';

    return <RNText numberOfLines={props.numberOfLines} style={[typography[variant], { color: toneColor[tone] }, props.style]}>{props.children}</RNText>;
}
