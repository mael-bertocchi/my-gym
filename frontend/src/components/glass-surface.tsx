import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactElement, ReactNode } from 'react';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { useGlassAvailability } from '@/lib/glass';
import { theme } from '@/theme/theme';

/**
 * @interface GlassSurfaceProps
 * @description Props for the 3-tier floating-chrome glass surface.
 */
export interface GlassSurfaceProps {
    children: ReactNode; /*!< Chrome content rendered over the glass */
    radius?: number; /*!< Corner radius; defaults to the pill radius */
    style?: StyleProp<ViewStyle>; /*!< Extra container style */
}

const styles = StyleSheet.create({
    base: { overflow: 'hidden' },
    tint: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.glassTint },
    solid: { backgroundColor: theme.color.glassTint }
});

/**
 * @function GlassSurface
 * @description Renders floating chrome with the §5 3-tier guard (liquid → blur → solid). Layout/tap targets are identical across tiers.
 *
 * @param {GlassSurfaceProps} props The surface props.
 * @returns {ReactElement} The glass surface element.
 */
export function GlassSurface(props: GlassSurfaceProps): ReactElement {
    const tier = useGlassAvailability();
    const radius: number = props.radius ?? theme.radius.pill999;
    const container = [styles.base, { borderRadius: radius }, props.style];

    if (tier === 'liquid') {
        return <GlassView glassEffectStyle="regular" tintColor={theme.color.glassTint} style={container}>{props.children}</GlassView>;
    }
    if (tier === 'blur') {
        return <BlurView tint="systemThinMaterialDark" intensity={40} style={container}><View style={styles.tint} />{props.children}</BlurView>;
    }
    return <View style={[container, styles.solid]}>{props.children}</View>;
}
