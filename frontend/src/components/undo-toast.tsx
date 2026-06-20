import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ReactElement } from 'react';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { theme } from '@/theme/theme';

/**
 * @constant DEFAULT_DURATION_MS
 * @description Default lifetime of the toast before it auto-expires.
 */
const DEFAULT_DURATION_MS: number = 5000;

/**
 * @interface UndoToastProps
 * @description Props for the floating `UndoToast` that offers a brief undo window after a destructive action.
 */
export interface UndoToastProps {
    message: string; /*!< Description of the reversible action */
    onUndo: () => void; /*!< Invoked when the user reverses the action */
    onExpire: () => void; /*!< Invoked when the undo window elapses */
    durationMs?: number; /*!< Undo window in milliseconds; defaults to 5000 */
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md12,
        backgroundColor: theme.color.raised,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.color.borderSubtle,
        borderRadius: theme.radius.card16,
        paddingVertical: theme.spacing.md12,
        paddingHorizontal: theme.spacing.lg16
    },
    message: { flexShrink: 1 }
});

/**
 * @function UndoToast
 * @description Renders a solid floating bar that auto-expires after `durationMs`, clearing its timer on unmount or undo.
 *
 * @param {UndoToastProps} props The undo-toast props.
 * @returns {ReactElement} The undo-toast element.
 */
export function UndoToast(props: UndoToastProps): ReactElement {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onExpire = useRef<() => void>(props.onExpire);
    const duration: number = props.durationMs ?? DEFAULT_DURATION_MS;

    onExpire.current = props.onExpire;

    useEffect((): (() => void) => {
        timer.current = setTimeout((): void => {
            onExpire.current();
        }, duration);

        return (): void => {
            if (timer.current !== null) {
                clearTimeout(timer.current);
                timer.current = null;
            }
        };
    }, [duration]);

    const handleUndo = (): void => {
        if (timer.current !== null) {
            clearTimeout(timer.current);
            timer.current = null;
        }
        props.onUndo();
    };

    return (
        <View style={styles.bar}>
            <Text style={styles.message}>{props.message}</Text>
            <Button variant="ghost" label="Undo" onPress={handleUndo} />
        </View>
    );
}
