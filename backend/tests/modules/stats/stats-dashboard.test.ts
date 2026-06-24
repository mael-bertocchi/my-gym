import { computeDashboard } from 'src/modules/stats/stats-dashboard';
import { describe, expect, it } from 'vitest';

describe('computeDashboard', () => {
    it('sums lifetime totals and completed-workout duration', () => {
        const dashboard = computeDashboard([
            { startedAt: '2026-06-15T08:00:00.000Z', endedAt: '2026-06-15T09:00:00.000Z', sets: [{ weightKg: 100, reps: 5 }] }
        ], new Date('2026-06-16T00:00:00.000Z'));

        expect(dashboard.totals.workouts).toBe(1);
        expect(dashboard.totals.volume).toBe(500);
        expect(dashboard.totals.sets).toBe(1);
        expect(dashboard.totals.reps).toBe(5);
        expect(dashboard.totals.durationSeconds).toBe(3600);
    });

    it('counts consecutive-week streaks ending at the current week', () => {
        const dashboard = computeDashboard([
            { startedAt: '2026-06-08T08:00:00.000Z', endedAt: null, sets: [] },
            { startedAt: '2026-06-15T08:00:00.000Z', endedAt: null, sets: [] }
        ], new Date('2026-06-16T00:00:00.000Z'));

        expect(dashboard.streak.currentWeeks).toBe(2);
        expect(dashboard.streak.longestWeeks).toBe(2);
    });

    it('credits recent volume only within the trailing windows', () => {
        const dashboard = computeDashboard([
            { startedAt: '2026-06-15T08:00:00.000Z', endedAt: null, sets: [{ weightKg: 100, reps: 5 }] },
            { startedAt: '2026-05-01T08:00:00.000Z', endedAt: null, sets: [{ weightKg: 100, reps: 5 }] }
        ], new Date('2026-06-16T00:00:00.000Z'));

        expect(dashboard.frequency.last7Days).toBe(1);
        expect(dashboard.recentVolume.last7Days).toBe(500);
        expect(dashboard.recentVolume.last30Days).toBe(500);
    });
});
