import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import type { ReactElement } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ErrorState, ListItem, Screen, Spinner, Text, TextInput } from '@/components';
import { useDebouncedValue, useExercises } from '@/modules/exercise-library/exercise-library-hook';
import { humanizeEnum } from '@/modules/exercise-library/exercise-library-models';
import type { Exercise } from '@/modules/exercise-library/exercise-library-models';
import type { Perhaps } from '@/shared/models';
import { theme } from '@/theme/theme';

const styles = StyleSheet.create({
    search: { marginBottom: theme.spacing.md12 },
    centered: { paddingVertical: theme.spacing.xl24, alignItems: 'center' },
    createRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm8, paddingVertical: theme.spacing.md12 }
});

/**
 * @function ExercisesScreen
 * @description Search-first exercise list: a persistently-mounted debounced search island, infinite scroll, and a create-from-search row when the typed name has no exact match. Loading/error/empty render inside the list so the search box never disappears.
 *
 * @returns {ReactElement} The exercises list element.
 */
export default function ExercisesScreen(): ReactElement {
    const [raw, setRaw] = useState<string>('');
    const search: string = useDebouncedValue(raw, 250);
    const query = useExercises(search);

    const exercises: Exercise[] = useMemo(() => (query.data?.pages ?? []).flatMap((page) => page.data), [query.data]);
    const trimmed: string = raw.trim();
    const hasExactMatch: boolean = exercises.some((exercise) => exercise.name.toLowerCase() === trimmed.toLowerCase());
    const showCreateRow: boolean = trimmed.length !== 0 && !hasExactMatch;

    const onEndReached = (): void => {
        if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
        }
    };

    const openCreate = (): void => {
        router.push({ pathname: '/library/exercises/new', params: { query: trimmed } });
    };

    const renderItem = (info: ListRenderItemInfo<Exercise>): ReactElement => {
        return <ListItem title={info.item.name} subtitle={humanizeEnum(info.item.primaryMuscle)} onPress={() => { router.push({ pathname: '/library/exercises/[exerciseId]', params: { exerciseId: info.item.id } }); }} />;
    };

    const createRow: Perhaps<ReactElement> = showCreateRow
        ? <Pressable accessibilityRole="button" onPress={openCreate} style={styles.createRow}><Ionicons name="add-circle-outline" size={20} color={theme.color.accent} /><Text variant="headline" tone="accent">{`Create "${trimmed}"`}</Text></Pressable>
        : undefined;

    let listState: ReactElement;
    if (query.isPending) {
        listState = <View style={styles.centered}><Spinner size="large" /></View>;
    } else if (query.isError) {
        listState = <ErrorState message="Couldn't load exercises" onRetry={() => { void query.refetch(); }} />;
    } else {
        listState = <View style={styles.centered}><Text variant="footnote" tone="tertiary">No exercises match.</Text></View>;
    }

    return (
        <Screen>
            <TextInput value={raw} onChangeText={setRaw} placeholder="Search exercises" autoCapitalize="none" returnKeyType="done" style={styles.search} />
            <FlatList data={exercises} keyExtractor={(item) => item.id} renderItem={renderItem} onEndReached={onEndReached} onEndReachedThreshold={0.4} ListFooterComponent={createRow} ListEmptyComponent={listState} />
        </Screen>
    );
}
