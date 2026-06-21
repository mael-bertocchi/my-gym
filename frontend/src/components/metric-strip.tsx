// frontend/src/components/metric-strip.tsx
import { StyleSheet, View } from 'react-native';
import type { ReactElement } from 'react';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { theme } from '@/theme/theme';

/**
 * @interface MetricItem
 * @description One metric in the 3-up strip.
 */
export interface MetricItem {
    label: string; /*!< Metric caption */
    value: string; /*!< Formatted value */
    accent?: boolean; /*!< Whether to tint the value with the accent (Volume) */
}

/**
 * @interface MetricStripProps
 * @description Props for the 3-up metric strip.
 */
export interface MetricStripProps {
    items: MetricItem[]; /*!< The metrics to render */
}

const styles = StyleSheet.create({
    card: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.lg16 },
    cell: { flex: 1, alignItems: 'center' }
});

/**
 * @function MetricStrip
 * @description Renders a solid 3-up metric strip (e.g. Volume / Sets / Exercises) with tabular values.
 *
 * @param {MetricStripProps} props The strip props.
 * @returns {ReactElement} The metric-strip element.
 */
export function MetricStrip(props: MetricStripProps): ReactElement {
    return (
        <Card style={styles.card}>
            {props.items.map((item) => <View key={item.label} style={styles.cell}><Text variant="headlineTabular" tone={item.accent !== true ? 'primary' : 'accent'}>{item.value}</Text><Text variant="caption" tone="secondary">{item.label}</Text></View>)}
        </Card>
    );
}
