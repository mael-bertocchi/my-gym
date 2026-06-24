import type { RawSet } from 'src/modules/stats/stats-compute';
import { round } from 'src/shared/math';

/**
 * @constant MS_PER_DAY
 * @description Milliseconds in a day.
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * @constant MS_PER_WEEK
 * @description Milliseconds in a week.
 */
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * @interface DashboardWorkout
 * @description One workout's timing and its working sets (weights already converted from Decimal).
 */
export interface DashboardWorkout {
    startedAt: string; /*!< ISO timestamp when the workout started */
    endedAt: string | null; /*!< ISO timestamp when it ended, or null while still in progress */
    sets: RawSet[]; /*!< Every WORKING set logged across the workout */
}

/**
 * @interface Dashboard
 * @description The aggregate dashboard: lifetime totals, training streak, frequency, and recent volume.
 */
export interface Dashboard {
    totals: { workouts: number; volume: number; sets: number; reps: number; durationSeconds: number }; /*!< Lifetime totals */
    streak: { currentWeeks: number; longestWeeks: number }; /*!< Consecutive-week training streaks */
    frequency: { last7Days: number; last30Days: number; workoutsPerWeek: number }; /*!< Recent counts and the average workouts per week */
    recentVolume: { last7Days: number; last30Days: number }; /*!< Working-set volume over the recent windows */
}

/**
 * @function weekIndex
 * @description Returns a monotonic integer identifying the UTC week (Monday start) a date falls in.
 *
 * @param {Date} date The date to bucket.
 * @returns {number} The week index (consecutive weeks differ by one).
 */
function weekIndex(date: Date): number {
    const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const weekday = day.getUTCDay();
    const shift = weekday !== 0 ? 1 - weekday : -6;
    day.setUTCDate(day.getUTCDate() + shift);

    return Math.round(day.getTime() / MS_PER_WEEK);
}

/**
 * @function computeStreak
 * @description Computes the current and longest consecutive-week training streaks from the set of active week indices.
 *
 * @param {Set<number>} weeks The distinct week indices that contain at least one workout.
 * @param {number} currentWeek The week index of "now".
 * @returns {{ currentWeeks: number; longestWeeks: number }} The current and longest weekly streaks.
 */
function computeStreak(weeks: Set<number>, currentWeek: number): { currentWeeks: number; longestWeeks: number } {
    const sorted = [...weeks].sort((left, right) => left - right);

    let longestWeeks = 0;
    let run = 0;
    let previous: number | null = null;

    for (const week of sorted) {
        run = previous !== null && week === previous + 1 ? run + 1 : 1;
        longestWeeks = Math.max(longestWeeks, run);
        previous = week;
    }

    let anchor = weeks.has(currentWeek) ? currentWeek : (weeks.has(currentWeek - 1) ? currentWeek - 1 : null);
    let currentWeeks = 0;

    while (anchor !== null && weeks.has(anchor)) {
        currentWeeks += 1;
        anchor -= 1;
    }

    return { currentWeeks, longestWeeks };
}

/**
 * @function computeDashboard
 * @description Computes lifetime totals, weekly streaks, recent frequency, and recent volume from the caller's workouts.
 *
 * @param {DashboardWorkout[]} workouts The caller's workouts with their working sets.
 * @param {Date} now The reference instant for recency and streak windows.
 * @returns {Dashboard} The aggregate dashboard.
 */
export function computeDashboard(workouts: DashboardWorkout[], now: Date): Dashboard {
    const totals = { workouts: 0, volume: 0, sets: 0, reps: 0, durationSeconds: 0 };
    const recentVolume = { last7Days: 0, last30Days: 0 };
    const frequency = { last7Days: 0, last30Days: 0, workoutsPerWeek: 0 };

    const weeks = new Set<number>();
    const nowMs = now.getTime();

    let earliestMs: number | null = null;
    let latestMs: number | null = null;

    for (const workout of workouts) {
        const started = new Date(workout.startedAt);
        const startedMs = started.getTime();

        totals.workouts += 1;
        weeks.add(weekIndex(started));

        earliestMs = earliestMs === null ? startedMs : Math.min(earliestMs, startedMs);
        latestMs = latestMs === null ? startedMs : Math.max(latestMs, startedMs);

        if (workout.endedAt !== null) {
            totals.durationSeconds += Math.max(0, Math.round((new Date(workout.endedAt).getTime() - startedMs) / 1000));
        }

        let workoutVolume = 0;
        for (const set of workout.sets) {
            const reps = set.reps ?? 0;
            totals.sets += 1;
            totals.reps += reps;
            workoutVolume += (set.weightKg ?? 0) * reps;
        }
        totals.volume += workoutVolume;

        const age = nowMs - startedMs;
        if (age >= 0 && age <= 7 * MS_PER_DAY) {
            frequency.last7Days += 1;
            recentVolume.last7Days += workoutVolume;
        }
        if (age >= 0 && age <= 30 * MS_PER_DAY) {
            frequency.last30Days += 1;
            recentVolume.last30Days += workoutVolume;
        }
    }

    if (earliestMs !== null && latestMs !== null) {
        const weeksSpan = Math.floor((latestMs - earliestMs) / MS_PER_WEEK) + 1;
        frequency.workoutsPerWeek = round(totals.workouts / weeksSpan);
    }

    return {
        totals: { ...totals, volume: round(totals.volume) },
        streak: computeStreak(weeks, weekIndex(now)),
        frequency,
        recentVolume: { last7Days: round(recentVolume.last7Days), last30Days: round(recentVolume.last30Days) }
    };
}
