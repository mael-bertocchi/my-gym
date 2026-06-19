import { computeVariantStats } from 'src/modules/stats/stats-compute';
import { describe, expect, it } from 'vitest';

describe('computeVariantStats', () => {
    it('computes volume, max weight, and estimated 1RM for a weighted session', () => {
        const stats = computeVariantStats([
            { date: '2026-06-18T10:00:00.000Z', sets: [{ weightKg: 100, reps: 5 }, { weightKg: 100, reps: 3 }] }
        ]);
        expect(stats.sessions).toHaveLength(1);
        expect(stats.sessions[0].totalVolume).toBe(800);
        expect(stats.sessions[0].maxWeightKg).toBe(100);
        expect(stats.sessions[0].bestEstimated1RM).toBe(116.7);
        expect(stats.summary.maxWeightKg).toBe(100);
        expect(stats.summary.sessionCount).toBe(1);
    });

    it('handles a bodyweight session (no weights)', () => {
        const stats = computeVariantStats([
            { date: '2026-06-18T10:00:00.000Z', sets: [{ weightKg: null, reps: 10 }, { weightKg: null, reps: 8 }] }
        ]);
        expect(stats.sessions[0].maxWeightKg).toBe(null);
        expect(stats.sessions[0].bestEstimated1RM).toBe(null);
        expect(stats.sessions[0].totalReps).toBe(18);
        expect(stats.sessions[0].totalVolume).toBe(0);
        expect(stats.summary.bestTotalVolume).toBe(0);
    });

    it('returns an empty result with null summary maxima for no sessions', () => {
        const stats = computeVariantStats([]);
        expect(stats.sessions).toHaveLength(0);
        expect(stats.summary.sessionCount).toBe(0);
        expect(stats.summary.maxWeightKg).toBe(null);
        expect(stats.summary.bestEstimated1RM).toBe(null);
        expect(stats.summary.bestTotalVolume).toBe(null);
    });
});
