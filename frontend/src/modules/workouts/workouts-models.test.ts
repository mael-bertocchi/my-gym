import { parseSetReps, parseSetWeightKg, SET_TYPES } from '@/modules/workouts/workouts-models';
import type { SetEntry } from '@/modules/workouts/workouts-models';

/**
 * @function makeSet
 * @description Builds a minimal SetEntry for parse tests.
 *
 * @param {Partial<SetEntry>} overrides Field overrides.
 * @returns {SetEntry} The set entry.
 */
function makeSet(overrides: Partial<SetEntry>): SetEntry {
    return {
        id: 's1',
        workoutExerciseId: 'we1',
        setNumber: 1,
        setType: 'WORKING',
        weightKg: '60.5',
        reps: 8,
        rpe: null,
        restSeconds: null,
        durationSeconds: null,
        tempo: null,
        notes: null,
        isCompleted: true,
        createdAt: '2026-06-21T00:00:00.000Z',
        ...overrides
    };
}

describe('workouts-models helpers', () => {
    it('parses a decimal string weightKg to a number', () => {
        expect(parseSetWeightKg(makeSet({ weightKg: '60.5' }))).toBe(60.5);
    });
    it('returns null weightKg for bodyweight', () => {
        expect(parseSetWeightKg(makeSet({ weightKg: null }))).toBeNull();
    });
    it('returns null for an unparseable weightKg', () => {
        expect(parseSetWeightKg(makeSet({ weightKg: 'x' }))).toBeNull();
    });
    it('reads reps straight through', () => {
        expect(parseSetReps(makeSet({ reps: 8 }))).toBe(8);
        expect(parseSetReps(makeSet({ reps: null }))).toBeNull();
    });
    it('lists every set type', () => {
        expect(SET_TYPES).toEqual(['WARMUP', 'WORKING', 'DROP', 'FAILURE']);
    });
});
