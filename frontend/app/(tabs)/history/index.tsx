import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import type { ReactElement } from 'react';
import { router } from 'expo-router';
import { ErrorState, ListItem, Screen, Spinner, Text, UndoToast } from '@/components';
import { useDeleteWorkout, useWorkouts } from '@/modules/workouts/workouts-hook';
import { useGymNameMap } from '@/modules/workouts/gym-name-hook';
import { computeDurationMs, formatDuration } from '@/modules/workouts/workouts-compute';
import type { WorkoutSummary } from '@/modules/workouts/workouts-models';
import type { Maybe } from '@/shared/models';
import { theme } from '@/theme/theme';

const styles = StyleSheet.create({
    centered: { paddingVertical: theme.spacing.xl24, alignItems: 'center' },
    toast: { paddingHorizontal: theme.spacing.lg16, paddingBottom: theme.spacing.md12 }
});

/**
 * @function buildSubtitle
 * @description Builds the second history-row line: gym · duration (or "In progress" while live).
 *
 * @param {WorkoutSummary} workout The summary row.
 * @param {Maybe<string>} gymName The resolved gym name, or null.
 * @returns {string} The composed subtitle.
 */
function buildSubtitle(workout: WorkoutSummary, gymName: Maybe<string>): string {
    const duration: string = workout.endedAt !== null ? formatDuration(computeDurationMs(workout.startedAt, workout.endedAt, Date.now())) : 'In progress';
    if (gymName !== null) {
        return `${gymName} · ${duration}`;
    }
    return duration;
}

/**
 * @function formatDate
 * @description Formats a workout's start date for the row title fallback.
 *
 * @param {string} iso The ISO start timestamp.
 * @returns {string} The locale date string.
 */
function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
}

/**
 * @function HistoryScreen
 * @description History list: paginated summary rows (name/date · gym/duration), deferred-delete with Undo, tap to detail.
 *
 * @returns {ReactElement} The History screen element.
 */
export default function HistoryScreen(): ReactElement {
    const query = useWorkouts(null);
    const remove = useDeleteWorkout();
    const resolveGym = useGymNameMap();
    const [hiddenId, setHiddenId] = useState<Maybe<string>>(null);

    const rows: WorkoutSummary[] = useMemo(() => {
        const all: WorkoutSummary[] = (query.data?.pages ?? []).flatMap((page) => page.data);
        if (hiddenId === null) {
            return all;
        }
        return all.filter((workout) => workout.id !== hiddenId);
    }, [query.data, hiddenId]);

    const onEndReached = (): void => {
        if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
        }
    };

    const beginDelete = (workoutId: string): void => { setHiddenId(workoutId); };
    const undoDelete = (): void => { setHiddenId(null); };
    const expireDelete = (): void => {
        if (hiddenId === null) {
            return;
        }
        const target: string = hiddenId;
        setHiddenId(null);
        remove.mutate(target);
    };

    const renderItem = (info: ListRenderItemInfo<WorkoutSummary>): ReactElement => {
        const title: string = info.item.name ?? formatDate(info.item.startedAt);
        return <ListItem title={title} subtitle={buildSubtitle(info.item, resolveGym(info.item.gymLocationId))} onPress={() => { router.push({ pathname: '/history/[workoutId]', params: { workoutId: info.item.id } }); }} onDelete={() => { beginDelete(info.item.id); }} />;
    };

    let listState: ReactElement;
    if (query.isPending) {
        listState = <View style={styles.centered}><Spinner size="large" /></View>;
    } else if (query.isError) {
        listState = <ErrorState message="Couldn't load workouts" onRetry={() => { void query.refetch(); }} />;
    } else {
        listState = <View style={styles.centered}><Text variant="footnote" tone="tertiary">Start a workout to see it here.</Text></View>;
    }

    return (
        <Screen>
            {hiddenId !== null ? <View style={styles.toast}><UndoToast key={hiddenId} message="Workout deleted" onUndo={undoDelete} onExpire={expireDelete} /></View> : null}
            <FlatList data={rows} keyExtractor={(item) => item.id} renderItem={renderItem} onEndReached={onEndReached} onEndReachedThreshold={0.4} ListEmptyComponent={listState} />
        </Screen>
    );
}
