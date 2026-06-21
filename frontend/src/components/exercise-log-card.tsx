// frontend/src/components/exercise-log-card.tsx
import { StyleSheet, View } from 'react-native';
import type { ReactElement } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { SetRow } from '@/components/set-row';
import type { DraftSet } from '@/components/set-row';
import { parseSetReps, parseSetWeightKg } from '@/modules/workouts/workouts-models';
import type { SetEntry, WorkoutEntry } from '@/modules/workouts/workouts-models';
import type { Maybe } from '@/shared/models';
import { theme } from '@/theme/theme';

/**
 * @interface ExerciseLogCardProps
 * @description Props for one exercise card in the live modal.
 */
export interface ExerciseLogCardProps {
    entry: WorkoutEntry; /*!< The exercise entry with its sets */
    draft: DraftSet; /*!< The current draft for the next set */
    onChangeDraft: (draft: DraftSet) => void; /*!< Draft change handler */
    onDone: () => void; /*!< Commit the draft set */
    onRetrySet: (setId: string) => void; /*!< Retry a failed set */
    onAddSet: () => void; /*!< Add another set row */
}

const styles = StyleSheet.create({
    card: { marginBottom: theme.spacing.md12 },
    header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm8, marginBottom: theme.spacing.sm8 },
    title: { flex: 1 }
});

/**
 * @function lastCommitted
 * @description Returns the draft values of the last committed set, or null when none.
 *
 * @param {SetEntry[]} sets The entry's sets.
 * @returns {Maybe<DraftSet>} The previous values, or null.
 */
function lastCommitted(sets: SetEntry[]): Maybe<DraftSet> {
    const committed: SetEntry[] = sets.filter((set) => set.isCompleted && set.pending !== true && set.failed !== true);
    const last: Maybe<SetEntry> = committed.length !== 0 ? committed[committed.length - 1] ?? null : null;
    if (last === null) {
        return null;
    }
    return { weightKg: parseSetWeightKg(last), reps: parseSetReps(last) };
}

/**
 * @function noop
 * @description A no-op handler for the read-only committed rows (only the draft row is interactive).
 *
 * @returns {void}
 */
function noop(): void {
    return;
}

/**
 * @function ExerciseLogCard
 * @description Renders an exercise as a solid card: a title row, the committed/pending/failed sets (read-only, Retry on failure), and one editable draft row with an Add-set affordance.
 *
 * @param {ExerciseLogCardProps} props The card props.
 * @returns {ReactElement} The card element.
 */
export function ExerciseLogCard(props: ExerciseLogCardProps): ReactElement {
    const bodyweight: boolean = props.entry.exerciseVariant.equipmentType === 'BODYWEIGHT';
    const prev: Maybe<DraftSet> = lastCommitted(props.entry.sets);
    const draftIndex: number = props.entry.sets.length + 1;

    return (
        <Card style={styles.card}>
            <View style={styles.header}>
                <Ionicons name="barbell-outline" size={18} color={theme.color.textSecondary} />
                <Text variant="headline" tone="primary" numberOfLines={1} style={styles.title}>{props.entry.exerciseVariant.exercise.name}</Text>
            </View>
            {props.entry.sets.map((set, i) => <SetRow key={set.id} index={i + 1} set={set} prev={null} bodyweight={bodyweight} draft={{ weightKg: parseSetWeightKg(set), reps: parseSetReps(set) }} onChange={noop} onDone={noop} onRetry={() => { props.onRetrySet(set.id); }} />)}
            <SetRow index={draftIndex} set={null} prev={prev} bodyweight={bodyweight} draft={props.draft} onChange={props.onChangeDraft} onDone={props.onDone} onRetry={noop} />
            <Button label="Add set" variant="ghost" onPress={props.onAddSet} />
        </Card>
    );
}
