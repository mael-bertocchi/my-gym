// frontend/src/components/set-row.tsx
import { StyleSheet, View } from 'react-native';
import type { ReactElement } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { NumericField } from '@/components/numeric-field';
import { RepsField } from '@/components/reps-field';
import { formatWeight } from '@/lib/weight';
import { useWeightUnit } from '@/lib/use-weight-unit';
import type { SetEntry } from '@/modules/workouts/workouts-models';
import type { Maybe } from '@/shared/models';
import { theme } from '@/theme/theme';

/**
 * @interface DraftSet
 * @description The in-progress, uncommitted weight/reps a user is editing for a row.
 */
export interface DraftSet {
    weightKg: Maybe<number>; /*!< kg, or null for bodyweight */
    reps: Maybe<number>; /*!< reps, or null */
}

/**
 * @interface SetRowProps
 * @description Props for one set row: a committed/pending/failed set, or a fresh draft row.
 */
export interface SetRowProps {
    index: number; /*!< 1-based set number for display */
    set: Maybe<SetEntry>; /*!< The committed/pending/failed set, or null for a fresh draft */
    prev: Maybe<DraftSet>; /*!< The previous set's values shown as a ghost */
    draft: DraftSet; /*!< The current editable draft */
    bodyweight: boolean; /*!< Whether the variant is bodyweight (disables the weight field) */
    onChange: (draft: DraftSet) => void; /*!< Draft change handler */
    onDone: () => void; /*!< Commit handler (logs the set, starts rest, advances) */
    onRetry: () => void; /*!< Retry handler for a failed row */
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm8, paddingVertical: theme.spacing.sm8 },
    num: { minWidth: 24 },
    ghost: { minWidth: 56 },
    fields: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm8, flexWrap: 'wrap' },
    tick: { minWidth: 44, alignItems: 'center' }
});

/**
 * @function SetRow
 * @description Renders the default set row {set#, ghost Prev, weight, reps, Done}; a committed set shows a success tick, a pending set shows a loading Done, and a failed set swaps Done for an inline Retry.
 *
 * @param {SetRowProps} props The set-row props.
 * @returns {ReactElement} The set-row element.
 */
export function SetRow(props: SetRowProps): ReactElement {
    const unit = useWeightUnit();
    const committed: boolean = props.set !== null && props.set.isCompleted && props.set.pending !== true && props.set.failed !== true;
    const failed: boolean = props.set !== null && props.set.failed === true;
    const pending: boolean = props.set !== null && props.set.pending === true;

    const ghost: string = props.prev !== null ? `${formatWeight(props.prev.weightKg, unit)} × ${props.prev.reps ?? '—'}` : '—';

    let trailing: ReactElement;
    if (committed) {
        trailing = <View style={styles.tick}><Ionicons name="checkmark-circle" size={22} color={theme.color.success} /></View>;
    } else if (failed) {
        trailing = <Button label="Retry" variant="danger" onPress={props.onRetry} />;
    } else {
        trailing = <Button label="Done" variant="primary" loading={pending} onPress={props.onDone} />;
    }

    return (
        <View style={styles.row}>
            <Text variant="caption" tone="tertiary" style={styles.num}>{String(props.index)}</Text>
            <Text variant="caption" tone="tertiary" style={styles.ghost} numberOfLines={1}>{ghost}</Text>
            <View style={styles.fields}>
                <NumericField value={props.draft.weightKg} disabled={props.bodyweight} onChange={(weightKg) => { props.onChange({ weightKg, reps: props.draft.reps }); }} />
                <RepsField value={props.draft.reps} onChange={(reps) => { props.onChange({ weightKg: props.draft.weightKg, reps }); }} />
            </View>
            {trailing}
        </View>
    );
}
