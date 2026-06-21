import { appendEntry, appendSet, findSetInEntry, patchSet, removeEntry, removeSet, replaceEntry, replaceSet } from '@/modules/workouts/workouts-cache';
import type { SetEntry, WorkoutDetail, WorkoutEntry } from '@/modules/workouts/workouts-models';

/**
 * @function makeSet
 * @description Builds a minimal SetEntry for cache tests.
 *
 * @param {string} id The set id.
 * @param {Partial<SetEntry>} overrides Field overrides.
 * @returns {SetEntry} The set entry.
 */
function makeSet(id: string, overrides: Partial<SetEntry>): SetEntry {
    return { id, workoutExerciseId: 'we1', setNumber: 1, setType: 'WORKING', weightKg: '60', reps: 8, rpe: null, restSeconds: null, durationSeconds: null, tempo: null, notes: null, isCompleted: true, createdAt: 'x', ...overrides };
}

/**
 * @function makeEntry
 * @description Builds a minimal WorkoutEntry for cache tests.
 *
 * @param {string} id The entry id.
 * @param {SetEntry[]} sets The entry sets.
 * @returns {WorkoutEntry} The entry.
 */
function makeEntry(id: string, sets: SetEntry[]): WorkoutEntry {
    return { id, exerciseVariantId: 'v1', position: 1, notes: null, createdAt: 'x', exerciseVariant: { id: 'v1', equipmentType: 'BARBELL', machineBrandId: null, exercise: { id: 'e1', name: 'Bench', primaryMuscle: 'CHEST' } }, sets };
}

/**
 * @function makeDetail
 * @description Builds a minimal WorkoutDetail for cache tests.
 *
 * @param {WorkoutEntry[]} entries The entries.
 * @returns {WorkoutDetail} The detail tree.
 */
function makeDetail(entries: WorkoutEntry[]): WorkoutDetail {
    return { id: 'w1', gymLocationId: null, name: null, startedAt: 'x', endedAt: null, notes: null, createdAt: 'x', updatedAt: 'x', entries };
}

describe('workouts-cache', () => {
    it('returns undefined unchanged when prev is undefined', () => {
        expect(appendSet(undefined, 'we1', makeSet('s1', {}))).toBeUndefined();
    });
    it('appends a set to the matching entry without mutating the input', () => {
        const prev = makeDetail([makeEntry('we1', [makeSet('s1', {})])]);
        const next = appendSet(prev, 'we1', makeSet('s2', { setNumber: 2 }));
        expect(next?.entries[0]?.sets.map((s) => s.id)).toEqual(['s1', 's2']);
        expect(prev.entries[0]?.sets.map((s) => s.id)).toEqual(['s1']);
    });
    it('replaces a temp set with the server set in the matching entry', () => {
        const prev = makeDetail([makeEntry('we1', [makeSet('temp', { pending: true })])]);
        const next = replaceSet(prev, 'we1', 'temp', makeSet('real', { isCompleted: true }));
        expect(next?.entries[0]?.sets.map((s) => s.id)).toEqual(['real']);
    });
    it('patches client flags on a set', () => {
        const prev = makeDetail([makeEntry('we1', [makeSet('s1', { pending: true })])]);
        const next = patchSet(prev, 'we1', 's1', { pending: false, failed: true });
        expect(next?.entries[0]?.sets[0]?.failed).toBe(true);
        expect(next?.entries[0]?.sets[0]?.pending).toBe(false);
    });
    it('removes a set by id', () => {
        const prev = makeDetail([makeEntry('we1', [makeSet('s1', {}), makeSet('s2', {})])]);
        const next = removeSet(prev, 'we1', 's1');
        expect(next?.entries[0]?.sets.map((s) => s.id)).toEqual(['s2']);
    });
    it('finds an existing set in an entry, or null', () => {
        const prev = makeDetail([makeEntry('we1', [makeSet('s1', { failed: true })])]);
        expect(findSetInEntry(prev, 'we1', 's1')?.failed).toBe(true);
        expect(findSetInEntry(prev, 'we1', 'nope')).toBeNull();
        expect(findSetInEntry(undefined, 'we1', 's1')).toBeNull();
    });
    it('appends, replaces and removes entries', () => {
        const prev = makeDetail([makeEntry('we1', [])]);
        const added = appendEntry(prev, makeEntry('we2', []));
        expect(added?.entries.map((e) => e.id)).toEqual(['we1', 'we2']);
        const replaced = replaceEntry(added, 'we2', makeEntry('weReal', []));
        expect(replaced?.entries.map((e) => e.id)).toEqual(['we1', 'weReal']);
        const removed = removeEntry(replaced, 'we1');
        expect(removed?.entries.map((e) => e.id)).toEqual(['weReal']);
    });
});
