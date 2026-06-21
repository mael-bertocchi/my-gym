// frontend/src/modules/workouts/repeat-workout.ts
import { createSet, createWorkout, createWorkoutExercise } from '@/modules/workouts/workouts-api';
import { parseSetReps, parseSetWeightKg } from '@/modules/workouts/workouts-models';
import type { WorkoutDetail } from '@/modules/workouts/workouts-models';
import type { ApiClient } from '@/lib/api-client';
import type { Maybe } from '@/shared/models';

/**
 * @interface RepeatProgress
 * @description Progress of a Repeat composition (writes completed vs total).
 */
export interface RepeatProgress {
    done: number; /*!< Writes completed so far */
    total: number; /*!< Total writes planned */
}

/**
 * @function buildRepeatPlan
 * @description Computes the total number of sequential writes a Repeat will issue (1 workout + 1 per entry + 1 per set).
 *
 * @param {WorkoutDetail} detail The source workout.
 * @returns {{ totalWrites: number }} The plan size.
 */
export function buildRepeatPlan(detail: WorkoutDetail): { totalWrites: number } {
    let total: number = 1;
    for (const entry of detail.entries) {
        total += 1 + entry.sets.length;
    }
    return { totalWrites: total };
}

/**
 * @function repeatWorkout
 * @description Composes a new workout from a past one: POST workout -> per-entry POST workout-exercise -> per-set POST set (isCompleted:false). Sequential and partial-failure-safe: a later write that throws rejects the promise, so the caller surfaces the error and the user can retry; the new (partial) workout is still persisted server-side and reachable from History.
 *
 * @param {ApiClient} client The api-client.
 * @param {WorkoutDetail} detail The source workout.
 * @param {(progress: RepeatProgress) => void} onProgress Progress callback fired after each write.
 * @returns {Promise<{ workoutId: string; startedAt: string }>} The new workout id and start time.
 */
export async function repeatWorkout(client: ApiClient, detail: WorkoutDetail, onProgress: (progress: RepeatProgress) => void): Promise<{ workoutId: string; startedAt: string }> {
    const total: number = buildRepeatPlan(detail).totalWrites;
    let done: number = 0;
    const created = await createWorkout(client, { name: detail.name ?? undefined, gymLocationId: detail.gymLocationId ?? undefined });
    done += 1;
    onProgress({ done, total });

    for (const entry of detail.entries) {
        const newEntry = await createWorkoutExercise(client, { workoutId: created.id, exerciseVariantId: entry.exerciseVariantId });
        done += 1;
        onProgress({ done, total });
        let setNumber: number = 1;
        for (const set of entry.sets) {
            const weightKg: Maybe<number> = parseSetWeightKg(set);
            const reps: Maybe<number> = parseSetReps(set);
            await createSet(client, { workoutExerciseId: newEntry.id, setNumber, setType: set.setType, ...(weightKg !== null ? { weightKg } : {}), ...(reps !== null ? { reps } : {}), isCompleted: false });
            setNumber += 1;
            done += 1;
            onProgress({ done, total });
        }
    }

    return { workoutId: created.id, startedAt: created.startedAt };
}
