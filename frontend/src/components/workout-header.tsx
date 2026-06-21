// frontend/src/components/workout-header.tsx
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ReactElement } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { GlassSurface } from '@/components/glass-surface';
import { formatDuration } from '@/modules/workouts/workouts-compute';
import { theme } from '@/theme/theme';

/**
 * @interface WorkoutHeaderProps
 * @description Props for the live-modal top glass header.
 */
export interface WorkoutHeaderProps {
    startedAt: number; /*!< Epoch ms; drives the elapsed timer */
    finishing: boolean; /*!< Whether Finish is in flight */
    onFinish: () => void; /*!< Finish handler */
    onMinimize: () => void; /*!< Minimize (chevron-down) back to tabs */
}

const styles = StyleSheet.create({
    surface: { marginBottom: theme.spacing.md12 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg16, paddingVertical: theme.spacing.md12 },
    left: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md12 },
    timer: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm8 },
    minimize: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }
});

/**
 * @function WorkoutHeader
 * @description Renders the floating glass header: a Minimize affordance, a live elapsed timer, and a visually-distinct Finish.
 *
 * @param {WorkoutHeaderProps} props The header props.
 * @returns {ReactElement} The header element.
 */
export function WorkoutHeader(props: WorkoutHeaderProps): ReactElement {
    const [elapsedMs, setElapsedMs] = useState<number>(0);

    useEffect((): (() => void) => {
        const tick = (): void => { setElapsedMs(Date.now() - props.startedAt); };
        tick();
        const id = setInterval(tick, 1000);
        return (): void => { clearInterval(id); };
    }, [props.startedAt]);

    return (
        <GlassSurface radius={theme.radius.card16} style={styles.surface}>
            <View style={styles.row}>
                <View style={styles.left}>
                    <Pressable accessibilityRole="button" onPress={props.onMinimize} style={styles.minimize}><Ionicons name="chevron-down" size={22} color={theme.color.textPrimary} /></Pressable>
                    <View style={styles.timer}><Text variant="footnote" tone="secondary">{'Elapsed'}</Text><Text variant="headlineTabular" tone="primary">{formatDuration(elapsedMs)}</Text></View>
                </View>
                <Button label="Finish" variant="primary" loading={props.finishing} onPress={props.onFinish} />
            </View>
        </GlassSurface>
    );
}
