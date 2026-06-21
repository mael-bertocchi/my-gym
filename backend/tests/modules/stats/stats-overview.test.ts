import { computeOverview } from 'src/modules/stats/stats-overview';
import { describe, expect, it } from 'vitest';

describe('computeOverview', () => {
    it('buckets a Monday and Wednesday into one ISO week and sums duration, volume and reps', () => {
        const overview = computeOverview([
            { startedAt: '2026-06-15T08:00:00.000Z', endedAt: '2026-06-15T09:00:00.000Z', sets: [{ weightKg: 100, reps: 5 }] },
            { startedAt: '2026-06-17T08:00:00.000Z', endedAt: '2026-06-17T08:30:00.000Z', sets: [{ weightKg: 50, reps: 10 }] }
        ], 'week');

        expect(overview.buckets).toHaveLength(1);
        expect(overview.buckets[0].start).toBe('2026-06-15T00:00:00.000Z');
        expect(overview.buckets[0].workoutCount).toBe(2);
        expect(overview.buckets[0].totalDurationSeconds).toBe(5400);
        expect(overview.buckets[0].totalVolume).toBe(1000);
        expect(overview.buckets[0].totalReps).toBe(15);
        expect(overview.buckets[0].totalSets).toBe(2);
        expect(overview.summary.workoutCount).toBe(2);
        expect(overview.summary.totalVolume).toBe(1000);
    });

    it('counts an in-progress workout but adds no duration', () => {
        const overview = computeOverview([
            { startedAt: '2026-06-15T08:00:00.000Z', endedAt: null, sets: [] }
        ], 'week');
        expect(overview.buckets[0].workoutCount).toBe(1);
        expect(overview.buckets[0].totalDurationSeconds).toBe(0);
    });

    it('separates dates straddling a month boundary into month buckets, ascending', () => {
        const overview = computeOverview([
            { startedAt: '2026-06-01T08:00:00.000Z', endedAt: '2026-06-01T08:30:00.000Z', sets: [] },
            { startedAt: '2026-05-31T08:00:00.000Z', endedAt: '2026-05-31T08:30:00.000Z', sets: [] }
        ], 'month');
        expect(overview.buckets.map((bucket) => bucket.start)).toEqual(['2026-05-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z']);
    });
});
