import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import type { ReactElement } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Button, EmptyState, ErrorState, GlassSurface, Screen, Spinner, Text, UndoToast, VariantCard } from '@/components';
import { useBrandNameMap, useDeleteVariant, useExercise, useRegenerateVariant, useVariants } from '@/modules/exercise-library/exercise-library-hook';
import { humanizeEnum } from '@/modules/exercise-library/exercise-library-models';
import type { ExerciseVariant } from '@/modules/exercise-library/exercise-library-models';
import type { Maybe } from '@/shared/models';
import { theme } from '@/theme/theme';

const styles = StyleSheet.create({
    subtitle: { marginBottom: theme.spacing.lg16 },
    centered: { paddingVertical: theme.spacing.xl24, alignItems: 'center' },
    pill: { paddingHorizontal: theme.spacing.lg16, paddingVertical: theme.spacing.xs4 },
    toast: { marginBottom: theme.spacing.md12 }
});

/**
 * @function ExerciseDetailScreen
 * @description Exercise Detail: variant cards (newest-first) with AI states, regenerate, deferred-DELETE-with-Undo, and a bottom glass Add-Variant pill.
 *
 * @returns {ReactElement} The exercise-detail element.
 */
export default function ExerciseDetailScreen(): ReactElement {
    const params = useLocalSearchParams<{ exerciseId: string }>();
    const exerciseId: string = params.exerciseId ?? '';

    const exercise = useExercise(exerciseId);
    const variants = useVariants(exerciseId);
    const regenerate = useRegenerateVariant(exerciseId);
    const remove = useDeleteVariant(exerciseId);
    const resolveBrand = useBrandNameMap();

    const [hiddenId, setHiddenId] = useState<Maybe<string>>(null);

    const rows: ExerciseVariant[] = useMemo(() => {
        const all: ExerciseVariant[] = (variants.data?.pages ?? []).flatMap((page) => page.data);
        if (hiddenId === null) {
            return all;
        }
        return all.filter((variant) => variant.id !== hiddenId);
    }, [variants.data, hiddenId]);

    const onEndReached = (): void => {
        if (variants.hasNextPage && !variants.isFetchingNextPage) {
            void variants.fetchNextPage();
        }
    };

    const beginDelete = (variantId: string): void => {
        setHiddenId(variantId);
    };

    const undoDelete = (): void => {
        setHiddenId(null);
    };

    const expireDelete = (): void => {
        if (hiddenId === null) {
            return;
        }
        const target: string = hiddenId;
        setHiddenId(null);
        remove.mutate(target);
    };

    const renderItem = (info: ListRenderItemInfo<ExerciseVariant>): ReactElement => {
        const variant: ExerciseVariant = info.item;
        return <VariantCard variant={variant} brandName={resolveBrand(variant.machineBrandId)} regenerating={regenerate.isPending && regenerate.variables === variant.id} onRegenerate={() => { regenerate.mutate(variant.id); }} onDelete={() => { beginDelete(variant.id); }} />;
    };

    let listState: Maybe<ReactElement> = null;
    if (exercise.isPending || variants.isPending) {
        listState = <View style={styles.centered}><Spinner size="large" /></View>;
    } else if (exercise.isError || variants.isError) {
        listState = <ErrorState message="Couldn't load this exercise" onRetry={() => { void exercise.refetch(); void variants.refetch(); }} />;
    } else if (rows.length === 0) {
        listState = <EmptyState message="No variants yet — add one" />;
    }

    const title: string = exercise.data?.name ?? 'Exercise';

    const footer: ReactElement = (
        <View>
            {hiddenId !== null ? <UndoToast key={hiddenId} message="Variant deleted" onUndo={undoDelete} onExpire={expireDelete} /> : null}
            <View style={hiddenId !== null ? styles.toast : undefined} />
            <GlassSurface style={styles.pill}><Button label="Add variant" variant="ghost" onPress={() => { router.push({ pathname: '/library/exercises/[exerciseId]/add-variant', params: { exerciseId } }); }} /></GlassSurface>
        </View>
    );

    return (
        <Screen footer={footer}>
            <Stack.Screen options={{ title }} />
            {exercise.data !== undefined ? <Text variant="footnote" tone="secondary" style={styles.subtitle}>{humanizeEnum(exercise.data.primaryMuscle)}</Text> : null}
            <FlatList data={rows} keyExtractor={(item) => item.id} renderItem={renderItem} onEndReached={onEndReached} onEndReachedThreshold={0.4} ListEmptyComponent={listState} />
        </Screen>
    );
}
