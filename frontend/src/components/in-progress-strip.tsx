import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { ReactElement } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, cancelAnimation } from 'react-native-reanimated';
import { Text } from '@/components/text';
import { theme } from '@/theme/theme';

/**
 * @interface InProgressStripProps
 * @description Props for the live-workout status strip.
 */
export interface InProgressStripProps {
    startedAt: number; /*!< Epoch milliseconds when the workout started */
    onPress: () => void; /*!< Invoked when the strip is tapped */
}

const styles = StyleSheet.create({
    strip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm8,
        backgroundColor: theme.color.raised,
        borderRadius: theme.radius.control12,
        paddingVertical: theme.spacing.sm8,
        paddingHorizontal: theme.spacing.md12
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: theme.radius.pill999,
        backgroundColor: theme.color.accent
    }
});

/**
 * @function InProgressStrip
 * @description Renders a legible solid strip with a pulsing dot and an elapsed `mm:ss` timer that ticks every second.
 *
 * @param {InProgressStripProps} props The strip props.
 * @returns {ReactElement} The strip element.
 */
export function InProgressStrip(props: InProgressStripProps): ReactElement {
    const [elapsedMs, setElapsedMs] = useState<number>(0);
    const pulse = useSharedValue<number>(1);

    useEffect((): (() => void) => {
        const tick = (): void => {
            setElapsedMs(Date.now() - props.startedAt);
        };

        tick();
        const id = setInterval(tick, 1000);

        return (): void => {
            clearInterval(id);
        };
    }, [props.startedAt]);

    useEffect((): (() => void) => {
        pulse.value = withRepeat(withTiming(0.4, { duration: 700 }), -1, true);

        return (): void => {
            cancelAnimation(pulse);
        };
    }, [pulse]);

    const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

    const totalSec: number = Math.floor(elapsedMs / 1000);
    const mm: number = Math.floor(totalSec / 60);
    const ss: number = totalSec % 60;
    const label: string = `in progress ${mm}:${String(ss).padStart(2, '0')}`;

    return (
        <Pressable accessibilityRole="button" onPress={props.onPress} style={styles.strip}>
            <Animated.View style={[styles.dot, dotStyle]} />
            <Text variant="footnote">{label}</Text>
        </Pressable>
    );
}
