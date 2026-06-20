import { StyleSheet, View } from 'react-native';
import type { ReactElement, ReactNode } from 'react';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { theme } from '@/theme/theme';

/**
 * @interface ErrorStateProps
 * @description Props for the `ErrorState` placeholder shown when a surface fails to load.
 */
export interface ErrorStateProps {
    message: string; /*!< Human-readable failure message */
    icon?: ReactNode; /*!< Optional consumer-provided illustration node */
    onRetry?: () => void; /*!< Optional retry handler */
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
 * @function ErrorState
 * @description Renders a centered failure placeholder with an optional icon and retry affordance.
 *
 * @param {ErrorStateProps} props The error-state props.
 * @returns {ReactElement} The error-state element.
 */
export function ErrorState(props: ErrorStateProps): ReactElement {
    return (
        <View style={styles.container}>
            {props.icon}
            <Text tone="danger" style={styles.message}>{props.message}</Text>
            {props.onRetry !== undefined ? <Button variant="secondary" label="Retry" onPress={props.onRetry} /> : null}
        </View>
    );
}
