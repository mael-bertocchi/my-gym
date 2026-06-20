import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { theme } from '@/theme/theme';

/**
 * @constant darkHeaderOptions
 * @description Shared native-stack header options that paint the header with the dark theme so it matches the screen body on both platforms (removes the light header seam on Android).
 */
export const darkHeaderOptions: NativeStackNavigationOptions = {
    headerStyle: { backgroundColor: theme.color.background },
    headerTintColor: theme.color.textPrimary,
    headerTitleStyle: { color: theme.color.textPrimary },
    headerShadowVisible: false
};
