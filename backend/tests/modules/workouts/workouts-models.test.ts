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

    it('rejects an invalid gymLocationId', () => {
        expect(CreateWorkoutSchema.safeParse({ gymLocationId: 'nope' }).success).toBe(false);
    });
});

describe('UpdateWorkoutSchema', () => {
    it('rejects an empty update', () => {
        expect(UpdateWorkoutSchema.safeParse({}).success).toBe(false);
    });

    it('accepts clearing endedAt with null', () => {
        expect(UpdateWorkoutSchema.safeParse({ endedAt: null }).success).toBe(true);
    });
});
