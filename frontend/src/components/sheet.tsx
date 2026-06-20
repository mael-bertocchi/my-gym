import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactElement, ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme/theme';

/**
 * @interface SheetProps
 * @description Props for the `Sheet` content container used by screens presented as native sheets.
 */
export interface SheetProps {
    children: ReactNode; /*!< Sheet body content */
    style?: StyleProp<ViewStyle>; /*!< Extra container style */
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.color.surface,
        borderTopLeftRadius: theme.radius.sheet24,
        borderTopRightRadius: theme.radius.sheet24,
        padding: theme.spacing.lg16
    },
    grabber: {
        alignSelf: 'center',
        width: 36,
        height: 4,
        borderRadius: theme.radius.pill999,
        backgroundColor: theme.color.borderStrong,
        marginBottom: theme.spacing.md12
    }
});

/**
 * @function Sheet
 * @description Renders the content container for a natively presented sheet. The detents (`sheetAllowedDetents`,
 * `sheetExpandsWhenScrolledToEdge`, `sheetLargestUndimmedDetentIndex`) are configured by the consumer via
 * `Stack.Screen` options; this component only paints the surface, grabber handle, and bottom safe-area inset.
 *
 * @param {SheetProps} props The sheet props.
 * @returns {ReactElement} The sheet element.
 */
export function Sheet(props: SheetProps): ReactElement {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + theme.spacing.lg16 }, props.style]}>
            <View style={styles.grabber} />
            {props.children}
        </View>
    );
}
