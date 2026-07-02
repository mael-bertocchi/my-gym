import { CreateSetSchema, UpdateSetSchema } from 'src/modules/sets/sets-models';
import { describe, expect, it } from 'vitest';

describe('CreateSetSchema', () => {
    it('accepts an empty body (all fields optional)', () => {
        expect(CreateSetSchema.safeParse({}).success).toBe(true);
    });

    it('accepts a full body', () => {
        const result = CreateSetSchema.safeParse({
            setType: 'NORMAL',
            weightKg: 100,
            reps: 8,
            distanceM: 0,
            durationSeconds: 60,
            isCompleted: true
        });
        expect(result.success).toBe(true);
    });

    it('rejects a negative weight', () => {
        expect(CreateSetSchema.safeParse({ weightKg: -1 }).success).toBe(false);
    });

    it('rejects an unknown setType', () => {
        expect(CreateSetSchema.safeParse({ setType: 'CARDIO' }).success).toBe(false);
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
