import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactElement, ReactNode } from 'react';
import { theme } from '@/theme/theme';

/**
 * @interface CardProps
 * @description Props for the raised `Card` container primitive.
 */
export interface CardProps {
    children: ReactNode; /*!< Card content */
    style?: StyleProp<ViewStyle>; /*!< Extra container style */
}

const styles = StyleSheet.create({
    base: {
        backgroundColor: theme.color.raised,
        borderWidth: 1,
        borderColor: theme.color.borderSubtle,
        borderRadius: theme.radius.card16,
        padding: theme.spacing.lg16
    }
});

/**
 * @function Card
 * @description Renders a raised, bordered surface with the standard card radius and padding.
 *
 * @param {CardProps} props The card props.
 * @returns {ReactElement} The card element.
 */
export function Card(props: CardProps): ReactElement {
    return <View style={[styles.base, props.style]}>{props.children}</View>;
}
