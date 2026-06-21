import { createContext } from 'react';
import type { Maybe } from '@/shared/models';

/**
 * @interface ActiveSession
 * @description The currently-live workout's identity (the set draft lives in the Query cache, not here).
 */
export interface ActiveSession {
    workoutId: string; /*!< The live workout's UUID */
    startedAt: number; /*!< Epoch ms; drives the strip and header timer */
}

/**
 * @interface StartWorkoutInput
 * @description Optional seed fields when starting a workout.
 */
export interface StartWorkoutInput {
    gymLocationId?: string; /*!< Optional gym location */
    name?: string; /*!< Optional name */
}

/**
 * @interface ActiveWorkoutValue
 * @description The app-wide active-workout API exposed by useActiveWorkout().
 */
export interface ActiveWorkoutValue {
    session: Maybe<ActiveSession>; /*!< null when idle */
    isLive: boolean; /*!< session !== null */
    bootstrapping: boolean; /*!< cold-launch reconciliation in flight */
    start: (input?: StartWorkoutInput) => Promise<string>; /*!< creates the workout, sets session, navigates, returns id */
    resume: () => void; /*!< re-enters the live modal */
    clearSession: () => Promise<void>; /*!< tears down the session + hint with NO network (the Finish PATCH is done by useFinishWorkout) */
    setActiveFromWorkout: (workoutId: string, startedAtIso: string) => void; /*!< adopt an existing workout (e.g. Repeat) as the live session */
}

/**
 * @constant ActiveWorkoutContext
 * @description React context carrying the ActiveWorkoutValue (null outside the provider).
 */
export const ActiveWorkoutContext = createContext<Maybe<ActiveWorkoutValue>>(null);
