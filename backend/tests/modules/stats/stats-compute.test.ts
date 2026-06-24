import { computeExerciseStats } from 'src/modules/stats/stats-compute';
import { describe, expect, it } from 'vitest';

describe('computeExerciseStats', () => {
    it('computes volume, max weight, and estimated 1RM for a weighted session', () => {
        const stats = computeExerciseStats([
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
        const stats = computeExerciseStats([
            { date: '2026-06-18T10:00:00.000Z', sets: [{ weightKg: null, reps: 10 }, { weightKg: null, reps: 8 }] }
        ]);
        expect(stats.sessions[0].maxWeightKg).toBe(null);
        expect(stats.sessions[0].bestEstimated1RM).toBe(null);
        expect(stats.sessions[0].totalReps).toBe(18);
        expect(stats.sessions[0].totalVolume).toBe(0);
        expect(stats.summary.bestTotalVolume).toBe(0);
    });

    it('returns an empty result with null summary maxima for no sessions', () => {
        const stats = computeExerciseStats([]);
        expect(stats.sessions).toHaveLength(0);
        expect(stats.summary.sessionCount).toBe(0);
        expect(stats.summary.maxWeightKg).toBe(null);
        expect(stats.summary.bestEstimated1RM).toBe(null);
        expect(stats.summary.bestTotalVolume).toBe(null);
    });

    it('tracks the heaviest load per rep count across sessions, ascending by reps', () => {
        const stats = computeExerciseStats([
            { date: '2026-06-10T10:00:00.000Z', sets: [{ weightKg: 100, reps: 5 }, { weightKg: 90, reps: 8 }] },
            { date: '2026-06-17T10:00:00.000Z', sets: [{ weightKg: 105, reps: 5 }, { weightKg: 60, reps: 5 }] }
        ]);
        expect(stats.summary.repPRs).toEqual([
            { reps: 5, weightKg: 105, estimated1RM: 122.5 },
            { reps: 8, weightKg: 90, estimated1RM: 114 }
        ]);
    });

    it('excludes bodyweight and null-rep sets from rep PRs', () => {
        const stats = computeExerciseStats([
            { date: '2026-06-17T10:00:00.000Z', sets: [{ weightKg: null, reps: 10 }, { weightKg: 80, reps: null }] }
        ]);
        expect(stats.summary.repPRs).toEqual([]);
    });
});
