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

    it('accepts ratings and rejects out-of-range values', () => {
        expect(CreateWorkoutSchema.safeParse({ difficultyRating: 10, enjoymentRating: 5 }).success).toBe(true);
        expect(CreateWorkoutSchema.safeParse({ difficultyRating: 11 }).success).toBe(false);
        expect(CreateWorkoutSchema.safeParse({ enjoymentRating: 6 }).success).toBe(false);
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

    it('accepts integer ratings and clearing them with null', () => {
        expect(UpdateWorkoutSchema.safeParse({ difficultyRating: 7 }).success).toBe(true);
        expect(UpdateWorkoutSchema.safeParse({ difficultyRating: null }).success).toBe(true);
        expect(UpdateWorkoutSchema.safeParse({ enjoymentRating: 4 }).success).toBe(true);
        expect(UpdateWorkoutSchema.safeParse({ enjoymentRating: null }).success).toBe(true);
    });

    it('rejects a non-integer or out-of-range difficultyRating', () => {
        expect(UpdateWorkoutSchema.safeParse({ difficultyRating: 6.5 }).success).toBe(false);
        expect(UpdateWorkoutSchema.safeParse({ difficultyRating: 0 }).success).toBe(false);
        expect(UpdateWorkoutSchema.safeParse({ difficultyRating: 11 }).success).toBe(false);
    });

    it('rejects a non-integer or out-of-range enjoymentRating', () => {
        expect(UpdateWorkoutSchema.safeParse({ enjoymentRating: 3.5 }).success).toBe(false);
        expect(UpdateWorkoutSchema.safeParse({ enjoymentRating: 0 }).success).toBe(false);
        expect(UpdateWorkoutSchema.safeParse({ enjoymentRating: 6 }).success).toBe(false);
    });
});
