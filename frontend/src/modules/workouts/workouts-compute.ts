import { parseSetReps, parseSetWeightKg } from '@/modules/workouts/workouts-models';
import type { SetEntry, WorkoutEntry } from '@/modules/workouts/workouts-models';
import type { Maybe } from '@/shared/models';

/**
 * @interface PrefillDefaults
 * @description The editable weight/reps defaults seeded into a fresh set row.
 */
export interface PrefillDefaults {
    weightKg: Maybe<number>; /*!< kg default, or null (blank/bodyweight) */
    reps: Maybe<number>; /*!< reps default, or null (blank) */
}

/**
 * @function computeDurationMs
 * @description Computes a workout's elapsed duration in ms: (endedAt ?? now) − startedAt.
 *
 * @param {string} startedAt The ISO start timestamp.
 * @param {Maybe<string>} endedAt The ISO end timestamp, or null while live.
 * @param {number} now The current epoch ms (used when live).
 * @returns {number} The duration in milliseconds.
 */
export function computeDurationMs(startedAt: string, endedAt: Maybe<string>, now: number): number {
    const start: number = Date.parse(startedAt);
    const end: number = endedAt !== null ? Date.parse(endedAt) : now;
    return end - start;
}

/**
 * @function formatDuration
 * @description Formats a duration in ms as `m:ss` under an hour, else `h:mm:ss`.
 *
 * @param {number} ms The duration in milliseconds.
 * @returns {string} The formatted duration.
 */
export function formatDuration(ms: number): string {
    const totalSec: number = Math.max(0, Math.floor(ms / 1000));
    const hours: number = Math.floor(totalSec / 3600);
    const minutes: number = Math.floor((totalSec % 3600) / 60);
    const seconds: number = totalSec % 60;
    if (hours !== 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * @function computeVolumeKg
 * @description Sums weight×reps over all completed sets; bodyweight (null weight) contributes 0.
 *
 * @param {WorkoutEntry[]} entries The workout entries.
 * @returns {number} The total volume in kg.
 */
export function computeVolumeKg(entries: WorkoutEntry[]): number {
    let total: number = 0;
    for (const entry of entries) {
        for (const set of entry.sets) {
            if (!set.isCompleted) {
                continue;
            }
            const weight: Maybe<number> = parseSetWeightKg(set);
            const reps: Maybe<number> = parseSetReps(set);
            if (weight === null || reps === null) {
                continue;
            }
            total += weight * reps;
        }
    }
    return total;
}

/**
 * @function countCompletedSets
 * @description Counts completed sets across all entries.
 *
 * @param {WorkoutEntry[]} entries The workout entries.
 * @returns {number} The completed-set count.
 */
export function countCompletedSets(entries: WorkoutEntry[]): number {
    let count: number = 0;
    for (const entry of entries) {
        for (const set of entry.sets) {
            if (set.isCompleted) {
                count += 1;
            }
        }
    }
    return count;
}

/**
 * @function nextSetNumber
 * @description Returns the next 1-based set number for an entry: max(setNumber)+1, or 1 when empty.
 *
 * @param {SetEntry[]} sets The entry's existing sets.
 * @returns {number} The next set number.
 */
export function nextSetNumber(sets: SetEntry[]): number {
    let max: number = 0;
    for (const set of sets) {
        if (set.setNumber > max) {
            max = set.setNumber;
        }
    }
    return max + 1;
}

/**
 * @function prefillFromLastSet
 * @description Builds prefill defaults from the last committed (non-pending, non-failed) set, blank when none.
 *
 * @param {SetEntry[]} sets The entry's existing sets.
 * @returns {PrefillDefaults} The prefill defaults.
 */
export function prefillFromLastSet(sets: SetEntry[]): PrefillDefaults {
    const committed: SetEntry[] = sets.filter((set) => set.pending !== true && set.failed !== true);
    const last: Maybe<SetEntry> = committed.length !== 0 ? committed[committed.length - 1] ?? null : null;
    if (last === null) {
        return { weightKg: null, reps: null };
    }
    return { weightKg: parseSetWeightKg(last), reps: parseSetReps(last) };
}

/**
 * @function prefillFromStatsSession
 * @description Seeds a freshly-added exercise's first set from the most recent stats session's max weight (reps left blank).
 *
 * @param {Maybe<number>} maxWeightKg The most recent session's max weight, or null when never trained.
 * @returns {PrefillDefaults} The prefill defaults.
 */
export function prefillFromStatsSession(maxWeightKg: Maybe<number>): PrefillDefaults {
    return { weightKg: maxWeightKg, reps: null };
}
