import { StyleSheet, View } from 'react-native';
import type { ReactElement } from 'react';
import { router } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { GlobalPrimaryButton } from '@/components';

const styles = StyleSheet.create({
    floating: { position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center' }
});

/**
 * @function TabsLayout
 * @description Native bottom-tabs shell (History + Library) with the persistent Start capsule floated above the tab bar; the capsule opens the new-workout flow.
 *
 * @returns {ReactElement} The tabs group layout.
 */
export default function TabsLayout(): ReactElement {
    return (
        <>
            <NativeTabs minimizeBehavior="onScrollDown">
                <NativeTabs.Trigger name="history"><Icon sf="clock.arrow.circlepath" /><Label>History</Label></NativeTabs.Trigger>
                <NativeTabs.Trigger name="library"><Icon sf="square.stack.3d.up.fill" /><Label>Library</Label></NativeTabs.Trigger>
            </NativeTabs>
            <View style={styles.floating} pointerEvents="box-none"><GlobalPrimaryButton isLive={false} onPress={() => { router.push('/workout/new'); }} /></View>
        </>
    );
}
