import { CreateExerciseGroupSchema } from 'src/modules/exercise-groups/exercise-groups-models';
import { describe, expect, it } from 'vitest';

describe('CreateExerciseGroupSchema', () => {
    it('accepts a non-empty name', () => {
        expect(CreateExerciseGroupSchema.safeParse({ name: 'Chest Press' }).success).toBe(true);
    });

    it('rejects an empty name', () => {
        expect(CreateExerciseGroupSchema.safeParse({ name: '' }).success).toBe(false);
    });

    it('rejects a missing name', () => {
        expect(CreateExerciseGroupSchema.safeParse({}).success).toBe(false);
    });
});
