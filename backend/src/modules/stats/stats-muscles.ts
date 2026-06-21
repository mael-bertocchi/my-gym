import type { MuscleGroup } from 'prisma/generated/prisma/client';
import type { RawSet } from 'src/modules/stats/stats-compute';

/**
 * @constant SECONDARY_MUSCLE_WEIGHT
 * @description Fraction of a set's set-count and volume credited to each secondary muscle.
 */
export const SECONDARY_MUSCLE_WEIGHT = 0.5;

/**
 * @interface MuscleRawEntry
 * @description One performed exercise: the movement's muscles plus its working sets.
 */
export interface MuscleRawEntry {
    primaryMuscle: MuscleGroup; /*!< The movement's primary muscle */
    secondaryMuscles: MuscleGroup[]; /*!< The movement's secondary muscles */
    sets: RawSet[]; /*!< The WORKING sets logged for it */
}

/**
 * @interface MuscleVolume
 * @description Weighted set-count and volume credited to one muscle.
 */
export interface MuscleVolume {
    muscle: MuscleGroup; /*!< The muscle */
    sets: number; /*!< Weighted set credit (primary 1.0, each secondary 0.5) */
    volume: number; /*!< Weighted weight x reps credited to the muscle */
}

/**
 * @function round
 * @description Rounds a number to one decimal place.
 *
 * @param {number} value The value to round.
 * @returns {number} The value rounded to one decimal.
 */
function round(value: number): number {
    return Math.round(value * 10) / 10;
}

/**
 * @function computeMuscleBreakdown
 * @description Sums weighted set-count and volume per muscle across all performed exercises.
 *
 * @param {MuscleRawEntry[]} entries The performed exercises with their muscles and working sets.
 * @returns {MuscleVolume[]} One entry per worked muscle, descending by volume then set credit.
 */
export function computeMuscleBreakdown(entries: MuscleRawEntry[]): MuscleVolume[] {
    const totals = new Map<MuscleGroup, { sets: number; volume: number }>();

    function credit(muscle: MuscleGroup, sets: number, volume: number): void {
        const current = totals.get(muscle);
        if (current === undefined) {
            totals.set(muscle, { sets, volume });
            return;
        }
        current.sets += sets;
        current.volume += volume;
    }

    for (const entry of entries) {
        for (const set of entry.sets) {
            const volume = (set.weightKg ?? 0) * (set.reps ?? 0);
            credit(entry.primaryMuscle, 1, volume);
            for (const secondary of entry.secondaryMuscles) {
                credit(secondary, SECONDARY_MUSCLE_WEIGHT, SECONDARY_MUSCLE_WEIGHT * volume);
            }
        }
    }

    return [...totals.entries()]
        .map(([muscle, value]) => ({ muscle, sets: round(value.sets), volume: round(value.volume) }))
        .sort((left, right) => right.volume - left.volume || right.sets - left.sets);
}
