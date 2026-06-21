import { computeMuscleBreakdown, SECONDARY_MUSCLE_WEIGHT } from 'src/modules/stats/stats-muscles';
import { describe, expect, it } from 'vitest';

describe('computeMuscleBreakdown', () => {
    it('credits the primary muscle fully and each secondary at half', () => {
        const breakdown = computeMuscleBreakdown([
            { primaryMuscle: 'CHEST', secondaryMuscles: ['TRICEPS', 'FRONT_DELTS'], sets: [{ weightKg: 100, reps: 10 }] }
        ]);

        expect(breakdown).toEqual([
            { muscle: 'CHEST', sets: 1, volume: 1000 },
            { muscle: 'TRICEPS', sets: 0.5, volume: 500 },
            { muscle: 'FRONT_DELTS', sets: 0.5, volume: 500 }
        ]);
        expect(SECONDARY_MUSCLE_WEIGHT).toBe(0.5);
    });

    it('aggregates a muscle that is primary in one entry and secondary in another', () => {
        const breakdown = computeMuscleBreakdown([
            { primaryMuscle: 'TRICEPS', secondaryMuscles: [], sets: [{ weightKg: 40, reps: 10 }] },
            { primaryMuscle: 'CHEST', secondaryMuscles: ['TRICEPS'], sets: [{ weightKg: 100, reps: 10 }] }
        ]);
        const triceps = breakdown.find((entry) => entry.muscle === 'TRICEPS');
        expect(triceps).toEqual({ muscle: 'TRICEPS', sets: 1.5, volume: 900 });
    });

    it('counts bodyweight sets toward set credit with zero volume', () => {
        const breakdown = computeMuscleBreakdown([
            { primaryMuscle: 'ABS', secondaryMuscles: [], sets: [{ weightKg: null, reps: 20 }] }
        ]);
        expect(breakdown).toEqual([{ muscle: 'ABS', sets: 1, volume: 0 }]);
    });
});
