import { computeCalendar } from 'src/modules/stats/stats-calendar';
import { describe, expect, it } from 'vitest';

describe('computeCalendar', () => {
    it('buckets workouts by UTC day and sums working-set volume', () => {
        const days = computeCalendar([
            { startedAt: '2026-06-15T08:00:00.000Z', sets: [{ weightKg: 100, reps: 5 }] },
            { startedAt: '2026-06-15T18:00:00.000Z', sets: [{ weightKg: 50, reps: 10 }] },
            { startedAt: '2026-06-16T08:00:00.000Z', sets: [] }
        ]);

        expect(days).toHaveLength(2);
        expect(days[0]).toEqual({ date: '2026-06-15', workoutCount: 2, totalVolume: 1000 });
        expect(days[1].date).toBe('2026-06-16');
        expect(days[1].workoutCount).toBe(1);
    });
});
