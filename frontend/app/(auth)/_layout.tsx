import { Stack } from 'expo-router';
import type { ReactElement } from 'react';

/**
 * @function AuthLayout
 * @description Headerless stack for the unauthenticated group; back gesture disabled (no history to pop to).
 *
 * @returns {ReactElement} The auth group layout.
 */
export default function AuthLayout(): ReactElement {
    return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}
