import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import type { ReactElement } from 'react';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { theme } from '@/theme/theme';

/**
 * @interface ShimmerProps
 * @description Props for the `Shimmer` placeholder bar used while AI coaching content is in flight.
 */
export interface ShimmerProps {
    width?: DimensionValue; /*!< Bar width (defaults to full width) */
    height?: number; /*!< Bar height in points (defaults to 12) */
    style?: StyleProp<ViewStyle>; /*!< Extra container style */
}

const styles = StyleSheet.create({
    bar: {
        backgroundColor: theme.color.raised,
        borderRadius: theme.radius.control12
    }
});

/**
 * @function Shimmer
 * @description Renders a SOLID placeholder bar with a looping opacity pulse (legal here: the bar is solid content, not glass).
 *
 * @param {ShimmerProps} props The shimmer props.
 * @returns {ReactElement} The shimmer element.
 */
export function Shimmer(props: ShimmerProps): ReactElement {
    const pulse = useSharedValue<number>(0.4);

    useEffect((): (() => void) => {
        pulse.value = withRepeat(withTiming(0.9, { duration: theme.motion.base220 * 3 }), -1, true);
        return (): void => {
            cancelAnimation(pulse);
        };
    }, [pulse]);

    const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
    const width: DimensionValue = props.width ?? '100%';
    const height: number = props.height ?? 12;

    return <Animated.View style={[styles.bar, { width, height }, animatedStyle, props.style]} />;
}
