import type { RawSet } from 'src/modules/stats/stats-compute';
import { round } from 'src/shared/math';
import type { Maybe } from 'src/shared/models';

/**
 * @interface ExerciseRawRecord
 * @description One exercise's name plus all the caller's working sets logged against it.
 */
export interface ExerciseRawRecord {
    exerciseId: string; /*!< The exercise id */
    exerciseName: string; /*!< The exercise name */
    sets: RawSet[]; /*!< The caller's WORKING sets for the exercise */
}

/**
 * @interface PersonalRecordEntry
 * @description An exercise's all-time bests across the caller's history.
 */
export interface PersonalRecordEntry {
    exerciseId: string; /*!< The exercise id */
    exerciseName: string; /*!< The exercise name */
    heaviestKg: Maybe<number>; /*!< Heaviest load, or null if all bodyweight */
    bestEstimated1RM: Maybe<number>; /*!< Best Epley estimated 1RM, or null if no weighted reps */
    bestVolume: Maybe<number>; /*!< Heaviest single-set volume (weight x reps), or null if all bodyweight */
}

/**
 * @function computePersonalRecords
 * @description Computes each exercise's heaviest set, best estimated 1RM, and best set volume across the caller's history.
 *
 * @param {ExerciseRawRecord[]} entries One entry per exercise with its working sets.
 * @returns {PersonalRecordEntry[]} One record per exercise, ascending by name.
 */
export function computePersonalRecords(entries: ExerciseRawRecord[]): PersonalRecordEntry[] {
    return entries
        .map((entry) => {
            let heaviestKg: Maybe<number> = null;
            let bestEstimated1RM: Maybe<number> = null;
            let bestVolume: Maybe<number> = null;

            for (const set of entry.sets) {
                if (set.weightKg === null) {
                    continue;
                }

                const reps = set.reps ?? 0;
                const estimate = reps > 0 ? set.weightKg * (1 + reps / 30) : set.weightKg;
                const volume = set.weightKg * reps;

                if (heaviestKg === null || set.weightKg > heaviestKg) {
                    heaviestKg = set.weightKg;
                }
                if (bestEstimated1RM === null || estimate > bestEstimated1RM) {
                    bestEstimated1RM = estimate;
                }
                if (bestVolume === null || volume > bestVolume) {
                    bestVolume = volume;
                }
            }

            return {
                exerciseId: entry.exerciseId,
                exerciseName: entry.exerciseName,
                heaviestKg: heaviestKg !== null ? round(heaviestKg) : null,
                bestEstimated1RM: bestEstimated1RM !== null ? round(bestEstimated1RM) : null,
                bestVolume: bestVolume !== null ? round(bestVolume) : null
            };
        })
        .sort((left, right) => left.exerciseName.localeCompare(right.exerciseName));
}
