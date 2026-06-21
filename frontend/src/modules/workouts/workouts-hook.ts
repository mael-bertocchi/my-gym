import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData, UseInfiniteQueryResult, UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/modules/identity/identity-hook';
import { usePaginatedQuery } from '@/lib/use-paginated-query';
import type { PaginatedResponse } from '@/lib/use-paginated-query';
import { createSet, createWorkout, createWorkoutExercise, deleteWorkout, getWorkout, listWorkouts, updateWorkout } from '@/modules/workouts/workouts-api';
import { appendEntry, appendSet, findSetInEntry, patchSet, replaceSet } from '@/modules/workouts/workouts-cache';
import type { CreateWorkoutInput, SetEntry, WorkoutDetail, WorkoutEntryRow, WorkoutExerciseVariant, WorkoutSummary } from '@/modules/workouts/workouts-models';
import type { Maybe, Perhaps } from '@/shared/models';

/**
 * @constant workoutKeys
 * @description Single source of truth for every workouts query key.
 */
export const workoutKeys = {
    lists: (): string[] => ['workouts', 'list'],
    list: (gymLocationId: string): string[] => ['workouts', 'list', gymLocationId],
    detail: (workoutId: string): string[] => ['workouts', 'detail', workoutId],
    stats: (variantId: string): string[] => ['variant-stats', variantId]
};

/**
 * @interface VariantStatsSession
 * @description One per-session aggregate from GET /stats/exercise-variants/:id (numbers already parsed server-side).
 */
export interface VariantStatsSession {
    date: string; /*!< ISO session date */
    setCount: number; /*!< Working-set count */
    totalReps: number; /*!< Total reps */
    totalVolume: number; /*!< Total volume */
    maxWeightKg: Maybe<number>; /*!< Heaviest working set, or null */
    bestEstimated1RM: Maybe<number>; /*!< Best Epley estimate, or null */
}

/**
 * @interface VariantStats
 * @description The stats payload used to seed a first-set prefill.
 */
export interface VariantStats {
    variantId: string; /*!< The variant UUID */
    sessions: VariantStatsSession[]; /*!< Per-session aggregates, ASC */
    summary: { sessionCount: number; maxWeightKg: Maybe<number>; bestEstimated1RM: Maybe<number>; bestTotalVolume: Maybe<number> }; /*!< Overall bests */
}

/**
 * @interface AddExerciseVars
 * @description Variables for adding an exercise to the live workout.
 */
export interface AddExerciseVars {
    exerciseVariantId: string; /*!< The variant to add */
    variant: WorkoutExerciseVariant; /*!< Nested variant metadata for the optimistic row */
}

/**
 * @interface AddExerciseContext
 * @description onMutate context carrying the optimistic entry temp id.
 */
interface AddExerciseContext {
    tempId: string; /*!< The synthetic entry id */
}

/**
 * @interface LogSetInput
 * @description One optimistic set commit. weightKg null = bodyweight; numbers on write. tempId reused on retry.
 */
export interface LogSetInput {
    workoutExerciseId: string; /*!< Owning entry id */
    tempId: string; /*!< Client id for the optimistic row (reused on retry) */
    weightKg: Maybe<number>; /*!< kg, or null for bodyweight */
    reps: Maybe<number>; /*!< Reps, or null */
    setNumber: number; /*!< Client-computed 1-based set number */
}

/**
 * @interface LogSetContext
 * @description onMutate context for a logged set (for replace/patch on settle).
 */
interface LogSetContext {
    tempId: string; /*!< The optimistic row id */
    workoutExerciseId: string; /*!< The owning entry id */
}

/**
 * @function useWorkoutDetail
 * @description Fetches and caches the full workout tree; shared by the live modal and the detail screen.
 *
 * @param {string} workoutId The workout UUID.
 * @returns {UseQueryResult<WorkoutDetail, Error>} The query result.
 */
export function useWorkoutDetail(workoutId: string): UseQueryResult<WorkoutDetail, Error> {
    const { client } = useAuth();
    return useQuery({ queryKey: workoutKeys.detail(workoutId), queryFn: () => getWorkout(client, workoutId), enabled: workoutId.length !== 0 });
}

/**
 * @function useWorkouts
 * @description Paginated workout summary list, optionally filtered by gym.
 *
 * @param {Maybe<string>} gymLocationId The gym filter, or null for all.
 * @returns {UseInfiniteQueryResult<InfiniteData<PaginatedResponse<WorkoutSummary>, number>, Error>} The infinite-query result.
 */
