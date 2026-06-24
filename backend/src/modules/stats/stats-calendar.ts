import type { RawSet } from 'src/modules/stats/stats-compute';
import { round } from 'src/shared/math';

/**
 * @interface CalendarWorkout
 * @description One workout's start instant and its working sets (weights already converted from Decimal).
 */
export interface CalendarWorkout {
    startedAt: string; /*!< ISO timestamp when the workout started */
    sets: RawSet[]; /*!< Every WORKING set logged across the workout */
}

/**
 * @interface CalendarDay
 * @description Aggregated workout activity for a single UTC calendar day.
 */
export interface CalendarDay {
    date: string; /*!< Calendar day as YYYY-MM-DD (UTC) */
    workoutCount: number; /*!< Workouts started that day */
    totalVolume: number; /*!< Summed working-set volume that day */
}

/**
 * @function pad
 * @description Left-pads a 1-2 digit number to two characters.
 *
 * @param {number} value The value to pad.
 * @returns {string} The two-character string.
 */
function pad(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
}

/**
 * @function computeCalendar
 * @description Buckets workouts by UTC calendar day and sums their count and working-set volume, for a calendar or heatmap view.
 *
 * @param {CalendarWorkout[]} workouts The caller's workouts with their working sets.
 * @returns {CalendarDay[]} One entry per active day, ascending by date.
 */
export function computeCalendar(workouts: CalendarWorkout[]): CalendarDay[] {
    const days = new Map<string, CalendarDay>();

    for (const workout of workouts) {
        const started = new Date(workout.startedAt);
        const key = `${started.getUTCFullYear()}-${pad(started.getUTCMonth() + 1)}-${pad(started.getUTCDate())}`;

        let day = days.get(key);
        if (day === undefined) {
            day = { date: key, workoutCount: 0, totalVolume: 0 };
            days.set(key, day);
        }

        day.workoutCount += 1;
        for (const set of workout.sets) {
            day.totalVolume += (set.weightKg ?? 0) * (set.reps ?? 0);
        }
    }

    return [...days.values()]
        .map((day) => ({ ...day, totalVolume: round(day.totalVolume) }))
        .sort((left, right) => left.date.localeCompare(right.date));
}
