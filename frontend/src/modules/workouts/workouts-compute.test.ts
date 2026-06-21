import { computeDurationMs, computeVolumeKg, countCompletedSets, formatDuration, nextSetNumber, prefillFromLastSet, prefillFromStatsSession } from '@/modules/workouts/workouts-compute';
import type { SetEntry, WorkoutEntry } from '@/modules/workouts/workouts-models';

/**
 * @function makeSet
 * @description Builds a minimal SetEntry for compute tests.
 *
 * @param {Partial<SetEntry>} overrides Field overrides.
 * @returns {SetEntry} The set entry.
 */
function makeSet(overrides: Partial<SetEntry>): SetEntry {
    return { id: 's', workoutExerciseId: 'we1', setNumber: 1, setType: 'WORKING', weightKg: '60', reps: 8, rpe: null, restSeconds: null, durationSeconds: null, tempo: null, notes: null, isCompleted: true, createdAt: 'x', ...overrides };
}

/**
 * @function makeEntry
 * @description Builds a minimal WorkoutEntry for compute tests.
 *
 * @param {SetEntry[]} sets The entry sets.
 * @returns {WorkoutEntry} The entry.
 */
function makeEntry(sets: SetEntry[]): WorkoutEntry {
    return { id: 'we1', exerciseVariantId: 'v1', position: 1, notes: null, createdAt: 'x', exerciseVariant: { id: 'v1', equipmentType: 'BARBELL', machineBrandId: null, exercise: { id: 'e1', name: 'Bench', primaryMuscle: 'CHEST' } }, sets };
}

describe('workouts-compute', () => {
    it('derives duration from endedAt, falling back to now while live', () => {
        const start = '2026-06-21T10:00:00.000Z';
        expect(computeDurationMs(start, '2026-06-21T10:30:00.000Z', 0)).toBe(30 * 60 * 1000);
        expect(computeDurationMs(start, null, Date.parse('2026-06-21T10:10:00.000Z'))).toBe(10 * 60 * 1000);
    });
    it('formats m:ss under an hour and h:mm:ss at or over an hour', () => {
        expect(formatDuration(90 * 1000)).toBe('1:30');
        expect(formatDuration(3 * 60 * 1000 + 5 * 1000)).toBe('3:05');
        expect(formatDuration(75 * 60 * 1000)).toBe('1:15:00');
    });
    it('sums volume over completed sets, bodyweight contributing zero', () => {
        const entries = [makeEntry([makeSet({ weightKg: '60', reps: 8 }), makeSet({ weightKg: null, reps: 10 }), makeSet({ weightKg: '50', reps: 5, isCompleted: false })])];
        expect(computeVolumeKg(entries)).toBe(60 * 8);
    });
    it('counts completed sets', () => {
        const entries = [makeEntry([makeSet({ isCompleted: true }), makeSet({ isCompleted: false })])];
        expect(countCompletedSets(entries)).toBe(1);
    });
    it('computes the next set number', () => {
        expect(nextSetNumber([])).toBe(1);
        expect(nextSetNumber([makeSet({ setNumber: 1 }), makeSet({ setNumber: 3 })])).toBe(4);
    });
    it('prefills from the last committed set, ignoring pending/failed', () => {
        const sets = [makeSet({ weightKg: '60', reps: 8 }), makeSet({ weightKg: '70', reps: 6, pending: true })];
        expect(prefillFromLastSet(sets)).toEqual({ weightKg: 60, reps: 8 });
    });
    it('returns blank prefill when no committed set exists', () => {
        expect(prefillFromLastSet([])).toEqual({ weightKg: null, reps: null });
    });
    it('seeds the first set from a stats session max weight', () => {
        expect(prefillFromStatsSession(80)).toEqual({ weightKg: 80, reps: null });
        expect(prefillFromStatsSession(null)).toEqual({ weightKg: null, reps: null });
    });
});
