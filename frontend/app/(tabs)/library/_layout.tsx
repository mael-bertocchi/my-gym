import { Pressable } from 'react-native';
import type { ReactElement } from 'react';
import { Stack, router } from 'expo-router';
import { Text } from '@/components';
import { darkHeaderOptions, sheetScreenOptions } from '@/theme/navigation';

/**
 * @constant newExerciseSheetOptions
 * @description Sheet options for the New Exercise flow (medium → large detent).
 */
const newExerciseSheetOptions = sheetScreenOptions([0.6, 1.0]);

/**
 * @constant addVariantSheetOptions
 * @description Sheet options for the Add Variant flow (expands when the brand row reveals).
 */
const addVariantSheetOptions = sheetScreenOptions([0.5, 0.9]);

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
 * @description Native stack for the Library tab: hub, exercises, brands, and the two modal sheet routes.
 *
 * @returns {ReactElement} The Library stack layout.
 */
export default function LibraryLayout(): ReactElement {
    return (
        <Stack screenOptions={{ ...darkHeaderOptions, title: 'Library', headerRight: () => <GearButton /> }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="exercises/index" options={{ title: 'Exercises' }} />
            <Stack.Screen name="exercises/[exerciseId]/index" options={{ title: '' }} />
            <Stack.Screen name="exercises/new" options={newExerciseSheetOptions} />
            <Stack.Screen name="exercises/[exerciseId]/add-variant" options={addVariantSheetOptions} />
            <Stack.Screen name="brands/index" options={{ title: 'Brands' }} />
        </Stack>
    );
}
