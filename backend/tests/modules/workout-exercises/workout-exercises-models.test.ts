import { CreateWorkoutExerciseSchema, UpdateWorkoutExerciseSchema } from 'src/modules/workout-exercises/workout-exercises-models';
import { describe, expect, it } from 'vitest';

const EXERCISE_ID = '22222222-2222-4222-8222-222222222222';

describe('CreateWorkoutExerciseSchema', () => {
    it('accepts an exerciseId', () => {
        expect(CreateWorkoutExerciseSchema.safeParse({ exerciseId: EXERCISE_ID }).success).toBe(true);
    });

    it('accepts session settings as a key/value object', () => {
        expect(CreateWorkoutExerciseSchema.safeParse({ exerciseId: EXERCISE_ID, settings: { seatHeight: 4, pad: 'B' } }).success).toBe(true);
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
});
