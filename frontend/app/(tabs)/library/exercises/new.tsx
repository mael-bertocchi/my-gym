import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ReactElement } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Sheet, Tag, Text, TextInput } from '@/components';
import { useCreateExercise } from '@/modules/exercise-library/exercise-library-hook';
import { MUSCLE_GROUPS, humanizeEnum } from '@/modules/exercise-library/exercise-library-models';
import type { MuscleGroup } from '@/modules/exercise-library/exercise-library-models';
import { isApiError } from '@/shared/models';
import type { Maybe } from '@/shared/models';
import { theme } from '@/theme/theme';

const styles = StyleSheet.create({
    title: { marginBottom: theme.spacing.lg16 },
    field: { marginBottom: theme.spacing.lg16 },
    label: { marginBottom: theme.spacing.sm8 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm8, marginBottom: theme.spacing.lg16 },
    toggle: { marginBottom: theme.spacing.md12, alignSelf: 'flex-start' },
    error: { marginBottom: theme.spacing.md12 }
});

/**
 * @function NewExerciseScreen
 * @description The New Exercise sheet: name prefilled from the search query, one primary-muscle chip, collapsed secondary muscles, and a footer Create button. 409 (duplicate name) surfaces inline.
 *
 * @returns {ReactElement} The New Exercise sheet element.
 */
export default function NewExerciseScreen(): ReactElement {
    const params = useLocalSearchParams<{ query?: string }>();
    const [name, setName] = useState<string>(params.query ?? '');
    const [primary, setPrimary] = useState<Maybe<MuscleGroup>>(null);
    const [secondary, setSecondary] = useState<MuscleGroup[]>([]);
    const [showSecondary, setShowSecondary] = useState<boolean>(false);
    const [error, setError] = useState<Maybe<string>>(null);
    const create = useCreateExercise();

    const toggleSecondary = (muscle: MuscleGroup): void => {
        setSecondary((prev) => (!prev.includes(muscle) ? [...prev, muscle] : prev.filter((current) => current !== muscle)));
    };

    const canSubmit: boolean = name.trim().length !== 0 && primary !== null;

    const onSubmit = (): void => {
        if (primary === null) {
            return;
        }
        setError(null);
        create.mutate(
            { name: name.trim(), primaryMuscle: primary, secondaryMuscles: secondary },
            {
                onSuccess: (): void => { router.back(); },
                onError: (err: Error): void => {
                    if (isApiError(err) && err.status === 409) {
                        setError('An exercise with this name already exists.');
                        return;
                    }
                    setError('Couldn’t create the exercise. Try again.');
                }
            }
        );
    };

    return (
        <Sheet>
            <Text variant="title" tone="primary" style={styles.title}>New exercise</Text>
            <TextInput value={name} onChangeText={setName} label="Name" placeholder="Bench press" autoFocus autoCapitalize="sentences" returnKeyType="done" style={styles.field} />
            <Text variant="caption" tone="secondary" style={styles.label}>Primary muscle</Text>
            <ScrollView>
                <View style={styles.grid}>{MUSCLE_GROUPS.map((muscle) => <Tag key={muscle} label={humanizeEnum(muscle)} active={primary === muscle} onPress={() => { setPrimary(muscle); }} />)}</View>
                <View style={styles.toggle}><Tag label={!showSecondary ? 'Add secondary muscles' : 'Hide secondary muscles'} onPress={() => { setShowSecondary((prev) => !prev); }} /></View>
                {!showSecondary ? null : <View style={styles.grid}>{MUSCLE_GROUPS.map((muscle) => <Tag key={muscle} label={humanizeEnum(muscle)} active={secondary.includes(muscle)} onPress={() => { toggleSecondary(muscle); }} />)}</View>}
            </ScrollView>
            {error !== null ? <Text variant="footnote" tone="danger" style={styles.error}>{error}</Text> : null}
            <Button label="Create" onPress={onSubmit} loading={create.isPending} disabled={!canSubmit} />
        </Sheet>
    );
}
