import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData, UseInfiniteQueryResult, UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/modules/identity/identity-hook';
import { usePaginatedQuery } from '@/lib/use-paginated-query';
import type { PaginatedResponse } from '@/lib/use-paginated-query';
import { listExercises, getExercise, createExercise, listVariants, createVariant, regenerateVariant, deleteVariant, listMachineBrands, createMachineBrand } from '@/modules/exercise-library/exercise-library-api';
import { prependVariant, replaceVariant, patchVariant, removeVariant } from '@/modules/exercise-library/exercise-library-cache';
import type { Exercise, ExerciseVariant, MachineBrand, CreateExerciseInput, CreateVariantInput, AiContentStatus } from '@/modules/exercise-library/exercise-library-models';
import type { Maybe, Perhaps } from '@/shared/models';

/**
 * @constant exerciseKeys
 * @description Single source of truth for every exercise-library query key.
 */
export const exerciseKeys = {
    lists: (): string[] => ['exercises', 'list'],
    list: (search: string): string[] => ['exercises', 'list', search],
    detail: (exerciseId: string): string[] => ['exercises', 'detail', exerciseId],
    variants: (exerciseId: string): string[] => ['exercise-variants', exerciseId],
    brandsRoot: (): string[] => ['machine-brands'],
    brands: (search: string): string[] => ['machine-brands', search]
};

/**
 * @interface CreateVariantContext
 * @description The onMutate context carrying the optimistic temp id for rollback/replace.
 */
interface CreateVariantContext {
    tempId: string; /*!< The synthetic id of the optimistic LOCAL-PENDING card */
}

/**
 * @interface RegenerateContext
 * @description The onMutate context carrying the pre-mutation status for rollback on failure.
 */
interface RegenerateContext {
    priorStatus: Maybe<AiContentStatus>; /*!< The variant's status before the optimistic PENDING patch */
}

/**
 * @function useDebouncedValue
 * @description Returns a debounced copy of a value, updating only after the value has been stable for delayMs.
 *
 * @param {T} value The source value.
 * @param {number} delayMs The debounce delay in milliseconds.
 * @returns {T} The debounced value.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState<T>(value);

    useEffect(() => {
        const handle: ReturnType<typeof setTimeout> = setTimeout(() => { setDebounced(value); }, delayMs);
        return (): void => { clearTimeout(handle); };
    }, [value, delayMs]);

    return debounced;
}

/**
 * @function useExercises
 * @description Paginated, search-filtered exercises list keyed per search term.
 *
 * @param {string} search The debounced search term.
 * @returns {UseInfiniteQueryResult<InfiniteData<PaginatedResponse<Exercise>, number>, Error>} The infinite-query result.
 */
export function useExercises(search: string): UseInfiniteQueryResult<InfiniteData<PaginatedResponse<Exercise>, number>, Error> {
    const { client } = useAuth();
    return usePaginatedQuery<Exercise>(exerciseKeys.list(search), (page) => listExercises(client, search, page));
}

/**
 * @function useExercise
 * @description Fetches a single exercise by id.
 *
 * @param {string} exerciseId The exercise UUID.
 * @returns {UseQueryResult<Exercise, Error>} The query result.
 */
export function useExercise(exerciseId: string): UseQueryResult<Exercise, Error> {
    const { client } = useAuth();
    return useQuery({ queryKey: exerciseKeys.detail(exerciseId), queryFn: () => getExercise(client, exerciseId) });
}

/**
 * @function useCreateExercise
 * @description Creates an exercise and invalidates the list so the new row appears.
 *
 * @returns {UseMutationResult<Exercise, Error, CreateExerciseInput>} The mutation result.
 */
export function useCreateExercise(): UseMutationResult<Exercise, Error, CreateExerciseInput> {
    const { client } = useAuth();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateExerciseInput): Promise<Exercise> => createExercise(client, input),
        onSuccess: (): void => { void queryClient.invalidateQueries({ queryKey: exerciseKeys.lists() }); }
    });
}

/**
 * @function useVariants
 * @description Paginated variants list for one exercise, newest first.
 *
 * @param {string} exerciseId The owning exercise UUID.
 * @returns {UseInfiniteQueryResult<InfiniteData<PaginatedResponse<ExerciseVariant>, number>, Error>} The infinite-query result.
 */
