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
        package: 'fr.maelbertocchi.mygym'
    },
    plugins: [
        'expo-router',
        'expo-secure-store'
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
