import { Pressable } from 'react-native';
import type { ReactElement } from 'react';
import { Stack, router } from 'expo-router';
import { Text } from '@/components';

/**
 * @function GearButton
 * @description Header-right gear affordance that opens the settings modal.
 *
 * @returns {ReactElement} The gear button element.
 */
function GearButton(): ReactElement {
    return <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { router.push('/settings'); }}><Text variant="title" tone="accent">⚙</Text></Pressable>;
}

/**
 * @function LibraryLayout
 * @description Native stack for the Library tab; the header carries the settings gear.
 *
 * @returns {ReactElement} The Library stack layout.
 */
export default function LibraryLayout(): ReactElement {
    return <Stack screenOptions={{ title: 'Library', headerRight: () => <GearButton /> }} />;
}
