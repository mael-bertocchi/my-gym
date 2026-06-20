import { useCallback, useEffect } from 'react';
import type { ReactElement } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/modules/identity/identity-provider';
import { useAuth } from '@/modules/identity/identity-hook';
import { createQueryClient } from '@/lib/query-client';

void SplashScreen.preventAutoHideAsync();
const queryClient = createQueryClient();

/**
 * @function RootNavigator
 * @description Renders the protected route tree once auth bootstrap resolves; holds the native splash until then.
 *
 * @returns {ReactElement} The navigator element.
 */
function RootNavigator(): ReactElement {
    const { status } = useAuth();

    const onReady = useCallback((): void => {
        if (status !== 'bootstrapping') {
            void SplashScreen.hideAsync();
        }
    }, [status]);

    useEffect(() => { onReady(); }, [onReady]);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={status === 'signedIn'}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="workout/[workoutId]" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="settings/index" options={{ presentation: 'modal' }} />
                <Stack.Screen name="showcase" />
            </Stack.Protected>
            <Stack.Protected guard={status !== 'signedIn'}>
                <Stack.Screen name="(auth)" />
            </Stack.Protected>
        </Stack>
    );
}

/**
 * @function RootLayout
 * @description App root: safe-area + query + auth providers wrapping the protected navigator.
 *
 * @returns {ReactElement} The root layout element.
 */
export default function RootLayout(): ReactElement {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>
                    <AuthProvider>
                        <RootNavigator />
                    </AuthProvider>
                </QueryClientProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
