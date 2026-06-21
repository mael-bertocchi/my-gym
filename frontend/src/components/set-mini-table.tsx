// frontend/src/components/set-mini-table.tsx
import { StyleSheet, View } from 'react-native';
import type { ReactElement } from 'react';
import { Text } from '@/components/text';
import { parseSetReps, parseSetWeightKg } from '@/modules/workouts/workouts-models';
import type { SetEntry } from '@/modules/workouts/workouts-models';
import { formatWeight } from '@/lib/weight';
import { useWeightUnit } from '@/lib/use-weight-unit';
import { theme } from '@/theme/theme';

/**
 * @interface SetMiniTableProps
 * @description Props for the read-only set mini-table.
 */
export interface SetMiniTableProps {
    sets: SetEntry[]; /*!< The sets to render */
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md12, paddingVertical: theme.spacing.xs4 },
    num: { minWidth: 24 }
});

/**
 * @function SetMiniTable
 * @description Renders a compact read-only table of sets (set#, weight × reps); null weight shows an em-dash (bodyweight).
 *
 * @param {SetMiniTableProps} props The table props.
 * @returns {ReactElement} The mini-table element.
 */
export function SetMiniTable(props: SetMiniTableProps): ReactElement {
    const unit = useWeightUnit();
    return (
        <View>
            {props.sets.map((set, i) => <View key={set.id} style={styles.row}><Text variant="caption" tone="tertiary" style={styles.num}>{String(i + 1)}</Text><Text variant="bodyTabular" tone="primary">{`${formatWeight(parseSetWeightKg(set), unit)} × ${parseSetReps(set) ?? '—'}`}</Text></View>)}
        </View>
    );
}
