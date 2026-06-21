import { Pressable, StyleSheet, View } from 'react-native';
import type { ReactElement } from 'react';
import { Text } from '@/components/text';
import { theme } from '@/theme/theme';

/**
 * @interface RestTimerStripProps
 * @description Props for the inline solid rest-countdown strip.
 */
export interface RestTimerStripProps {
    remainingSec: number; /*!< Seconds left to show as mm:ss */
    onAdjust: (deltaSec: number) => void; /*!< −15 / +15 handler */
    onSkip: () => void; /*!< Skip handler */
}

const styles = StyleSheet.create({
    strip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm8, backgroundColor: theme.color.raised, borderRadius: theme.radius.control12, paddingVertical: theme.spacing.sm8, paddingHorizontal: theme.spacing.md12, marginBottom: theme.spacing.md12 },
    control: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }
});

/**
 * @function RestTimerStrip
 * @description Renders the inline solid rest countdown with −15 / +15 / Skip controls and a tabular mm:ss readout.
 *
 * @param {RestTimerStripProps} props The strip props.
 * @returns {ReactElement} The strip element.
 */
export function RestTimerStrip(props: RestTimerStripProps): ReactElement {
    const minutes: number = Math.floor(props.remainingSec / 60);
    const seconds: number = props.remainingSec % 60;
    const label: string = `${minutes}:${String(seconds).padStart(2, '0')}`;

    return (
        <View style={styles.strip}>
            <Pressable accessibilityRole="button" onPress={() => { props.onAdjust(-15); }} style={styles.control}><Text variant="footnote" tone="accent">{'−15'}</Text></Pressable>
            <Text variant="headlineTabular" tone="primary">{label}</Text>
            <Pressable accessibilityRole="button" onPress={() => { props.onAdjust(15); }} style={styles.control}><Text variant="footnote" tone="accent">{'+15'}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={props.onSkip} style={styles.control}><Text variant="footnote" tone="secondary">{'Skip'}</Text></Pressable>
        </View>
    );
}
