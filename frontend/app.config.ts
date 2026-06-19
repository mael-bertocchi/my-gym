import type { ExpoConfig } from 'expo/config';

/**
 * @constant config
 * @description Expo app configuration for the my-gym iOS dev client (dark-only, New Architecture on).
 */
const config: ExpoConfig = {
    name: 'my-gym',
    slug: 'my-gym',
    scheme: 'mygym',
    version: '0.0.1',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    ios: {
        bundleIdentifier: 'fr.maelbertocchi.mygym',
        supportsTablet: false
    },
    splash: {
        backgroundColor: '#0B0E13',
        resizeMode: 'contain'
    },
    plugins: [
        'expo-router',
        'expo-secure-store',
        ['expo-splash-screen', { backgroundColor: '#0B0E13', resizeMode: 'contain' }]
    ],
    experiments: {
        typedRoutes: true
    }
};

export default config;
