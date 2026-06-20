import { Pressable, StyleSheet } from 'react-native';
import type { ReactElement } from 'react';
import { Text } from '@/components/text';
import { GlassSurface } from '@/components/glass-surface';
import { theme } from '@/theme/theme';

/**
 * @interface GlobalPrimaryButtonProps
 * @description Props for the persistent Start/Resume floating capsule.
 */
export interface GlobalPrimaryButtonProps {
    isLive: boolean; /*!< Whether a workout is already live (Resume) or not (Start) */
    onPress: () => void; /*!< Invoked when the capsule is tapped */
}

const styles = StyleSheet.create({
    surface: { alignSelf: 'center' },
    pressable: {
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.xl24
    }
});

/**
 * @function GlobalPrimaryButton
 * @description Renders the bottom-anchored glass capsule that starts or resumes a workout; the consumer positions it above the tab bar.
 *
 * @param {GlobalPrimaryButtonProps} props The capsule props.
 * @returns {ReactElement} The capsule element.
 */
export function GlobalPrimaryButton(props: GlobalPrimaryButtonProps): ReactElement {
    const label: string = props.isLive ? 'Resume workout' : 'Start workout';

    return (
        <GlassSurface radius={theme.radius.pill999} style={styles.surface}>
            <Pressable accessibilityRole="button" onPress={props.onPress} style={styles.pressable}>
                <Text variant="headline" tone="accent">{label}</Text>
            </Pressable>
        </GlassSurface>
    );
}
