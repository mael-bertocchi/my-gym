import { View, StyleSheet } from 'react-native';
import type { ReactElement } from 'react';
import { Tabs, router } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { GlassTabBar, GlobalPrimaryButton } from '@/components';

const styles = StyleSheet.create({
    capsule: { position: 'absolute', left: 0, right: 0, bottom: 112, alignItems: 'center' }
});

/**
 * @function renderTabBar
 * @description Renders the floating Start capsule above the custom glass tab bar; both persist across tabs.
 *
 * @param {BottomTabBarProps} props The navigator's tab-bar props.
 * @returns {ReactElement} The combined bottom chrome.
 */
function renderTabBar(props: BottomTabBarProps): ReactElement {
    return (
        <>
            <View style={styles.capsule} pointerEvents="box-none"><GlobalPrimaryButton isLive={false} onPress={() => { router.push('/workout/new'); }} /></View>
            <GlassTabBar {...props} />
        </>
    );
}

/**
 * @function TabsLayout
 * @description Bottom-tabs shell (History + Library) using the cross-platform GlassTabBar with the floating Start capsule above it.
 *
 * @returns {ReactElement} The tabs layout.
 */
export default function TabsLayout(): ReactElement {
    return (
        <Tabs tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="history" />
            <Tabs.Screen name="library" />
        </Tabs>
    );
}
