import type { SetEntry, WorkoutDetail, WorkoutEntry } from '@/modules/workouts/workouts-models';
import type { Maybe, Perhaps } from '@/shared/models';

/**
 * @type DetailCache
 * @description The cached single workout-detail tree (undefined before the first fetch).
 */
export type DetailCache = Perhaps<WorkoutDetail>;

/**
 * @function mapEntries
 * @description Returns a new DetailCache whose entries array is transformed, leaving the input untouched.
 *
 * @param {DetailCache} prev The previous cache value.
 * @param {(entries: WorkoutEntry[]) => WorkoutEntry[]} transform The entries transform.
 * @returns {DetailCache} The new cache value, or undefined when prev is undefined.
 */
function mapEntries(prev: DetailCache, transform: (entries: WorkoutEntry[]) => WorkoutEntry[]): DetailCache {
    if (prev === undefined) {
        return undefined;
    }
    return { ...prev, entries: transform(prev.entries) };
}

/**
 * @function mapEntrySets
 * @description Transforms the sets of the entry matching workoutExerciseId, leaving other entries untouched.
 *
 * @param {DetailCache} prev The previous cache value.
 * @param {string} workoutExerciseId The entry id whose sets to transform.
 * @param {(sets: SetEntry[]) => SetEntry[]} transform The sets transform.
 * @returns {DetailCache} The new cache value.
 */
function mapEntrySets(prev: DetailCache, workoutExerciseId: string, transform: (sets: SetEntry[]) => SetEntry[]): DetailCache {
    return mapEntries(prev, (entries) => entries.map((entry) => (entry.id !== workoutExerciseId ? entry : { ...entry, sets: transform(entry.sets) })));
}

/**
 * @function appendEntry
 * @description Appends an exercise entry to the end of the workout.
 *
 * @param {DetailCache} prev The previous cache value.
 * @param {WorkoutEntry} entry The entry to append.
 * @returns {DetailCache} The updated cache value.
 */
export function appendEntry(prev: DetailCache, entry: WorkoutEntry): DetailCache {
    return mapEntries(prev, (entries) => [...entries, entry]);
}

/**
 * @function replaceEntry
 * @description Replaces the entry whose id equals matchId with the supplied entry.
 *
 * @param {DetailCache} prev The previous cache value.
 * @param {string} matchId The entry id to replace.
 * @param {WorkoutEntry} entry The replacement entry.
 * @returns {DetailCache} The updated cache value.
 */
export function replaceEntry(prev: DetailCache, matchId: string, entry: WorkoutEntry): DetailCache {
    return mapEntries(prev, (entries) => entries.map((current) => (current.id !== matchId ? current : entry)));
}

/**
 * @function removeEntry
 * @description Drops the entry whose id equals entryId.
 *
 * @param {DetailCache} prev The previous cache value.
 * @param {string} entryId The entry id to remove.
 * @returns {DetailCache} The updated cache value.
 */
export function removeEntry(prev: DetailCache, entryId: string): DetailCache {
    return mapEntries(prev, (entries) => entries.filter((current) => current.id !== entryId));
}

/**
 * @function appendSet
 * @description Appends a set to the entry matching workoutExerciseId.
 *
 * @param {DetailCache} prev The previous cache value.
 * @param {string} workoutExerciseId The owning entry id.
 * @param {SetEntry} set The set to append.
 * @returns {DetailCache} The updated cache value.
 */
export function appendSet(prev: DetailCache, workoutExerciseId: string, set: SetEntry): DetailCache {
    return mapEntrySets(prev, workoutExerciseId, (sets) => [...sets, set]);
}

/**
 * @function replaceSet
 * @description Replaces the set whose id equals matchSetId within the matching entry.
 *
 * @param {DetailCache} prev The previous cache value.
 * @param {string} workoutExerciseId The owning entry id.
 * @param {string} matchSetId The set id to replace.
 * @param {SetEntry} set The replacement set.
 * @returns {DetailCache} The updated cache value.
 */
export function replaceSet(prev: DetailCache, workoutExerciseId: string, matchSetId: string, set: SetEntry): DetailCache {
    return mapEntrySets(prev, workoutExerciseId, (sets) => sets.map((current) => (current.id !== matchSetId ? current : set)));
}

/**
 * @function patchSet
 * @description Shallow-merges a partial patch into the set whose id equals setId within the matching entry.
 *
 * @param {DetailCache} prev The previous cache value.
 * @param {string} workoutExerciseId The owning entry id.
 * @param {string} setId The set id to patch.
 * @param {Partial<SetEntry>} patch The fields to merge.
 * @returns {DetailCache} The updated cache value.
 */
export function patchSet(prev: DetailCache, workoutExerciseId: string, setId: string, patch: Partial<SetEntry>): DetailCache {
    return mapEntrySets(prev, workoutExerciseId, (sets) => sets.map((current) => (current.id !== setId ? current : { ...current, ...patch })));
}

/**
 * @function removeSet
 * @description Drops the set whose id equals setId within the matching entry.
 *
 * @param {DetailCache} prev The previous cache value.
 * @param {string} workoutExerciseId The owning entry id.
 * @param {string} setId The set id to remove.
 * @returns {DetailCache} The updated cache value.
 */
export function removeSet(prev: DetailCache, workoutExerciseId: string, setId: string): DetailCache {
    return mapEntrySets(prev, workoutExerciseId, (sets) => sets.filter((current) => current.id !== setId));
}

/**
 * @function findSetInEntry
 * @description Locates a set by id within the matching entry, returning null when absent (lets the hook choose append-vs-patch on retry).
 *
 * @param {DetailCache} prev The previous cache value.
 * @param {string} workoutExerciseId The owning entry id.
 * @param {string} setId The set id to find.
 * @returns {Maybe<SetEntry>} The set, or null.
 */
export function findSetInEntry(prev: DetailCache, workoutExerciseId: string, setId: string): Maybe<SetEntry> {
    if (prev === undefined) {
        return null;
    }
    for (const entry of prev.entries) {
        if (entry.id !== workoutExerciseId) {
            continue;
        }
        for (const set of entry.sets) {
            if (set.id === setId) {
                return set;
            }
        }
    }
    return null;
}
