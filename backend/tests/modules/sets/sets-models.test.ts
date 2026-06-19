import { CreateSetSchema, UpdateSetSchema } from 'src/modules/sets/sets-models';
import { describe, expect, it } from 'vitest';

describe('CreateSetSchema', () => {
    it('accepts a minimal body with only workoutExerciseId', () => {
        expect(CreateSetSchema.safeParse({ workoutExerciseId: '11111111-1111-4111-8111-111111111111' }).success).toBe(true);
    });

    it('accepts a full body', () => {
        const result = CreateSetSchema.safeParse({
            workoutExerciseId: '11111111-1111-4111-8111-111111111111',
            setType: 'WORKING',
            weightKg: 100,
            reps: 8,
            rpe: 8.5,
            restSeconds: 120,
            isCompleted: true
        });
        expect(result.success).toBe(true);
    });

    it('rejects a missing workoutExerciseId', () => {
        expect(CreateSetSchema.safeParse({ reps: 8 }).success).toBe(false);
    });

    it('rejects an rpe above 10', () => {
        expect(CreateSetSchema.safeParse({ workoutExerciseId: '11111111-1111-4111-8111-111111111111', rpe: 11 }).success).toBe(false);
    });

    it('rejects an unknown setType', () => {
        expect(CreateSetSchema.safeParse({ workoutExerciseId: '11111111-1111-4111-8111-111111111111', setType: 'CARDIO' }).success).toBe(false);
    });
});

describe('UpdateSetSchema', () => {
    it('rejects an empty update', () => {
        expect(UpdateSetSchema.safeParse({}).success).toBe(false);
    });

    it('accepts clearing the weight with null (bodyweight)', () => {
        expect(UpdateSetSchema.safeParse({ weightKg: null }).success).toBe(true);
    });
});