export function useVariants(exerciseId: string): UseInfiniteQueryResult<InfiniteData<PaginatedResponse<ExerciseVariant>, number>, Error> {
    const { client } = useAuth();
    return usePaginatedQuery<ExerciseVariant>(exerciseKeys.variants(exerciseId), (page) => listVariants(client, exerciseId, page));
}

/**
 * @function useCreateVariant
 * @description Creates a variant with an optimistic LOCAL-PENDING card that cross-fades to the terminal server result. No polling: the POST blocks through Gemini and returns the terminal variant; a server FAILED is a real row (handled in onSuccess), so onError only fires when the POST itself never created a variant.
 *
 * @param {string} exerciseId The owning exercise UUID.
 * @returns {UseMutationResult<ExerciseVariant, Error, CreateVariantInput, CreateVariantContext>} The mutation result.
 */
export function useCreateVariant(exerciseId: string): UseMutationResult<ExerciseVariant, Error, CreateVariantInput, CreateVariantContext> {
    const { client } = useAuth();
    const queryClient = useQueryClient();
    const key: string[] = exerciseKeys.variants(exerciseId);

    return useMutation<ExerciseVariant, Error, CreateVariantInput, CreateVariantContext>({
        mutationFn: (input: CreateVariantInput): Promise<ExerciseVariant> => createVariant(client, exerciseId, input),
        onMutate: async (input: CreateVariantInput): Promise<CreateVariantContext> => {
            await queryClient.cancelQueries({ queryKey: key });
            const tempId: string = `local-${Date.now()}`;
            const nowIso: string = new Date().toISOString();
            const optimistic: ExerciseVariant = {
                id: tempId,
                exerciseId,
                equipmentType: input.equipmentType,
                machineBrandId: input.machineBrandId,
                formSummary: null,
                instructions: null,
                equipmentTips: null,
                previewImageUrl: null,
                aiContentStatus: 'PENDING',
                aiGeneratedAt: null,
                createdAt: nowIso,
                updatedAt: nowIso
            };
            queryClient.setQueryData<InfiniteData<PaginatedResponse<ExerciseVariant>, number>>(key, (prev) => prependVariant(prev, optimistic));
            return { tempId };
        },
        onSuccess: (server: ExerciseVariant, _input: CreateVariantInput, context: CreateVariantContext): void => {
            queryClient.setQueryData<InfiniteData<PaginatedResponse<ExerciseVariant>, number>>(key, (prev) => replaceVariant(prev, context.tempId, server));
        },
        onError: (_error: Error, _input: CreateVariantInput, context: Perhaps<CreateVariantContext>): void => {
            if (context === undefined) {
                return;
            }
            queryClient.setQueryData<InfiniteData<PaginatedResponse<ExerciseVariant>, number>>(key, (prev) => removeVariant(prev, context.tempId));
        }
    });
}

/**
 * @function readVariantStatus
 * @description Finds a variant's current AiContentStatus in the cached pages, or null when absent.
 *
 * @param {Perhaps<InfiniteData<PaginatedResponse<ExerciseVariant>, number>>} pages The cached pages.
 * @param {string} variantId The variant id.
 * @returns {Maybe<AiContentStatus>} The status, or null.
 */
function readVariantStatus(pages: Perhaps<InfiniteData<PaginatedResponse<ExerciseVariant>, number>>, variantId: string): Maybe<AiContentStatus> {
    if (pages === undefined) {
        return null;
    }
    for (const page of pages.pages) {
        for (const variant of page.data) {
            if (variant.id === variantId) {
                return variant.aiContentStatus;
            }
        }
    }
    return null;
}

/**
 * @function useRegenerateVariant
 * @description Re-runs AI onboarding for a variant: flips the card to the shimmer optimistically, cross-fades to the terminal server result on success, and restores the prior status on a failed POST. No polling.
 *
 * @param {string} exerciseId The owning exercise UUID (for the cache key).
 * @returns {UseMutationResult<ExerciseVariant, Error, string, RegenerateContext>} The mutation result keyed by variant id.
 */
