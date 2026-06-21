import { buildRepeatPlan } from '@/modules/workouts/repeat-workout';
import type { WorkoutDetail } from '@/modules/workouts/workouts-models';

/**
 * @function makeDetail
 * @description Builds a detail tree with given per-entry set counts.
 *
 * @param {number[]} setCounts The set count per entry.
 * @returns {WorkoutDetail} The detail tree.
 */
function makeDetail(setCounts: number[]): WorkoutDetail {
    return {
        id: 'w1', gymLocationId: 'g1', name: 'Push', startedAt: 'x', endedAt: 'x', notes: null, createdAt: 'x', updatedAt: 'x',
        entries: setCounts.map((count, e) => ({
            id: `we${e}`, exerciseVariantId: `v${e}`, position: e + 1, notes: null, createdAt: 'x',
            exerciseVariant: { id: `v${e}`, equipmentType: 'BARBELL', machineBrandId: null, exercise: { id: `ex${e}`, name: 'X', primaryMuscle: 'CHEST' } },
            sets: Array.from({ length: count }, (_v, s) => ({ id: `s${e}-${s}`, workoutExerciseId: `we${e}`, setNumber: s + 1, setType: 'WORKING' as const, weightKg: '60', reps: 8, rpe: null, restSeconds: null, durationSeconds: null, tempo: null, notes: null, isCompleted: true, createdAt: 'x' }))
        }))
    };
}

describe('buildRepeatPlan', () => {
    it('counts 1 workout + 1 per entry + 1 per set', () => {
        expect(buildRepeatPlan(makeDetail([2, 3])).totalWrites).toBe(1 + 2 + (2 + 3));
    });
    it('counts just the workout when empty', () => {
        expect(buildRepeatPlan(makeDetail([])).totalWrites).toBe(1);
    });
});
