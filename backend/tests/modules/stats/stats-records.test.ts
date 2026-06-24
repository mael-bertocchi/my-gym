import { computePersonalRecords } from 'src/modules/stats/stats-records';
import { describe, expect, it } from 'vitest';

describe('computePersonalRecords', () => {
    it('computes per-exercise bests and sorts ascending by name', () => {
        const records = computePersonalRecords([
            { exerciseId: 'b', exerciseName: 'Bench', sets: [{ weightKg: 100, reps: 5 }, { weightKg: 80, reps: 10 }] },
            { exerciseId: 'a', exerciseName: 'Arm Curl', sets: [{ weightKg: 20, reps: 12 }] }
        ]);

        expect(records.map((record) => record.exerciseName)).toEqual(['Arm Curl', 'Bench']);

        const bench = records[1];
        expect(bench.heaviestKg).toBe(100);
        expect(bench.bestVolume).toBe(800);
        expect(bench.bestEstimated1RM).toBe(116.7);
    });

    it('reports nulls for a bodyweight-only exercise', () => {
        const records = computePersonalRecords([
            { exerciseId: 'p', exerciseName: 'Pull Up', sets: [{ weightKg: null, reps: 10 }] }
        ]);

        expect(records[0].heaviestKg).toBe(null);
        expect(records[0].bestEstimated1RM).toBe(null);
        expect(records[0].bestVolume).toBe(null);
    });
});
