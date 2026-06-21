import type { ApiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/lib/use-paginated-query';
import type { Exercise, ExerciseVariant, MachineBrand, CreateExerciseInput, CreateVariantInput } from '@/modules/exercise-library/exercise-library-models';

/**
 * @constant LIST_PAGE_SIZE
 * @description The page size requested for every list endpoint.
 */
const LIST_PAGE_SIZE: number = 25;

/**
 * @constant PREFETCH_PAGE_SIZE
 * @description Page size for the brands prefetch used by id->name resolution.
 */
const PREFETCH_PAGE_SIZE: number = 100;

/**
 * @function buildListQuery
 * @description Builds an encoded query string for a list endpoint, omitting an empty search term.
 *
 * @param {string} search The search term (may be empty).
 * @param {number} page The 1-based page number.
 * @param {number} pageSize The requested page size.
 * @returns {string} The query string including the leading '?'.
 */
function buildListQuery(search: string, page: number, pageSize: number): string {
    const params: URLSearchParams = new URLSearchParams();
    if (search.trim().length !== 0) {
        params.set('search', search.trim());
    }
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return `?${params.toString()}`;
}

/**
 * @function listExercises
 * @description GET /exercises — paginated, search-filtered exercise list.
 *
 * @param {ApiClient} client The api-client.
 * @param {string} search The case-insensitive name filter (empty for none).
 * @param {number} page The 1-based page number.
 * @returns {Promise<PaginatedResponse<Exercise>>} The paginated exercises.
 */
export function listExercises(client: ApiClient, search: string, page: number): Promise<PaginatedResponse<Exercise>> {
    return client.list<PaginatedResponse<Exercise>>(`/exercises${buildListQuery(search, page, LIST_PAGE_SIZE)}`);
}

/**
 * @function getExercise
 * @description GET /exercises/:id — a single exercise.
 *
 * @param {ApiClient} client The api-client.
 * @param {string} exerciseId The exercise UUID.
 * @returns {Promise<Exercise>} The exercise.
 */
export function getExercise(client: ApiClient, exerciseId: string): Promise<Exercise> {
    return client.get<Exercise>(`/exercises/${exerciseId}`);
}

/**
 * @function createExercise
 * @description POST /exercises — creates an exercise (409 when the name already exists).
 *
 * @param {ApiClient} client The api-client.
 * @param {CreateExerciseInput} input The exercise body.
 * @returns {Promise<Exercise>} The created exercise.
 */
export function createExercise(client: ApiClient, input: CreateExerciseInput): Promise<Exercise> {
    return client.post<Exercise>('/exercises', input);
}

/**
 * @function listVariants
 * @description GET /exercise-variants?exerciseId= — variants for one exercise, newest first.
 *
 * @param {ApiClient} client The api-client.
 * @param {string} exerciseId The owning exercise UUID.
 * @param {number} page The 1-based page number.
 * @returns {Promise<PaginatedResponse<ExerciseVariant>>} The paginated variants.
 */
export function listVariants(client: ApiClient, exerciseId: string, page: number): Promise<PaginatedResponse<ExerciseVariant>> {
    const params: URLSearchParams = new URLSearchParams();
    params.set('exerciseId', exerciseId);
    params.set('page', String(page));
    params.set('pageSize', String(LIST_PAGE_SIZE));
    return client.list<PaginatedResponse<ExerciseVariant>>(`/exercise-variants?${params.toString()}`);
}

/**
 * @function createVariant
 * @description POST /exercise-variants — creates a variant; the server blocks on AI and returns the terminal variant.
 *
 * @param {ApiClient} client The api-client.
 * @param {string} exerciseId The owning exercise UUID.
 * @param {CreateVariantInput} input The variant input.
 * @returns {Promise<ExerciseVariant>} The created, already-terminal variant.
 */
export function createVariant(client: ApiClient, exerciseId: string, input: CreateVariantInput): Promise<ExerciseVariant> {
    const body: { exerciseId: string; equipmentType: string; machineBrandId?: string } = { exerciseId, equipmentType: input.equipmentType };
    if (input.machineBrandId !== null) {
        body.machineBrandId = input.machineBrandId;
    }
    return client.post<ExerciseVariant>('/exercise-variants', body);
}

/**
 * @function regenerateVariant
 * @description POST /exercise-variants/:id/regenerate — re-runs AI onboarding; blocks server-side, returns the terminal variant.
 *
 * @param {ApiClient} client The api-client.
 * @param {string} variantId The variant UUID.
 * @returns {Promise<ExerciseVariant>} The regenerated, terminal variant.
 */
export function regenerateVariant(client: ApiClient, variantId: string): Promise<ExerciseVariant> {
    return client.post<ExerciseVariant>(`/exercise-variants/${variantId}/regenerate`);
}

/**
 * @function deleteVariant
 * @description DELETE /exercise-variants/:id — deletes a variant.
 *
 * @param {ApiClient} client The api-client.
 * @param {string} variantId The variant UUID.
 * @returns {Promise<{ message: string }>} The deletion message envelope.
 */
export function deleteVariant(client: ApiClient, variantId: string): Promise<{ message: string }> {
    return client.del<{ message: string }>(`/exercise-variants/${variantId}`);
}

/**
 * @function listMachineBrands
 * @description GET /machine-brands — paginated, search-filtered machine-brand list.
 *
 * @param {ApiClient} client The api-client.
 * @param {string} search The case-insensitive name filter (empty for none).
 * @param {number} page The 1-based page number.
 * @returns {Promise<PaginatedResponse<MachineBrand>>} The paginated brands.
 */
export function listMachineBrands(client: ApiClient, search: string, page: number): Promise<PaginatedResponse<MachineBrand>> {
    return client.list<PaginatedResponse<MachineBrand>>(`/machine-brands${buildListQuery(search, page, PREFETCH_PAGE_SIZE)}`);
}

/**
 * @function createMachineBrand
 * @description POST /machine-brands — creates a brand (409 when the name already exists).
 *
 * @param {ApiClient} client The api-client.
 * @param {string} name The brand name (1–120 chars).
 * @returns {Promise<MachineBrand>} The created brand.
 */
export function createMachineBrand(client: ApiClient, name: string): Promise<MachineBrand> {
    return client.post<MachineBrand>('/machine-brands', { name });
}
