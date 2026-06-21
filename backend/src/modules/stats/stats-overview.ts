import type { RawSet } from 'src/modules/stats/stats-compute';
import { round } from 'src/shared/math';
import type { Maybe } from 'src/shared/models';

/**
 * @type OverviewBucketUnit
 * @description The calendar granularity workouts are grouped by.
 */
export type OverviewBucketUnit = 'day' | 'week' | 'month';

/**
 * @interface RawWorkout
 * @description One workout's timing and its working sets (weights already converted from Decimal).
 */
export interface RawWorkout {
    startedAt: string; /*!< ISO timestamp when the workout started */
    endedAt: Maybe<string>; /*!< ISO timestamp when it ended, or null while still in progress */
    sets: RawSet[]; /*!< Every WORKING set logged across the workout */
}

/**
 * @interface OverviewBucket
 * @description Aggregated totals for one calendar bucket.
 */
export interface OverviewBucket {
    start: string; /*!< ISO timestamp of the bucket start (UTC; Monday for weeks, 1st for months) */
    workoutCount: number; /*!< Workouts started within the bucket */
    totalDurationSeconds: number; /*!< Summed duration of completed workouts in the bucket */
    totalVolume: number; /*!< Summed weight x reps over working sets */
    totalReps: number; /*!< Summed reps over working sets */
    totalSets: number; /*!< Count of working sets */
}

/**
 * @interface OverviewSummary
 * @description Totals across every bucket in the range.
 */
export interface OverviewSummary {
    workoutCount: number; /*!< Total workouts */
    totalDurationSeconds: number; /*!< Total completed-workout duration */
    totalVolume: number; /*!< Total working-set volume */
    totalReps: number; /*!< Total working-set reps */
    totalSets: number; /*!< Total working sets */
}

/**
 * @interface Overview
 * @description Per-bucket totals plus an overall summary.
 */
export interface Overview {
    buckets: OverviewBucket[]; /*!< Active buckets only (no gap-filling), ascending by start */
    summary: OverviewSummary; /*!< Totals across the whole range */
}

/**
 * @function bucketStart
 * @description Returns the UTC start instant of the bucket a date falls in.
 *
 * @param {Date} date The date to bucket.
 * @param {OverviewBucketUnit} unit The calendar granularity.
 * @returns {Date} The bucket's start (midnight UTC; Monday for weeks, 1st for months).
 */
function bucketStart(date: Date, unit: OverviewBucketUnit): Date {
    if (unit === 'month') {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    }

    const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

    if (unit === 'day') {
        return day;
    }

    const weekday = day.getUTCDay();
    const shift = weekday !== 0 ? 1 - weekday : -6;
    day.setUTCDate(day.getUTCDate() + shift);
    return day;
}

/**
 * @function computeOverview
 * @description Groups workouts into calendar buckets and sums duration, volume, reps and sets.
 *
 * @param {RawWorkout[]} workouts The user's workouts (working sets only).
 * @param {OverviewBucketUnit} unit The calendar granularity to bucket by.
 * @returns {Overview} The per-bucket totals and an overall summary.
 */
export function computeOverview(workouts: RawWorkout[], unit: OverviewBucketUnit): Overview {
    const buckets = new Map<string, OverviewBucket>();
    const summary: OverviewSummary = { workoutCount: 0, totalDurationSeconds: 0, totalVolume: 0, totalReps: 0, totalSets: 0 };

    for (const workout of workouts) {
        const started = new Date(workout.startedAt);
        const key = bucketStart(started, unit).toISOString();

        let bucket = buckets.get(key);
        if (bucket === undefined) {
            bucket = { start: key, workoutCount: 0, totalDurationSeconds: 0, totalVolume: 0, totalReps: 0, totalSets: 0 };
            buckets.set(key, bucket);
        }

        const duration = workout.endedAt !== null ? Math.max(0, Math.round((new Date(workout.endedAt).getTime() - started.getTime()) / 1000)) : 0;
        bucket.workoutCount += 1;
        bucket.totalDurationSeconds += duration;
        summary.workoutCount += 1;
        summary.totalDurationSeconds += duration;

        for (const set of workout.sets) {
            const reps = set.reps ?? 0;
            const volume = (set.weightKg ?? 0) * reps;
            bucket.totalSets += 1;
            bucket.totalReps += reps;
            bucket.totalVolume += volume;
            summary.totalSets += 1;
            summary.totalReps += reps;
            summary.totalVolume += volume;
        }
    }

    const ordered = [...buckets.values()]
        .map((bucket) => ({ ...bucket, totalVolume: round(bucket.totalVolume) }))
        .sort((left, right) => left.start.localeCompare(right.start));

    return { buckets: ordered, summary: { ...summary, totalVolume: round(summary.totalVolume) } };
}
