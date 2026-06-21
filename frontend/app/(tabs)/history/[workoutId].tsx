// frontend/app/(tabs)/history/[workoutId].tsx
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import type { ReactElement } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Button, Card, MetricStrip, Screen, SetMiniTable, Spinner, Text } from '@/components';
import { useAuth } from '@/modules/identity/identity-hook';
import { useActiveWorkout } from '@/modules/workouts/active-workout-hook';
import { useWorkoutDetail } from '@/modules/workouts/workouts-hook';
import { computeDurationMs, computeVolumeKg, countCompletedSets, formatDuration } from '@/modules/workouts/workouts-compute';
import { repeatWorkout } from '@/modules/workouts/repeat-workout';
import type { RepeatProgress } from '@/modules/workouts/repeat-workout';
import { useGymNameMap } from '@/modules/workouts/gym-name-hook';
import type { WorkoutEntry } from '@/modules/workouts/workouts-models';
import { formatWeight } from '@/lib/weight';
import { useWeightUnit } from '@/lib/use-weight-unit';
import type { Maybe } from '@/shared/models';
import { theme } from '@/theme/theme';

const styles = StyleSheet.create({
    card: { marginBottom: theme.spacing.md12 },
    header: { marginBottom: theme.spacing.sm8 },
    overlay: { paddingVertical: theme.spacing.md12, alignItems: 'center' }
});

/**
 * @function WorkoutDetailScreen
 * @description Read-only past-workout detail: 3-up metrics, per-exercise set mini-tables, and a bottom Repeat (or Resume when in progress).
 *
 * @returns {ReactElement} The detail screen element.
 */
export default function WorkoutDetailScreen(): ReactElement {
    const params = useLocalSearchParams<{ workoutId: string }>();
    const workoutId: string = params.workoutId ?? '';
    const unit = useWeightUnit();

    const { client } = useAuth();
    const { resume, setActiveFromWorkout } = useActiveWorkout();
    const detail = useWorkoutDetail(workoutId);
    const resolveGym = useGymNameMap();

    const [progress, setProgress] = useState<Maybe<RepeatProgress>>(null);

    const entries: WorkoutEntry[] = useMemo(() => detail.data?.entries ?? [], [detail.data]);
    const isLive: boolean = detail.data !== undefined && detail.data.endedAt === null;

    const onRepeat = (): void => {
        if (detail.data === undefined) {
            return;
        }
        const source = detail.data;
        setProgress({ done: 0, total: 0 });
        void repeatWorkout(client, source, (p) => { setProgress(p); }).then((result) => {
            setProgress(null);
            setActiveFromWorkout(result.workoutId, result.startedAt);
            router.push({ pathname: '/workout/[workoutId]', params: { workoutId: result.workoutId } });
        }).catch(() => {
            setProgress(null);
        });
    };

    const onResume = (): void => {
        if (detail.data === undefined) {
            return;
        }
        setActiveFromWorkout(detail.data.id, detail.data.startedAt);
        resume();
    };

    if (detail.isPending) {
        return <Screen status="loading"><></></Screen>;
    }
    if (detail.isError) {
        return <Screen status="error" errorMessage="Couldn't load this workout" onRetry={() => { void detail.refetch(); }}><></></Screen>;
    }

    const durationMs: number = computeDurationMs(detail.data.startedAt, detail.data.endedAt, Date.now());
    const gymName: Maybe<string> = resolveGym(detail.data.gymLocationId);
    const durationLabel: string = detail.data.endedAt !== null ? formatDuration(durationMs) : 'In progress';
    const gymSuffix: string = gymName !== null ? ` · ${gymName}` : '';
    const subtitle: string = `${new Date(detail.data.startedAt).toLocaleDateString()} · ${durationLabel}${gymSuffix}`;

    const renderEntry = (info: ListRenderItemInfo<WorkoutEntry>): ReactElement => {
        return <Card style={styles.card}><Text variant="headline" tone="primary" style={styles.header}>{info.item.exerciseVariant.exercise.name}</Text><SetMiniTable sets={info.item.sets} /></Card>;
    };

    const repeatLabel: string = !isLive ? 'Repeat this workout' : 'Resume';
    const onPrimary = (): void => {
        if (!isLive) {
            onRepeat();
            return;
        }
        onResume();
    };
    const footer: ReactElement = (
        <View>
            {progress !== null ? <View style={styles.overlay}><Spinner /><Text variant="footnote" tone="secondary">{`Repeating ${progress.done} of ${progress.total}`}</Text></View> : null}
            <Button label={repeatLabel} variant="primary" onPress={onPrimary} disabled={progress !== null} />
        </View>
    );

    return (
        <Screen footer={footer}>
            <Stack.Screen options={{ title: detail.data.name ?? 'Workout' }} />
            <Text variant="footnote" tone="secondary" style={styles.header}>{subtitle}</Text>
            <MetricStrip items={[{ label: 'Volume', value: formatWeight(computeVolumeKg(entries), unit), accent: true }, { label: 'Sets', value: String(countCompletedSets(entries)) }, { label: 'Exercises', value: String(entries.length) }]} />
            <FlatList data={entries} keyExtractor={(item) => item.id} renderItem={renderEntry} />
        </Screen>
    );
}