export function useWorkouts(gymLocationId: Maybe<string>): UseInfiniteQueryResult<InfiniteData<PaginatedResponse<WorkoutSummary>, number>, Error> {
    const { client } = useAuth();
    const filter: string = gymLocationId ?? '';
    return usePaginatedQuery<WorkoutSummary>(workoutKeys.list(filter), (page) => listWorkouts(client, gymLocationId, page));
}

/**
 * @function useCreateWorkout
 * @description Creates a workout and invalidates the list so the new row appears.
 *
 * @returns {UseMutationResult<WorkoutSummary, Error, CreateWorkoutInput>} The mutation result.
 */
export function useCreateWorkout(): UseMutationResult<WorkoutSummary, Error, CreateWorkoutInput> {
    const { client } = useAuth();
    const queryClient = useQueryClient();
    return useMutation<WorkoutSummary, Error, CreateWorkoutInput>({
        mutationFn: (input: CreateWorkoutInput): Promise<WorkoutSummary> => createWorkout(client, input),
        onSuccess: (): void => { void queryClient.invalidateQueries({ queryKey: workoutKeys.lists() }); }
    });
}

/**
 * @function useFinishWorkout
 * @description The SINGLE writer of endedAt (Finish / Undo-finish), invalidating the list and detail. The provider never PATCHes endedAt.
 *
 * @returns {UseMutationResult<WorkoutSummary, Error, { workoutId: string; endedAt: Maybe<string> }>} The mutation result.
 */
export function useFinishWorkout(): UseMutationResult<WorkoutSummary, Error, { workoutId: string; endedAt: Maybe<string> }> {
    const { client } = useAuth();
    const queryClient = useQueryClient();
    return useMutation<WorkoutSummary, Error, { workoutId: string; endedAt: Maybe<string> }>({
        mutationFn: (vars: { workoutId: string; endedAt: Maybe<string> }): Promise<WorkoutSummary> => updateWorkout(client, vars.workoutId, { endedAt: vars.endedAt }),
        onSuccess: (_result: WorkoutSummary, vars: { workoutId: string; endedAt: Maybe<string> }): void => {
            void queryClient.invalidateQueries({ queryKey: workoutKeys.lists() });
            void queryClient.invalidateQueries({ queryKey: workoutKeys.detail(vars.workoutId) });
        }
    });
}

/**
 * @function useDeleteWorkout
 * @description Deletes a workout on the server; the screen owns the deferred-DELETE timing and refreshes the list by invalidating.
 *
 * @returns {UseMutationResult<{ message: string }, Error, string>} The mutation result keyed by workout id.
 */
export function useDeleteWorkout(): UseMutationResult<{ message: string }, Error, string> {
    const { client } = useAuth();
    const queryClient = useQueryClient();
    return useMutation<{ message: string }, Error, string>({
        mutationFn: (workoutId: string): Promise<{ message: string }> => deleteWorkout(client, workoutId),
        onSuccess: (): void => { void queryClient.invalidateQueries({ queryKey: workoutKeys.lists() }); }
    });
}

/**
 * @function useAddWorkoutExercise
 * @description Adds an exercise to the live workout with an optimistic entry; refetches the detail tree on success so nested metadata and the real id reconcile.
 *
 * @param {string} workoutId The owning workout UUID (for the detail cache key).
 * @returns {UseMutationResult<WorkoutEntryRow, Error, AddExerciseVars, AddExerciseContext>} The mutation result.
 */
export function useAddWorkoutExercise(workoutId: string): UseMutationResult<WorkoutEntryRow, Error, AddExerciseVars, AddExerciseContext> {
    const { client } = useAuth();
    const queryClient = useQueryClient();
    const key: string[] = workoutKeys.detail(workoutId);

    return useMutation<WorkoutEntryRow, Error, AddExerciseVars, AddExerciseContext>({
        mutationFn: (vars: AddExerciseVars): Promise<WorkoutEntryRow> => createWorkoutExercise(client, { workoutId, exerciseVariantId: vars.exerciseVariantId }),
        onMutate: async (vars: AddExerciseVars): Promise<AddExerciseContext> => {
            await queryClient.cancelQueries({ queryKey: key });
            const tempId: string = `local-${Date.now()}`;
            const optimistic = { id: tempId, exerciseVariantId: vars.exerciseVariantId, position: 0, notes: null, createdAt: new Date().toISOString(), exerciseVariant: vars.variant, sets: [] };
            queryClient.setQueryData<WorkoutDetail>(key, (prev) => appendEntry(prev, optimistic));
            return { tempId };
        },
        onSuccess: (): void => { void queryClient.invalidateQueries({ queryKey: key }); },
        onError: (_error: Error, _vars: AddExerciseVars, _context: Perhaps<AddExerciseContext>): void => { void queryClient.invalidateQueries({ queryKey: key }); }
    });
}

