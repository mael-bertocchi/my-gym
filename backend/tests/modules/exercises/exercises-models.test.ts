import { CreateExerciseSchema, UpdateExerciseSchema } from 'src/modules/exercises/exercises-models';
import { describe, expect, it } from 'vitest';

describe('CreateExerciseSchema', () => {
    it('accepts a valid exercise with primary and secondary muscles', () => {
        const result = CreateExerciseSchema.safeParse({
            name: 'Chest Press',
            primaryMuscle: 'CHEST',
            secondaryMuscles: ['TRICEPS', 'FRONT_DELTS'],
            equipment: 'MACHINE'
        });
        expect(result.success).toBe(true);
    });

    it('defaults secondaryMuscles to an empty array', () => {
        const result = CreateExerciseSchema.safeParse({ name: 'Squat', primaryMuscle: 'QUADRICEPS', equipment: 'BARBELL' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.secondaryMuscles).toEqual([]);
        }
    });

    it('defaults isUnilateral to false and accepts an override', () => {
        const omitted = CreateExerciseSchema.safeParse({ name: 'Squat', primaryMuscle: 'QUADRICEPS', equipment: 'BARBELL' });
        expect(omitted.success).toBe(true);
        if (omitted.success) {
            expect(omitted.data.isUnilateral).toBe(false);
        }
        const set = CreateExerciseSchema.safeParse({ name: 'Single-Arm Row', primaryMuscle: 'LATS', equipment: 'DUMBBELL', isUnilateral: true });
        expect(set.success).toBe(true);
        if (set.success) {
            expect(set.data.isUnilateral).toBe(true);
        }
    });

    it('defaults brandMode to NONE', () => {
        const omitted = CreateExerciseSchema.safeParse({ name: 'Squat', primaryMuscle: 'QUADRICEPS', equipment: 'BARBELL' });
        expect(omitted.success).toBe(true);
        if (omitted.success) {
            expect(omitted.data.brandMode).toBe('NONE');
            expect(omitted.data.brandId).toBeUndefined();
        }
    });

    it('requires a brandId exactly when brandMode is SINGLE', () => {
        const base = { name: 'Chest Press', primaryMuscle: 'CHEST', equipment: 'MACHINE' };
        expect(CreateExerciseSchema.safeParse({ ...base, brandMode: 'SINGLE' }).success).toBe(false);
        expect(CreateExerciseSchema.safeParse({ ...base, brandMode: 'SINGLE', brandId: null }).success).toBe(false);
        expect(CreateExerciseSchema.safeParse({ ...base, brandMode: 'SINGLE', brandId: '7f4d3f5e-8a4e-4a7d-9f68-2a4c5d6e7f80' }).success).toBe(true);
        expect(CreateExerciseSchema.safeParse({ ...base, brandMode: 'MULTIPLE' }).success).toBe(true);
        expect(CreateExerciseSchema.safeParse({ ...base, brandMode: 'MULTIPLE', brandId: '7f4d3f5e-8a4e-4a7d-9f68-2a4c5d6e7f80' }).success).toBe(false);
        expect(CreateExerciseSchema.safeParse({ ...base, brandId: '7f4d3f5e-8a4e-4a7d-9f68-2a4c5d6e7f80' }).success).toBe(false);
    });

    it('rejects a missing equipment type', () => {
        expect(CreateExerciseSchema.safeParse({ name: 'Squat', primaryMuscle: 'QUADRICEPS' }).success).toBe(false);
    });

    it('rejects an unknown equipment type', () => {
        expect(CreateExerciseSchema.safeParse({ name: 'Squat', primaryMuscle: 'QUADRICEPS', equipment: 'ROCKS' }).success).toBe(false);
    });

    it('rejects an unknown muscle group', () => {
        expect(CreateExerciseSchema.safeParse({ name: 'Squat', primaryMuscle: 'WINGS', equipment: 'BARBELL' }).success).toBe(false);
    });

    it('rejects an empty name', () => {
        expect(CreateExerciseSchema.safeParse({ name: '', primaryMuscle: 'CHEST', equipment: 'MACHINE' }).success).toBe(false);
    });
});

describe('UpdateExerciseSchema', () => {
    it('accepts a single-field update', () => {
        expect(UpdateExerciseSchema.safeParse({ isArchived: true }).success).toBe(true);
    });

    it('accepts toggling isUnilateral', () => {
        expect(UpdateExerciseSchema.safeParse({ isUnilateral: true }).success).toBe(true);
    });

    it('accepts brand mode changes', () => {
        expect(UpdateExerciseSchema.safeParse({ brandMode: 'MULTIPLE' }).success).toBe(true);
        expect(UpdateExerciseSchema.safeParse({ brandMode: 'SINGLE', brandId: '7f4d3f5e-8a4e-4a7d-9f68-2a4c5d6e7f80' }).success).toBe(true);
        expect(UpdateExerciseSchema.safeParse({ brandId: null }).success).toBe(true);
        expect(UpdateExerciseSchema.safeParse({ brandMode: 'ROTATING' }).success).toBe(false);
    });

    it('rejects an empty update', () => {
        expect(UpdateExerciseSchema.safeParse({}).success).toBe(false);
    });
});
