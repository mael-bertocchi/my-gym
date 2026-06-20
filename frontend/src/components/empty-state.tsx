import { StyleSheet, View } from 'react-native';
import type { ReactElement, ReactNode } from 'react';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { theme } from '@/theme/theme';

/**
 * @interface EmptyStateProps
 * @description Props for the `EmptyState` placeholder shown when a collection has no items.
 */
export interface EmptyStateProps {
    message: string; /*!< Reason the surface is empty */
    icon?: ReactNode; /*!< Optional consumer-provided illustration node */
    actionLabel?: string; /*!< Optional call-to-action label */
    onAction?: () => void; /*!< Optional call-to-action handler */
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.xl24,
        paddingVertical: theme.spacing.xxl32,
        gap: theme.spacing.lg16
    },
    message: { textAlign: 'center' }
});

/**
 * @function EmptyState
 * @description Renders a centered empty-collection placeholder with an optional icon and call-to-action.
 *
 * @param {EmptyStateProps} props The empty-state props.
 * @returns {ReactElement} The empty-state element.
 */
export function EmptyState(props: EmptyStateProps): ReactElement {
    const hasAction: boolean = props.actionLabel !== undefined && props.onAction !== undefined;

    return (
        <View style={styles.container}>
            {props.icon}
            <Text tone="secondary" style={styles.message}>{props.message}</Text>
            {hasAction ? <Button variant="ghost" label={props.actionLabel ?? ''} onPress={props.onAction ?? ((): void => {})} /> : null}
        </View>
    );
}
