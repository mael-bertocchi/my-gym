// frontend/app/workout/[workoutId].tsx
import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import type { ReactElement } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, EmptyState, ExerciseLogCard, GlassSurface, RestTimerStrip, Screen, WorkoutHeader } from '@/components';
import type { DraftSet } from '@/components/set-row';
import { useActiveWorkout } from '@/modules/workouts/active-workout-hook';
import { useFinishWorkout, useLogSet, useVariantStats, useWorkoutDetail } from '@/modules/workouts/workouts-hook';
import type { LogSetInput } from '@/modules/workouts/workouts-hook';
import { computeDurationMs, computeVolumeKg, countCompletedSets, formatDuration, nextSetNumber, prefillFromLastSet, prefillFromStatsSession } from '@/modules/workouts/workouts-compute';
import { parseSetReps, parseSetWeightKg } from '@/modules/workouts/workouts-models';
import type { SetEntry, WorkoutEntry } from '@/modules/workouts/workouts-models';
import { formatWeight } from '@/lib/weight';
import { useWeightUnit } from '@/lib/use-weight-unit';
import { useRestTimer } from '@/lib/use-rest-timer';
import type { Maybe } from '@/shared/models';
import { theme } from '@/theme/theme';

/**
 * @constant DEFAULT_REST_SEC
 * @description The rest duration auto-started on each Done.
 */
const DEFAULT_REST_SEC: number = 120;

const styles = StyleSheet.create({
    dock: { paddingHorizontal: theme.spacing.lg16, paddingVertical: theme.spacing.xs4 },
    footer: { gap: theme.spacing.sm8 }
});

/**
 * @function firstEmptyVariantId
 * @description Returns the variant id of the first entry that has no sets yet (the one whose first row needs a stats seed), or null when every entry already has sets.
 *
 * @param {WorkoutEntry[]} entries The workout entries.
 * @returns {Maybe<string>} The variant id to fetch stats for, or null.
 */
function firstEmptyVariantId(entries: WorkoutEntry[]): Maybe<string> {
    for (const entry of entries) {
        if (entry.sets.length === 0) {
            return entry.exerciseVariantId;
        }
    }
    return null;
}

/**
 * @function WorkoutModalScreen
 * @description The live-logging modal: header timer + Finish, exercise cards with a 1-tap Done hot path (log + rest + advance), a stats-seeded first row, a rest strip, and an Add-exercise dock.
 *
 * @returns {ReactElement} The workout modal element.
 */
export default function WorkoutModalScreen(): ReactElement {
    const params = useLocalSearchParams<{ workoutId: string }>();
    const workoutId: string = params.workoutId ?? '';
    const unit = useWeightUnit();

    const { session, clearSession } = useActiveWorkout();
    const detail = useWorkoutDetail(workoutId);
    const logSet = useLogSet(workoutId);
    const finishWorkout = useFinishWorkout();
    const rest = useRestTimer();

    const [drafts, setDrafts] = useState<Record<string, DraftSet>>({});

    const entries: WorkoutEntry[] = useMemo((): WorkoutEntry[] => detail.data?.entries ?? [], [detail.data]);
    const seedVariantId: Maybe<string> = useMemo((): Maybe<string> => firstEmptyVariantId(entries), [entries]);
    const seedStats = useVariantStats(seedVariantId);

    const draftFor = (entry: WorkoutEntry): DraftSet => {
        const existing: Maybe<DraftSet> = drafts[entry.id] ?? null;
        if (existing !== null) {
            return existing;
        }
        if (entry.sets.length === 0 && entry.exerciseVariantId === seedVariantId && seedStats.data !== undefined) {
            return prefillFromStatsSession(seedStats.data.summary.maxWeightKg);
        }
        return prefillFromLastSet(entry.sets);
    };

    const setDraft = (entryId: string, draft: DraftSet): void => {
        setDrafts((prev) => ({ ...prev, [entryId]: draft }));
    };

    const onDone = (entry: WorkoutEntry): void => {
        const draft: DraftSet = draftFor(entry);
        const input: LogSetInput = {
            workoutExerciseId: entry.id,
            tempId: `local-${Date.now()}`,
            weightKg: draft.weightKg,
            reps: draft.reps,
            setNumber: nextSetNumber(entry.sets)
        };
        logSet.mutate(input);
        rest.start(DEFAULT_REST_SEC);
        setDraft(entry.id, { weightKg: draft.weightKg, reps: draft.reps });
    };

    const onRetrySet = (entry: WorkoutEntry, setId: string): void => {
        const failed: Maybe<SetEntry> = entry.sets.find((set) => set.id === setId) ?? null;
        if (failed === null) {
            return;
        }
        logSet.mutate({
            workoutExerciseId: entry.id,
            tempId: setId,
            weightKg: parseSetWeightKg(failed),
            reps: parseSetReps(failed),
            setNumber: failed.setNumber
        });
    };

    const onAddExercise = (): void => {
        router.push({ pathname: '/workout/add-exercise', params: { workoutId } });
    };

    const onFinish = (): void => {
        const startIso: string = detail.data?.startedAt ?? new Date().toISOString();
        const ms: number = computeDurationMs(startIso, null, Date.now());
        const volume: number = computeVolumeKg(entries);
        const sets: number = countCompletedSets(entries);
        const summary: string = `Duration ${formatDuration(ms)} · ${formatWeight(volume, unit)} volume · ${sets} sets`;
        void finishWorkout.mutateAsync({ workoutId, endedAt: new Date().toISOString() })
            .then((): Promise<void> => clearSession())
            .then((): void => {
                Alert.alert('Workout finished', summary, [{ text: 'Done', onPress: (): void => { router.replace('/history'); } }]);
            });
    };

    const renderEntry = (info: ListRenderItemInfo<WorkoutEntry>): ReactElement => {
        return <ExerciseLogCard entry={info.item} draft={draftFor(info.item)} onChangeDraft={(draft) => { setDraft(info.item.id, draft); }} onDone={() => { onDone(info.item); }} onRetrySet={(setId) => { onRetrySet(info.item, setId); }} onAddSet={() => { onDone(info.item); }} />;
    };

    if (detail.isPending) {
        return <Screen status="loading"><></></Screen>;
    }
    if (detail.isError) {
        return <Screen status="error" errorMessage="Couldn't load this workout" onRetry={() => { void detail.refetch(); }}><></></Screen>;
    }

    const workout = detail.data;
    const startedAt: number = session !== null ? session.startedAt : Date.parse(workout.startedAt);

    const footer: ReactElement = (
        <View style={styles.footer}>
            {rest.isRunning ? <RestTimerStrip remainingSec={rest.remainingSec} onAdjust={rest.adjust} onSkip={rest.skip} /> : null}
            <GlassSurface radius={theme.radius.pill999} style={styles.dock}><Button label="Add exercise" variant="ghost" onPress={onAddExercise} /></GlassSurface>
        </View>
    );

    return (
        <Screen footer={footer}>
            <WorkoutHeader startedAt={startedAt} finishing={finishWorkout.isPending} onFinish={onFinish} onMinimize={() => { router.back(); }} />
            <FlatList data={entries} keyExtractor={(item) => item.id} renderItem={renderEntry} ListEmptyComponent={<EmptyState message="Add your first exercise" />} />
        </Screen>
    );
}
