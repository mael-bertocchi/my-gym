import { Pressable, StyleSheet, View } from 'react-native';
import type { ReactElement } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { GlassSurface } from '@/components/glass-surface';
import { Text } from '@/components/text';
import { theme } from '@/theme/theme';

/**
 * @interface TabMeta
 * @description Icon glyphs (filled/outline) and label for one tab route.
 */
interface TabMeta {
    label: string; /*!< Visible label under the icon */
    active: keyof typeof Ionicons.glyphMap; /*!< Filled glyph for the focused tab */
    inactive: keyof typeof Ionicons.glyphMap; /*!< Outline glyph for unfocused tabs */
}

/**
 * @constant TAB_META
 * @description Route-name → presentation for the two tabs; unknown routes fall back to a dot.
 */
const TAB_META: Record<string, TabMeta> = {
    history: { label: 'History', active: 'time', inactive: 'time-outline' },
    library: { label: 'Library', active: 'albums', inactive: 'albums-outline' }
};

const styles = StyleSheet.create({
    wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
    bar: { flexDirection: 'row' },
    item: { alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs4, paddingVertical: theme.spacing.sm8, paddingHorizontal: theme.spacing.xl24 }
});

/**
 * @function GlassTabBar
 * @description Cross-platform bottom tab bar on GlassSurface (Liquid Glass on iOS, dark blur on Android). Mirrors the navigator's tab state and routes taps through react-navigation.
 *
 * @param {BottomTabBarProps} props The bottom-tab bar props from the navigator.
 * @returns {ReactElement} The tab bar element.
 */
export function GlassTabBar(props: BottomTabBarProps): ReactElement {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.wrap, { paddingBottom: insets.bottom + theme.spacing.sm8 }]} pointerEvents="box-none">
            <GlassSurface style={styles.bar}>
                {props.state.routes.map((route, index) => {
                    const meta: TabMeta = TAB_META[route.name] ?? { label: route.name, active: 'ellipse', inactive: 'ellipse-outline' };
                    const focused: boolean = props.state.index === index;
                    const color: string = focused ? theme.color.accent : theme.color.textSecondary;

                    const onPress = (): void => {
                        const event = props.navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                        if (focused || event.defaultPrevented) {
                            return;
                        }
                        props.navigation.navigate(route.name);
                    };

                    return (
                        <Pressable key={route.key} accessibilityRole="button" accessibilityState={{ selected: focused }} style={styles.item} onPress={onPress}>
                            <Ionicons name={focused ? meta.active : meta.inactive} size={24} color={color} />
                            <Text variant="caption" tone={focused ? 'accent' : 'secondary'}>{meta.label}</Text>
                        </Pressable>
                    );
                })}
            </GlassSurface>
        </View>
    );
}
