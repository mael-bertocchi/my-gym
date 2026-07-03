import { UpsertExerciseSettingSchema } from 'src/modules/exercise-settings/exercise-settings-models';
import { describe, expect, it } from 'vitest';

const EXERCISE_ID = '44444444-4444-4444-8444-444444444444';

describe('UpsertExerciseSettingSchema', () => {
    it('accepts a valid upsert with structured settings', () => {
        expect(UpsertExerciseSettingSchema.safeParse({ exerciseId: EXERCISE_ID, settings: { seatHeight: 4, pad: 'B' } }).success).toBe(true);
    });

    it('rejects a missing settings object', () => {
        expect(UpsertExerciseSettingSchema.safeParse({ exerciseId: EXERCISE_ID }).success).toBe(false);
    });

    it('rejects an invalid exerciseId', () => {
        expect(UpsertExerciseSettingSchema.safeParse({ exerciseId: 'nope', settings: {} }).success).toBe(false);
    });
});
