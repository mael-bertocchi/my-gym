import { parseDecimal } from '@/lib/weight';
import type { EquipmentType, MuscleGroup } from '@/modules/exercise-library/exercise-library-models';
import type { Maybe } from '@/shared/models';

/**
 * @type SetType
 * @description The backend SetType enum as a string-literal union (used verbatim on the wire).
 */
export type SetType = 'WARMUP' | 'WORKING' | 'DROP' | 'FAILURE';

/**
 * @interface SetEntry
 * @description A logged set as returned by the API; decimals (`weightKg`, `rpe`) are STRINGS on read. The optional `pending`/`failed` flags are client-only and never sent on write.
 */
export interface SetEntry {
    id: string; /*!< Set UUID (a temp id while optimistic) */
    workoutExerciseId: string; /*!< Owning workout-exercise UUID */
    setNumber: number; /*!< 1-based ordering within the exercise */
    setType: SetType; /*!< The set classification */
    weightKg: Maybe<string>; /*!< Decimal-as-string kg, or null for bodyweight */
    reps: Maybe<number>; /*!< Repetition count, or null */
    rpe: Maybe<string>; /*!< Decimal-as-string RPE, or null */
    restSeconds: Maybe<number>; /*!< Rest taken, or null */
    durationSeconds: Maybe<number>; /*!< Timed-set duration, or null */
    tempo: Maybe<string>; /*!< Tempo notation, or null */
    notes: Maybe<string>; /*!< Free-text set note, or null */
    isCompleted: boolean; /*!< Whether the set is committed/done */
    createdAt: string; /*!< ISO creation timestamp */
    pending?: boolean; /*!< Client-only: optimistic write in flight */
    failed?: boolean; /*!< Client-only: write failed, awaiting retry */
}

/**
 * @interface WorkoutVariantExercise
 * @description The exercise metadata nested under a workout entry's variant.
 */
export interface WorkoutVariantExercise {
    id: string; /*!< Exercise UUID */
    name: string; /*!< Display name */
    primaryMuscle: MuscleGroup; /*!< Primary worked muscle */
}

/**
 * @interface WorkoutExerciseVariant
 * @description The variant metadata nested under a workout entry.
 */
export interface WorkoutExerciseVariant {
    id: string; /*!< Variant UUID */
    equipmentType: EquipmentType; /*!< Equipment used (BODYWEIGHT toggles bodyweight entry) */
    machineBrandId: Maybe<string>; /*!< Brand UUID for MACHINE variants, else null */
    exercise: WorkoutVariantExercise; /*!< The owning exercise */
}

/**
 * @interface WorkoutEntry
 * @description One exercise within a workout: the variant plus its ordered sets (the nested GET /workouts/:id shape).
 */
export interface WorkoutEntry {
    id: string; /*!< Workout-exercise UUID (a temp id while optimistic) */
    exerciseVariantId: string; /*!< The variant logged */
    position: number; /*!< 1-based ordering within the workout */
    notes: Maybe<string>; /*!< Free-text entry note, or null */
    createdAt: string; /*!< ISO creation timestamp */
    exerciseVariant: WorkoutExerciseVariant; /*!< Nested variant + exercise metadata */
    sets: SetEntry[]; /*!< Ordered sets (setNumber ASC) */
}

/**
 * @interface WorkoutEntryRow
 * @description The FLAT row returned by POST /workout-exercises (WORKOUT_EXERCISE_SELECT has no nested variant/sets). The hook reconciles by id and refetches the detail tree for nested metadata.
 */
export interface WorkoutEntryRow {
    id: string; /*!< Workout-exercise UUID */
    workoutId: string; /*!< Owning workout UUID */
    exerciseVariantId: string; /*!< The variant logged */
    position: number; /*!< 1-based ordering within the workout */
    notes: Maybe<string>; /*!< Free-text entry note, or null */
    createdAt: string; /*!< ISO creation timestamp */
}

/**
 * @interface WorkoutSummary
 * @description A workout row from GET /workouts (no nested entries).
 */
export interface WorkoutSummary {
    id: string; /*!< Workout UUID */
    gymLocationId: Maybe<string>; /*!< Gym location UUID, or null */
    name: Maybe<string>; /*!< Workout name, or null */
    startedAt: string; /*!< ISO start timestamp */
    endedAt: Maybe<string>; /*!< ISO end timestamp; null while live */
    notes: Maybe<string>; /*!< Free-text note, or null */
    createdAt: string; /*!< ISO creation timestamp */
    updatedAt: string; /*!< ISO update timestamp */
}

/**
 * @interface WorkoutDetail
 * @description The full nested workout tree from GET /workouts/:id.
 */
export interface WorkoutDetail extends WorkoutSummary {
    entries: WorkoutEntry[]; /*!< Ordered exercise entries (position ASC) */
}

/**
 * @interface CreateWorkoutInput
 * @description Request body for POST /workouts (every field optional; startedAt defaults server-side to now).
 */
export interface CreateWorkoutInput {
    gymLocationId?: string; /*!< Optional gym location UUID */
    name?: string; /*!< Optional 1-120 char name */
    startedAt?: string; /*!< Optional ISO start; defaults to now */
    notes?: string; /*!< Optional note */
}

/**
 * @interface CreateWorkoutExerciseInput
 * @description Request body for POST /workout-exercises (position auto-assigns when omitted).
 */
export interface CreateWorkoutExerciseInput {
    workoutId: string; /*!< Owning workout UUID */
    exerciseVariantId: string; /*!< The variant to add */
    notes?: string; /*!< Optional entry note */
}

/**
 * @interface CreateSetInput
 * @description Request body for POST /sets. weightKg is a NUMBER on write; omit it for bodyweight. setNumber is sent for stable ordering under concurrency.
 */
export interface CreateSetInput {
    workoutExerciseId: string; /*!< Owning workout-exercise UUID */
    setNumber: number; /*!< Explicit 1-based set number */
    setType?: SetType; /*!< Defaults to WORKING server-side */
    weightKg?: number; /*!< kg as a number; omit for bodyweight */
    reps?: number; /*!< Repetition count */
    isCompleted?: boolean; /*!< Commit flag */
}

/**
 * @interface UpdateSetInput
 * @description Request body for PATCH /sets/:id (at least one field). weightKg null clears to bodyweight.
 */
export interface UpdateSetInput {
    setType?: SetType; /*!< New set type */
    weightKg?: Maybe<number>; /*!< kg as a number, or null for bodyweight */
    reps?: number; /*!< Repetition count */
    isCompleted?: boolean; /*!< Commit flag */
}

/**
 * @constant SET_TYPES
 * @description Ordered list of every SetType for chips/pickers.
 */
export const SET_TYPES: SetType[] = ['WARMUP', 'WORKING', 'DROP', 'FAILURE'];

/**
 * @function parseSetWeightKg
 * @description Parses a set's decimal-as-string weightKg into a number, returning null for bodyweight or an unparseable value.
 *
 * @param {SetEntry} set The set entry.
 * @returns {Maybe<number>} The weight in kg, or null.
 */
export function parseSetWeightKg(set: SetEntry): Maybe<number> {
    if (set.weightKg !== null) {
        return parseDecimal(set.weightKg);
    }
    return null;
}

/**
 * @function parseSetReps
 * @description Reads a set's reps (already a number on the wire), passing null through.
 *
 * @param {SetEntry} set The set entry.
 * @returns {Maybe<number>} The reps, or null.
 */
export function parseSetReps(set: SetEntry): Maybe<number> {
    return set.reps;
}