/**
 * @function useLogSet
 * @description Optimistically logs a set into the detail tree, swapping the temp row for the server row on success; on failure it patches the row to failed (kept visible for inline retry) — never removes it, never toasts. On retry (same tempId already present) it patches the existing row to pending instead of appending a duplicate.
 *
 * @param {string} workoutId The owning workout UUID (for the detail cache key).
 * @returns {UseMutationResult<SetEntry, Error, LogSetInput, LogSetContext>} The mutation result.
 */
export function useLogSet(workoutId: string): UseMutationResult<SetEntry, Error, LogSetInput, LogSetContext> {
    const { client } = useAuth();
    const queryClient = useQueryClient();
    const key: string[] = workoutKeys.detail(workoutId);

    return useMutation<SetEntry, Error, LogSetInput, LogSetContext>({
        mutationFn: (input: LogSetInput): Promise<SetEntry> => createSet(client, {
            workoutExerciseId: input.workoutExerciseId,
            setNumber: input.setNumber,
            setType: 'WORKING',
            ...(input.weightKg !== null ? { weightKg: input.weightKg } : {}),
            ...(input.reps !== null ? { reps: input.reps } : {}),
            isCompleted: true
        }),
        onMutate: async (input: LogSetInput): Promise<LogSetContext> => {
            await queryClient.cancelQueries({ queryKey: key });
            const existing: Maybe<SetEntry> = findSetInEntry(queryClient.getQueryData<WorkoutDetail>(key), input.workoutExerciseId, input.tempId);
            if (existing !== null) {
                queryClient.setQueryData<WorkoutDetail>(key, (prev) => patchSet(prev, input.workoutExerciseId, input.tempId, { pending: true, failed: false }));
                return { tempId: input.tempId, workoutExerciseId: input.workoutExerciseId };
            }
            const optimistic: SetEntry = {
                id: input.tempId,
                workoutExerciseId: input.workoutExerciseId,
                setNumber: input.setNumber,
                setType: 'WORKING',
                weightKg: input.weightKg !== null ? String(input.weightKg) : null,
                reps: input.reps,
                rpe: null,
                restSeconds: null,
                durationSeconds: null,
                tempo: null,
                notes: null,
                isCompleted: true,
                createdAt: new Date().toISOString(),
                pending: true,
                failed: false
            };
            queryClient.setQueryData<WorkoutDetail>(key, (prev) => appendSet(prev, input.workoutExerciseId, optimistic));
            return { tempId: input.tempId, workoutExerciseId: input.workoutExerciseId };
        },
        onSuccess: (server: SetEntry, _input: LogSetInput, context: LogSetContext): void => {
            queryClient.setQueryData<WorkoutDetail>(key, (prev) => replaceSet(prev, context.workoutExerciseId, context.tempId, { ...server, pending: false, failed: false }));
        },
        onError: (_error: Error, _input: LogSetInput, context: Perhaps<LogSetContext>): void => {
            if (context === undefined) {
                return;
            }
            queryClient.setQueryData<WorkoutDetail>(key, (prev) => patchSet(prev, context.workoutExerciseId, context.tempId, { pending: false, failed: true }));
        }
    });
}

/**
 * @function useVariantStats
 * @description Fetches per-variant stats (numbers already parsed) to seed a first-set prefill; disabled until a variant id is supplied.
 *
 * @param {Maybe<string>} variantId The variant UUID, or null.
 * @returns {UseQueryResult<VariantStats, Error>} The query result.
 */
export function useVariantStats(variantId: Maybe<string>): UseQueryResult<VariantStats, Error> {
    const { client } = useAuth();
    return useQuery({ queryKey: workoutKeys.stats(variantId ?? ''), queryFn: () => client.get<VariantStats>(`/stats/exercise-variants/${variantId ?? ''}`), enabled: variantId !== null });
}
