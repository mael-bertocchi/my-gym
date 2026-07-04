import { CreateWorkoutSchema, UpdateWorkoutSchema } from 'src/modules/workouts/workouts-models';
import { describe, expect, it } from 'vitest';

describe('CreateWorkoutSchema', () => {
    it('accepts an empty body (all fields optional)', () => {
        expect(CreateWorkoutSchema.safeParse({}).success).toBe(true);
    });

    it('coerces an ISO startedAt string to a Date', () => {
        const result = CreateWorkoutSchema.safeParse({ startedAt: '2026-06-19T10:00:00.000Z' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.startedAt instanceof Date).toBe(true);
        }
    });

    it('rejects an invalid gymId', () => {
        expect(CreateWorkoutSchema.safeParse({ gymId: 'nope' }).success).toBe(false);
    });
});

describe('UpdateWorkoutSchema', () => {
    it('rejects an empty update', () => {
        expect(UpdateWorkoutSchema.safeParse({}).success).toBe(false);
    });

    it('accepts clearing endedAt with null', () => {
        expect(UpdateWorkoutSchema.safeParse({ endedAt: null }).success).toBe(true);
    });

    it('accepts an integer averageHeartRate and clearing it with null', () => {
        expect(UpdateWorkoutSchema.safeParse({ averageHeartRate: 132 }).success).toBe(true);
        expect(UpdateWorkoutSchema.safeParse({ averageHeartRate: null }).success).toBe(true);
    });

    it('rejects a non-integer or out-of-range averageHeartRate', () => {
        expect(UpdateWorkoutSchema.safeParse({ averageHeartRate: 132.5 }).success).toBe(false);
        expect(UpdateWorkoutSchema.safeParse({ averageHeartRate: 0 }).success).toBe(false);
        expect(UpdateWorkoutSchema.safeParse({ averageHeartRate: 301 }).success).toBe(false);
    });
});
