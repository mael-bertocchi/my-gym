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

    it('defaults requiresBrand to false and accepts an override', () => {
        const omitted = CreateExerciseSchema.safeParse({ name: 'Squat', primaryMuscle: 'QUADRICEPS', equipment: 'BARBELL' });
        expect(omitted.success).toBe(true);
        if (omitted.success) {
            expect(omitted.data.requiresBrand).toBe(false);
        }
        const set = CreateExerciseSchema.safeParse({ name: 'Chest Press', primaryMuscle: 'CHEST', equipment: 'MACHINE', requiresBrand: true });
        expect(set.success).toBe(true);
        if (set.success) {
            expect(set.data.requiresBrand).toBe(true);
        }
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

    it('accepts toggling requiresBrand', () => {
        expect(UpdateExerciseSchema.safeParse({ requiresBrand: true }).success).toBe(true);
    });

    it('rejects an empty update', () => {
        expect(UpdateExerciseSchema.safeParse({}).success).toBe(false);
    });
});
