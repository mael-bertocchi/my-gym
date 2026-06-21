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

/**
 * @function sheetScreenOptions
 * @description Cross-platform modal-sheet options. With presentation 'formSheet' the detent + corner-radius props produce a true partial Liquid Glass sheet on iOS; on Android the detents are ignored and a standard modal renders. The header is hidden because the inner `Sheet` paints its own grabber and surface; contentStyle stays transparent so the inner `Sheet` is the only visible surface (avoids the Android double-paint seam).
 *
 * @param {number[]} detents The iOS detent fractions (ignored on Android).
 * @returns {NativeStackNavigationOptions} The screen options.
 */
export function sheetScreenOptions(detents: number[]): NativeStackNavigationOptions {
    return {
        presentation: 'formSheet',
        headerShown: false,
        gestureEnabled: true,
        contentStyle: { backgroundColor: 'transparent' },
        sheetAllowedDetents: detents,
        sheetGrabberVisible: false,
        sheetCornerRadius: theme.radius.sheet24,
        sheetExpandsWhenScrolledToEdge: false
    };
}
