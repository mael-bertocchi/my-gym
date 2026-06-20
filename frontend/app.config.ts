import type { ExpoConfig } from 'expo/config';

/**
 * @constant config
 * @description Expo app configuration for the my-gym iOS dev client (dark-only, New Architecture on).
 */
const config: ExpoConfig = {
    name: 'my-gym',
    slug: 'my-gym',
    owner: 'mael-bertocchi',
    scheme: 'mygym',
    version: '0.0.1',
    icon: './assets/icon.png',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    ios: {
        bundleIdentifier: 'fr.maelbertocchi.mygym',
        supportsTablet: false,
        config: {
            usesNonExemptEncryption: false
        }
    },
    android: {
        package: 'fr.maelbertocchi.mygym',
        adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#0B0E13'
        }
    },
    plugins: [
        'expo-router',
        'expo-secure-store',
        ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 200, resizeMode: 'contain', backgroundColor: '#0B0E13' }]
    ],
    experiments: {
        typedRoutes: true
    },
    extra: {
        eas: {
            projectId: '83975846-633c-4816-ba56-33a2245d1368'
        }
    }
};

export default config;
