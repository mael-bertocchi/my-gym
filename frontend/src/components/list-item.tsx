import { Pressable, StyleSheet, View } from 'react-native';
import type { ReactElement, ReactNode } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import { Text } from '@/components/text';
import { theme } from '@/theme/theme';

/**
 * @interface ListItemProps
 * @description Props for the big-target `ListItem` row, optionally swipe-to-delete.
 */
export interface ListItemProps {
    title: string; /*!< Primary row title */
    subtitle?: string; /*!< Optional secondary line */
    onPress?: () => void; /*!< Tap handler for the row */
    trailing?: ReactNode; /*!< Right-aligned accessory (check, value, chevron) */
    onDelete?: () => void; /*!< When set, enables right-swipe delete */
}

const styles = StyleSheet.create({
    row: {
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.color.surface,
        paddingHorizontal: theme.spacing.lg16,
        paddingVertical: theme.spacing.md12,
        borderBottomWidth: 1,
        borderBottomColor: theme.color.borderSubtle
    },
    text: {
        flex: 1,
        marginRight: theme.spacing.md12
    },
    subtitle: {
        marginTop: theme.spacing.xs4
    },
    deleteAction: {
        backgroundColor: theme.color.dangerFill,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl24
    }
});

/**
 * @function ListItem
 * @description Renders a tappable list row with stacked title/subtitle and a trailing accessory, wrapped in a swipe-to-delete action when `onDelete` is provided.
 *
 * @param {ListItemProps} props The list-item props.
 * @returns {ReactElement} The list-item element.
 */
export function ListItem(props: ListItemProps): ReactElement {
    const row: ReactElement = (
        <Pressable accessibilityRole="button" onPress={props.onPress} style={styles.row}>
            <View style={styles.text}>
                <Text variant="headline" tone="primary">{props.title}</Text>
                {props.subtitle !== undefined ? <Text variant="footnote" tone="secondary" style={styles.subtitle}>{props.subtitle}</Text> : null}
            </View>
            {props.trailing}
        </Pressable>
    );

    if (props.onDelete === undefined) {
        return row;
    }

    const onDelete: () => void = props.onDelete;
    const renderRightActions = (): ReactElement => {
        return (
            <Pressable accessibilityRole="button" onPress={onDelete} style={styles.deleteAction}><Text variant="headline" tone="danger">{'Delete'}</Text></Pressable>
        );
    };

    return <Swipeable renderRightActions={renderRightActions}>{row}</Swipeable>;
}
