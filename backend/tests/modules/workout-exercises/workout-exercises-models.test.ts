import { CreateWorkoutExerciseSchema, UpdateWorkoutExerciseSchema } from 'src/modules/workout-exercises/workout-exercises-models';
import { describe, expect, it } from 'vitest';

describe('CreateWorkoutExerciseSchema', () => {
    it('accepts a workoutId and exerciseVariantId', () => {
        expect(CreateWorkoutExerciseSchema.safeParse({ workoutId: '11111111-1111-4111-8111-111111111111', exerciseVariantId: '22222222-2222-4222-8222-222222222222' }).success).toBe(true);
    });

    it('rejects a missing exerciseVariantId', () => {
        expect(CreateWorkoutExerciseSchema.safeParse({ workoutId: '11111111-1111-4111-8111-111111111111' }).success).toBe(false);
    });

    it('rejects an invalid workoutId', () => {
        expect(CreateWorkoutExerciseSchema.safeParse({ workoutId: 'nope', exerciseVariantId: '22222222-2222-4222-8222-222222222222' }).success).toBe(false);
    });
});

describe('UpdateWorkoutExerciseSchema', () => {
    it('rejects an empty update', () => {
        expect(UpdateWorkoutExerciseSchema.safeParse({}).success).toBe(false);
    });
});
