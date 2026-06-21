import { StyleSheet, View } from 'react-native';
import type { ReactElement } from 'react';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { GlassTabBar, GlobalPrimaryButton, InProgressStrip } from '@/components';
import { useActiveWorkout } from '@/modules/workouts/active-workout-hook';

const styles = StyleSheet.create({
    strip: { position: 'absolute', left: 0, right: 0, bottom: 168, alignItems: 'center' },
    capsule: { position: 'absolute', left: 0, right: 0, bottom: 112, alignItems: 'center' }
});

/**
 * @function BottomChrome
 * @description Renders the live strip (when a workout is live), the Start/Resume capsule, and the glass tab bar.
 *
 * @param {BottomTabBarProps} props The navigator's tab-bar props.
 * @returns {ReactElement} The combined bottom chrome.
 */
function BottomChrome(props: BottomTabBarProps): ReactElement {
    const { isLive, session, resume, start } = useActiveWorkout();

    const onPrimary = (): void => {
        if (isLive) {
            resume();
            return;
        }
        void start();
    };

    return (
        <>
            {isLive && session !== null ? <View style={styles.strip} pointerEvents="box-none"><InProgressStrip startedAt={session.startedAt} onPress={resume} /></View> : null}
            <View style={styles.capsule} pointerEvents="box-none"><GlobalPrimaryButton isLive={isLive} onPress={onPrimary} /></View>
            <GlassTabBar {...props} />
        </>
    );
}

/**
 * @function renderTabBar
 * @description Adapter passing the navigator props into BottomChrome (so it can call hooks).
 *
 * @param {BottomTabBarProps} props The navigator's tab-bar props.
 * @returns {ReactElement} The bottom chrome element.
 */
function renderTabBar(props: BottomTabBarProps): ReactElement {
    return <BottomChrome {...props} />;
}

/**
 * @function TabsLayout
 * @description Bottom-tabs shell (History + Library) using the cross-platform GlassTabBar with the floating Start/Resume capsule and live strip above it.
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
