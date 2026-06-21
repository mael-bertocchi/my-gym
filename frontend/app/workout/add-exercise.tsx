import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import type { ReactElement } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, ErrorState, ListItem, Sheet, Spinner, Tag, Text, TextInput } from '@/components';
import { useDebouncedValue, useExercises, useVariants } from '@/modules/exercise-library/exercise-library-hook';
import { humanizeEnum } from '@/modules/exercise-library/exercise-library-models';
import type { Exercise, ExerciseVariant } from '@/modules/exercise-library/exercise-library-models';
import { useAddWorkoutExercise, useWorkoutDetail } from '@/modules/workouts/workouts-hook';
import type { AddExerciseVars } from '@/modules/workouts/workouts-hook';
import type { WorkoutExerciseVariant } from '@/modules/workouts/workouts-models';
import type { Maybe } from '@/shared/models';
import { theme } from '@/theme/theme';

const styles = StyleSheet.create({
    search: { marginBottom: theme.spacing.md12 },
    centered: { paddingVertical: theme.spacing.xl24, alignItems: 'center' },
    recentLabel: { marginBottom: theme.spacing.sm8 },
    recentRow: { flexDirection: 'row', gap: theme.spacing.sm8, marginBottom: theme.spacing.md12 },
    list: { flex: 1 },
    footer: { paddingTop: theme.spacing.md12 }
});

/**
 * @interface RecentVariant
 * @description A previously-logged variant surfaced as a Recent chip (commits on tap, zero typing).
 */
interface RecentVariant {
    variant: WorkoutExerciseVariant; /*!< The nested variant metadata for the optimistic row */
    label: string; /*!< The chip label (exercise name) */
}

/**
 * @function AddExerciseSheet
 * @description Formsheet to add exercises to the live workout: a pinned Recent band (tap commits), a search list to drill into variants, and a multi-select Add(N) commit. Search is not auto-focused.
 *
 * @returns {ReactElement} The add-exercise sheet element.
 */
export default function AddExerciseSheet(): ReactElement {
    const params = useLocalSearchParams<{ workoutId: string }>();
    const workoutId: string = params.workoutId ?? '';

    const [raw, setRaw] = useState<string>('');
    const search: string = useDebouncedValue(raw, 250);
    const exercisesQuery = useExercises(search);
    const [picked, setPicked] = useState<Maybe<Exercise>>(null);
    const variantsQuery = useVariants(picked?.id ?? '');
    const addExercise = useAddWorkoutExercise(workoutId);
    const detail = useWorkoutDetail(workoutId);

    const [selected, setSelected] = useState<Record<string, AddExerciseVars>>({});

    const exercises: Exercise[] = useMemo(() => (exercisesQuery.data?.pages ?? []).flatMap((page) => page.data), [exercisesQuery.data]);
    const variants: ExerciseVariant[] = useMemo(() => (variantsQuery.data?.pages ?? []).flatMap((page) => page.data), [variantsQuery.data]);

    const recents: RecentVariant[] = useMemo(() => {
        const entries = detail.data?.entries ?? [];
        const seen: Set<string> = new Set();
        const out: RecentVariant[] = [];
        for (let i = entries.length - 1; i >= 0; i -= 1) {
            const entry = entries[i];
            if (entry === undefined || seen.has(entry.exerciseVariant.id)) {
                continue;
            }
            seen.add(entry.exerciseVariant.id);
            out.push({ variant: entry.exerciseVariant, label: entry.exerciseVariant.exercise.name });
        }
        return out.slice(0, 6);
    }, [detail.data]);

    const selectedCount: number = Object.keys(selected).length;

    const commit = (vars: AddExerciseVars[]): void => {
        for (const v of vars) {
            addExercise.mutate(v);
        }
        router.back();
    };

    const toggleVariant = (variant: ExerciseVariant): void => {
        if (picked === null) {
            return;
        }
        const payload: AddExerciseVars = { exerciseVariantId: variant.id, variant: { id: variant.id, equipmentType: variant.equipmentType, machineBrandId: variant.machineBrandId, exercise: { id: picked.id, name: picked.name, primaryMuscle: picked.primaryMuscle } } };
        setSelected((prev) => {
            const next: Record<string, AddExerciseVars> = { ...prev };
            if (next[variant.id] !== undefined) {
                delete next[variant.id];
                return next;
            }
            next[variant.id] = payload;
            return next;
        });
    };

    const recentBand: ReactElement | null = recents.length !== 0 ? (
        <View>
            <Text variant="caption" tone="tertiary" style={styles.recentLabel}>{'Recent'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
                {recents.map((recent) => <Tag key={recent.variant.id} label={recent.label} onPress={() => { commit([{ exerciseVariantId: recent.variant.id, variant: recent.variant }]); }} />)}
            </ScrollView>
        </View>
    ) : null;

    if (picked !== null) {
        const renderVariant = (info: ListRenderItemInfo<ExerciseVariant>): ReactElement => {
            const active: boolean = selected[info.item.id] !== undefined;
            return <ListItem title={humanizeEnum(info.item.equipmentType)} trailing={<Tag label={active ? 'Selected' : 'Add'} active={active} onPress={() => { toggleVariant(info.item); }} />} onPress={() => { toggleVariant(info.item); }} />;
        };
        let variantState: ReactElement;
        if (variantsQuery.isPending) {
            variantState = <View style={styles.centered}><Spinner size="large" /></View>;
        } else if (variantsQuery.isError) {
            variantState = <ErrorState message="Couldn't load variants" onRetry={() => { void variantsQuery.refetch(); }} />;
        } else {
            variantState = <View style={styles.centered}><Text variant="footnote" tone="tertiary">No variants — add one in the Library.</Text></View>;
        }
        return (
            <Sheet>
                <Button label="‹ Back to exercises" variant="ghost" onPress={() => { setPicked(null); setSelected({}); }} />
                <Text variant="title" tone="primary">{picked.name}</Text>
                <FlatList style={styles.list} data={variants} keyExtractor={(item) => item.id} renderItem={renderVariant} ListEmptyComponent={variantState} />
                {selectedCount !== 0 ? <View style={styles.footer}><Button label={`Add ${selectedCount}`} variant="primary" onPress={() => { commit(Object.values(selected)); }} /></View> : null}
            </Sheet>
        );
    }

    const renderExercise = (info: ListRenderItemInfo<Exercise>): ReactElement => {
        return <ListItem title={info.item.name} subtitle={humanizeEnum(info.item.primaryMuscle)} onPress={() => { setPicked(info.item); setSelected({}); }} />;
    };

    let listState: ReactElement;
    if (exercisesQuery.isPending) {
        listState = <View style={styles.centered}><Spinner size="large" /></View>;
    } else if (exercisesQuery.isError) {
        listState = <ErrorState message="Couldn't load exercises" onRetry={() => { void exercisesQuery.refetch(); }} />;
    } else {
        listState = <View style={styles.centered}><Text variant="footnote" tone="tertiary">No exercises match.</Text></View>;
    }

    return (
        <Sheet>
            {recentBand}
            <TextInput value={raw} onChangeText={setRaw} placeholder="Search exercises" autoCapitalize="none" returnKeyType="done" style={styles.search} />
            <FlatList style={styles.list} data={exercises} keyExtractor={(item) => item.id} renderItem={renderExercise} ListEmptyComponent={listState} />
        </Sheet>
    );
}