export function useRegenerateVariant(exerciseId: string): UseMutationResult<ExerciseVariant, Error, string, RegenerateContext> {
    const { client } = useAuth();
    const queryClient = useQueryClient();
    const key: string[] = exerciseKeys.variants(exerciseId);

    return useMutation<ExerciseVariant, Error, string, RegenerateContext>({
        mutationFn: (variantId: string): Promise<ExerciseVariant> => regenerateVariant(client, variantId),
        onMutate: async (variantId: string): Promise<RegenerateContext> => {
            await queryClient.cancelQueries({ queryKey: key });
            const priorStatus: Maybe<AiContentStatus> = readVariantStatus(queryClient.getQueryData<InfiniteData<PaginatedResponse<ExerciseVariant>, number>>(key), variantId);
            queryClient.setQueryData<InfiniteData<PaginatedResponse<ExerciseVariant>, number>>(key, (prev) => patchVariant(prev, variantId, { aiContentStatus: 'PENDING' }));
            return { priorStatus };
        },
        onSuccess: (server: ExerciseVariant): void => {
            queryClient.setQueryData<InfiniteData<PaginatedResponse<ExerciseVariant>, number>>(key, (prev) => replaceVariant(prev, server.id, server));
        },
        onError: (_error: Error, variantId: string, context: Perhaps<RegenerateContext>): void => {
            if (context === undefined || context.priorStatus === null) {
                return;
            }
            const restored: AiContentStatus = context.priorStatus;
            queryClient.setQueryData<InfiniteData<PaginatedResponse<ExerciseVariant>, number>>(key, (prev) => patchVariant(prev, variantId, { aiContentStatus: restored }));
        }
    });
}

/**
 * @function useDeleteVariant
 * @description Deletes a variant on the server and removes it from the cached list. Deferred-DELETE timing (the Undo window) is owned by the screen; this mutation fires the real DELETE only when invoked.
 *
 * @param {string} exerciseId The owning exercise UUID (for the cache key).
 * @returns {UseMutationResult<{ message: string }, Error, string>} The mutation result keyed by variant id.
 */
export function useDeleteVariant(exerciseId: string): UseMutationResult<{ message: string }, Error, string> {
    const { client } = useAuth();
    const queryClient = useQueryClient();
    const key: string[] = exerciseKeys.variants(exerciseId);

    return useMutation<{ message: string }, Error, string>({
        mutationFn: (variantId: string): Promise<{ message: string }> => deleteVariant(client, variantId),
        onSuccess: (_result: { message: string }, variantId: string): void => {
            queryClient.setQueryData<InfiniteData<PaginatedResponse<ExerciseVariant>, number>>(key, (prev) => removeVariant(prev, variantId));
        }
    });
}

/**
 * @function useMachineBrands
 * @description Paginated, search-filtered machine-brand list.
 *
 * @param {string} search The debounced search term.
 * @returns {UseInfiniteQueryResult<InfiniteData<PaginatedResponse<MachineBrand>, number>, Error>} The infinite-query result.
 */
export function useMachineBrands(search: string): UseInfiniteQueryResult<InfiniteData<PaginatedResponse<MachineBrand>, number>, Error> {
    const { client } = useAuth();
    return usePaginatedQuery<MachineBrand>(exerciseKeys.brands(search), (page) => listMachineBrands(client, search, page));
}

/**
 * @function useCreateMachineBrand
 * @description Creates a machine brand and invalidates every search-keyed brand list via the root prefix.
 *
 * @returns {UseMutationResult<MachineBrand, Error, string>} The mutation result keyed by brand name.
 */
export function useCreateMachineBrand(): UseMutationResult<MachineBrand, Error, string> {
    const { client } = useAuth();
    const queryClient = useQueryClient();
    return useMutation<MachineBrand, Error, string>({
        mutationFn: (name: string): Promise<MachineBrand> => createMachineBrand(client, name),
        onSuccess: (): void => { void queryClient.invalidateQueries({ queryKey: exerciseKeys.brandsRoot() }); }
    });
}

/**
 * @function useBrandNameMap
 * @description Prefetches brands and exposes an id->name resolver for MACHINE variant cards. Auto-fetches subsequent pages until exhausted so resolution is total even past the first page.
 *
 * @returns {(brandId: Maybe<string>) => Maybe<string>} A resolver returning the brand name, or null when unknown.
 */
export function useBrandNameMap(): (brandId: Maybe<string>) => Maybe<string> {
    const brands = useMachineBrands('');
    const { hasNextPage, isFetchingNextPage, fetchNextPage } = brands;

    useEffect(() => {
        if (hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return useMemo(() => {
        const lookup: Map<string, string> = new Map();
        const pages = brands.data?.pages ?? [];
        for (const page of pages) {
            for (const brand of page.data) {
                lookup.set(brand.id, brand.name);
            }
        }
        return (brandId: Maybe<string>): Maybe<string> => {
            if (brandId === null) {
                return null;
            }
            return lookup.get(brandId) ?? null;
        };
    }, [brands.data]);
}
