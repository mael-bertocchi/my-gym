import { CreateWorkoutExerciseSchema, UpdateWorkoutExerciseSchema } from 'src/modules/workout-exercises/workout-exercises-models';
import { describe, expect, it } from 'vitest';

const EXERCISE_ID = '22222222-2222-4222-8222-222222222222';
const SUPERSET_ID = '66666666-6666-4666-8666-666666666666';
const BRAND_ID = '77777777-7777-4777-8777-777777777777';

describe('CreateWorkoutExerciseSchema', () => {
    it('accepts an exerciseId', () => {
        expect(CreateWorkoutExerciseSchema.safeParse({ exerciseId: EXERCISE_ID }).success).toBe(true);
    });

    it('accepts session settings as a key/value object', () => {
        expect(CreateWorkoutExerciseSchema.safeParse({ exerciseId: EXERCISE_ID, settings: { seatHeight: 4, pad: 'B' } }).success).toBe(true);
    });

    it('accepts a supersetId', () => {
        expect(CreateWorkoutExerciseSchema.safeParse({ exerciseId: EXERCISE_ID, supersetId: SUPERSET_ID }).success).toBe(true);
    });

    it('accepts a brandId', () => {
        expect(CreateWorkoutExerciseSchema.safeParse({ exerciseId: EXERCISE_ID, brandId: BRAND_ID }).success).toBe(true);
    });

    it('rejects a non-uuid brandId', () => {
        expect(CreateWorkoutExerciseSchema.safeParse({ exerciseId: EXERCISE_ID, brandId: 'hammer' }).success).toBe(false);
    });

    it('rejects a non-uuid supersetId', () => {
        expect(CreateWorkoutExerciseSchema.safeParse({ exerciseId: EXERCISE_ID, supersetId: 'pair-1' }).success).toBe(false);
    });

    it('rejects a missing exerciseId', () => {
        expect(CreateWorkoutExerciseSchema.safeParse({}).success).toBe(false);
    });

    it('rejects an invalid exerciseId', () => {
        expect(CreateWorkoutExerciseSchema.safeParse({ exerciseId: 'nope' }).success).toBe(false);
    });
});

describe('UpdateWorkoutExerciseSchema', () => {
    it('rejects an empty update', () => {
        expect(UpdateWorkoutExerciseSchema.safeParse({}).success).toBe(false);
    });

    it('accepts clearing notes with null', () => {
        expect(UpdateWorkoutExerciseSchema.safeParse({ notes: null }).success).toBe(true);
    });

    it('accepts clearing the superset link with null', () => {
        expect(UpdateWorkoutExerciseSchema.safeParse({ supersetId: null }).success).toBe(true);
    });

    it('accepts setting a brand and clearing it with null', () => {
        expect(UpdateWorkoutExerciseSchema.safeParse({ brandId: BRAND_ID }).success).toBe(true);
        expect(UpdateWorkoutExerciseSchema.safeParse({ brandId: null }).success).toBe(true);
    });
});
