import type { ApiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/lib/use-paginated-query';
import type { CreateSetInput, CreateWorkoutExerciseInput, CreateWorkoutInput, SetEntry, UpdateSetInput, WorkoutDetail, WorkoutEntryRow, WorkoutSummary } from '@/modules/workouts/workouts-models';
import type { Maybe } from '@/shared/models';

/**
 * @constant LIST_PAGE_SIZE
 * @description The page size requested for the workouts list endpoint (one of the backend's allowed sizes).
 */
const LIST_PAGE_SIZE: number = 25;

/**
 * @interface UpdateWorkoutBody
 * @description The mutable fields of PATCH /workouts/:id used by this slice.
 */
export interface UpdateWorkoutBody {
    endedAt?: Maybe<string>; /*!< Finish (ISO) or re-open (null) */
    name?: string; /*!< Rename */
    gymLocationId?: Maybe<string>; /*!< Set or clear the gym */
}

/**
 * @function listWorkouts
 * @description GET /workouts — paginated summary list, newest first, optionally filtered by gym.
 *
 * @param {ApiClient} client The api-client.
 * @param {Maybe<string>} gymLocationId The gym filter, or null for all.
 * @param {number} page The 1-based page number.
 * @returns {Promise<PaginatedResponse<WorkoutSummary>>} The paginated workouts.
 */
export function listWorkouts(client: ApiClient, gymLocationId: Maybe<string>, page: number): Promise<PaginatedResponse<WorkoutSummary>> {
    const params: URLSearchParams = new URLSearchParams();
    if (gymLocationId !== null) {
        params.set('gymLocationId', gymLocationId);
    }
    params.set('page', String(page));
    params.set('pageSize', String(LIST_PAGE_SIZE));
    return client.list<PaginatedResponse<WorkoutSummary>>(`/workouts?${params.toString()}`);
}

/**
 * @function getWorkout
 * @description GET /workouts/:id — the full nested workout tree.
 *
 * @param {ApiClient} client The api-client.
 * @param {string} id The workout UUID.
 * @returns {Promise<WorkoutDetail>} The workout detail.
 */
export function getWorkout(client: ApiClient, id: string): Promise<WorkoutDetail> {
    return client.get<WorkoutDetail>(`/workouts/${id}`);
}

/**
 * @function createWorkout
 * @description POST /workouts — starts a workout; returns the summary (no entries).
 *
 * @param {ApiClient} client The api-client.
 * @param {CreateWorkoutInput} input The create body.
 * @returns {Promise<WorkoutSummary>} The created workout summary.
 */
export function createWorkout(client: ApiClient, input: CreateWorkoutInput): Promise<WorkoutSummary> {
    return client.post<WorkoutSummary>('/workouts', input);
}

/**
 * @function updateWorkout
 * @description PATCH /workouts/:id — updates mutable fields (Finish sends endedAt; Undo-finish sends endedAt:null).
 *
 * @param {ApiClient} client The api-client.
 * @param {string} id The workout UUID.
 * @param {UpdateWorkoutBody} patch The fields to change.
 * @returns {Promise<WorkoutSummary>} The updated workout summary.
 */
export function updateWorkout(client: ApiClient, id: string, patch: UpdateWorkoutBody): Promise<WorkoutSummary> {
    return client.patch<WorkoutSummary>(`/workouts/${id}`, patch);
}

/**
 * @function deleteWorkout
 * @description DELETE /workouts/:id — cascades to entries and sets.
 *
 * @param {ApiClient} client The api-client.
 * @param {string} id The workout UUID.
 * @returns {Promise<{ message: string }>} The deletion message envelope.
 */
export function deleteWorkout(client: ApiClient, id: string): Promise<{ message: string }> {
    return client.del<{ message: string }>(`/workouts/${id}`);
}

/**
 * @function createWorkoutExercise
 * @description POST /workout-exercises — adds an exercise to a workout (position auto-assigns). The response is the FLAT row (no nested variant/sets); the hook reconciles the optimistic entry by id and refetches the tree for nested metadata.
 *
 * @param {ApiClient} client The api-client.
 * @param {CreateWorkoutExerciseInput} input The create body.
 * @returns {Promise<WorkoutEntryRow>} The created flat entry row.
 */
export function createWorkoutExercise(client: ApiClient, input: CreateWorkoutExerciseInput): Promise<WorkoutEntryRow> {
    return client.post<WorkoutEntryRow>('/workout-exercises', input);
}

/**
 * @function deleteWorkoutExercise
 * @description DELETE /workout-exercises/:id — cascades to sets.
 *
 * @param {ApiClient} client The api-client.
 * @param {string} id The workout-exercise UUID.
 * @returns {Promise<{ message: string }>} The deletion message envelope.
 */
export function deleteWorkoutExercise(client: ApiClient, id: string): Promise<{ message: string }> {
    return client.del<{ message: string }>(`/workout-exercises/${id}`);
}

/**
 * @function createSet
 * @description POST /sets — logs one set. weightKg is omitted entirely for bodyweight; numbers on write.
 *
 * @param {ApiClient} client The api-client.
 * @param {CreateSetInput} input The create body.
 * @returns {Promise<SetEntry>} The created set (decimals as strings on read).
 */
export function createSet(client: ApiClient, input: CreateSetInput): Promise<SetEntry> {
    return client.post<SetEntry>('/sets', input);
}

/**
 * @function updateSet
 * @description PATCH /sets/:id — edits a set (numbers on write; weightKg null = bodyweight).
 *
 * @param {ApiClient} client The api-client.
 * @param {string} id The set UUID.
 * @param {UpdateSetInput} patch The fields to change.
 * @returns {Promise<SetEntry>} The updated set.
 */
export function updateSet(client: ApiClient, id: string, patch: UpdateSetInput): Promise<SetEntry> {
    return client.patch<SetEntry>(`/sets/${id}`, patch);
}

/**
 * @function deleteSet
 * @description DELETE /sets/:id — removes a set.
 *
 * @param {ApiClient} client The api-client.
 * @param {string} id The set UUID.
 * @returns {Promise<{ message: string }>} The deletion message envelope.
 */
export function deleteSet(client: ApiClient, id: string): Promise<{ message: string }> {
    return client.del<{ message: string }>(`/sets/${id}`);
}
