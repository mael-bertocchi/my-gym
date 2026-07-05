import { PullQuerySchema, PushBodySchema, SyncWorkoutSchema } from 'src/modules/sync/sync-models';
import { describe, expect, it } from 'vitest';

const WORKOUT_ID = '11111111-1111-4111-8111-111111111111';
const WORKOUT_EXERCISE_ID = '22222222-2222-4222-8222-222222222222';
const EXERCISE_ID = '33333333-3333-4333-8333-333333333333';
const SET_ID = '44444444-4444-4444-8444-444444444444';
const GYM_ID = '55555555-5555-4555-8555-555555555555';
const SUPERSET_ID = '66666666-6666-4666-8666-666666666666';

function aggregate(): unknown {
    return {
        id: WORKOUT_ID,
        startedAt: '2026-06-15T10:00:00.000Z',
        updatedAt: '2026-06-15T10:30:00.000Z',
        exercises: [
            {
                id: WORKOUT_EXERCISE_ID,
                exerciseId: EXERCISE_ID,
                position: 1,
                sets: [{ id: SET_ID, setNumber: 1, setType: 'NORMAL', weightKg: 100, reps: 5 }]
            }
        ]
    };
}

describe('SyncWorkoutSchema', () => {
    it('accepts a full workout aggregate and coerces dates', () => {
        const result = SyncWorkoutSchema.safeParse(aggregate());
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.startedAt instanceof Date).toBe(true);
            expect(result.data.updatedAt instanceof Date).toBe(true);
        }
    });

    it('rejects a set with an unknown setType', () => {
        const bad = aggregate() as { exercises: { sets: { setType: string }[] }[] };
        bad.exercises[0].sets[0].setType = 'CARDIO';
        expect(SyncWorkoutSchema.safeParse(bad).success).toBe(false);
    });

    it('accepts a single-arm set side and keeps it', () => {
        const unilateral = aggregate() as { exercises: { sets: { side?: string }[] }[] };
        unilateral.exercises[0].sets[0].side = 'LEFT';
        const result = SyncWorkoutSchema.safeParse(unilateral);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.exercises[0].sets[0].side).toBe('LEFT');
        }
    });

    it('rejects a set with an unknown side', () => {
        const bad = aggregate() as { exercises: { sets: { side?: string }[] }[] };
        bad.exercises[0].sets[0].side = 'BOTH';
        expect(SyncWorkoutSchema.safeParse(bad).success).toBe(false);
    });

    it('rejects an exercise entry missing its exerciseId', () => {
        const bad = aggregate() as { exercises: { exerciseId?: string }[] };
        delete bad.exercises[0].exerciseId;
        expect(SyncWorkoutSchema.safeParse(bad).success).toBe(false);
    });

    it('accepts an exercise entry with a supersetId and keeps it', () => {
        const linked = aggregate() as { exercises: { supersetId?: string | null }[] };
        linked.exercises[0].supersetId = SUPERSET_ID;
        const result = SyncWorkoutSchema.safeParse(linked);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.exercises[0].supersetId).toBe(SUPERSET_ID);
        }
    });

    it('rejects a non-uuid supersetId', () => {
        const bad = aggregate() as { exercises: { supersetId?: string }[] };
        bad.exercises[0].supersetId = 'pair-1';
        expect(SyncWorkoutSchema.safeParse(bad).success).toBe(false);
    });

    it('accepts a workout with an averageHeartRate and keeps it', () => {
        const timed = aggregate() as { averageHeartRate?: number };
        timed.averageHeartRate = 128;
        const result = SyncWorkoutSchema.safeParse(timed);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.averageHeartRate).toBe(128);
        }
    });

    it('accepts a workout without an averageHeartRate', () => {
        const result = SyncWorkoutSchema.safeParse(aggregate());
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.averageHeartRate).toBeUndefined();
        }
    });

    it('rejects a non-integer or out-of-range averageHeartRate', () => {
        const fractional = aggregate() as { averageHeartRate?: number };
        fractional.averageHeartRate = 120.4;
        expect(SyncWorkoutSchema.safeParse(fractional).success).toBe(false);
        const excessive = aggregate() as { averageHeartRate?: number };
        excessive.averageHeartRate = 400;
        expect(SyncWorkoutSchema.safeParse(excessive).success).toBe(false);
    });
});

describe('PushBodySchema', () => {
    it('defaults every collection to empty', () => {
        const result = PushBodySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.workouts).toEqual([]);
            expect(result.data.exerciseSettings).toEqual([]);
            expect(result.data.deletions).toEqual([]);
        }
    });

    it('accepts a workout deletion', () => {
        expect(PushBodySchema.safeParse({ deletions: [{ entityType: 'WORKOUT', entityId: WORKOUT_ID }] }).success).toBe(true);
    });

    it('rejects an unknown deletion entityType', () => {
        expect(PushBodySchema.safeParse({ deletions: [{ entityType: 'BRAND', entityId: GYM_ID }] }).success).toBe(false);
    });
});

describe('PullQuerySchema', () => {
    it('coerces since to a Date', () => {
        const result = PullQuerySchema.safeParse({ since: '2026-06-15T10:00:00.000Z' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.since instanceof Date).toBe(true);
        }
    });

    it('accepts an omitted since', () => {
        expect(PullQuerySchema.safeParse({}).success).toBe(true);
    });
});
