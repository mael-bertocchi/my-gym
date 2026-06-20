import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactElement } from 'react';
import { Text } from '@/components/text';
import type { TextTone } from '@/components/text';
import { theme } from '@/theme/theme';

/**
 * @interface TagProps
 * @description Props for the pill-shaped `Tag` primitive.
 */
export interface TagProps {
    label: string; /*!< Visible pill label */
    active?: boolean; /*!< Highlights the pill with the accent fill */
    onPress?: () => void; /*!< Tap handler; renders a static pill when absent */
}

const styles = StyleSheet.create({
    base: {
        borderRadius: theme.radius.pill999,
        paddingHorizontal: theme.spacing.md12,
        paddingVertical: theme.spacing.sm8,
        alignSelf: 'flex-start'
    },
    active: {
        backgroundColor: theme.color.accentMuted
    },
    inactive: {
        backgroundColor: theme.color.surface
    }
});

/**
 * @function Tag
 * @description Renders a themed pill that toggles between an accent-filled active state and a neutral inactive state, pressable when `onPress` is provided.
 *
 * @param {TagProps} props The tag props.
 * @returns {ReactElement} The tag element.
 */
export function Tag(props: TagProps): ReactElement {
    const active: boolean = props.active ?? false;
    const containerStyle: StyleProp<ViewStyle> = [styles.base, active ? styles.active : styles.inactive];
    const tone: TextTone = active ? 'accent' : 'secondary';
    const content: ReactElement = <Text variant="footnote" tone={tone}>{props.label}</Text>;

    if (props.onPress === undefined) {
        return <View style={containerStyle}>{content}</View>;
    }

    return <Pressable accessibilityRole="button" onPress={props.onPress} style={containerStyle}>{content}</Pressable>;
}
