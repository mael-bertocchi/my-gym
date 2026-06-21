import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/modules/identity/identity-hook';
import { createWorkout, listWorkouts } from '@/modules/workouts/workouts-api';
import { clearActiveWorkoutHint, getActiveWorkoutHint, setActiveWorkoutHint } from '@/lib/active-workout-storage';
import { ActiveWorkoutContext } from '@/modules/workouts/active-workout-context';
import type { ActiveSession, ActiveWorkoutValue, StartWorkoutInput } from '@/modules/workouts/active-workout-context';
import type { WorkoutSummary } from '@/modules/workouts/workouts-models';
import type { Maybe } from '@/shared/models';

/**
 * @interface ActiveWorkoutProviderProps
 * @description Props for the ActiveWorkoutProvider.
 */
export interface ActiveWorkoutProviderProps {
    children: ReactNode; /*!< App subtree spanning tabs + the live modal */
}

/**
 * @function navigateToWorkout
 * @description Pushes the full-screen workout modal for a given id.
 *
 * @param {string} workoutId The workout UUID.
 * @returns {void}
 */
function navigateToWorkout(workoutId: string): void {
    router.push({ pathname: '/workout/[workoutId]', params: { workoutId } });
}

/**
 * @function ActiveWorkoutProvider
 * @description Owns the live-workout session identity and cold-launch reconciliation; exposes start/resume/clearSession.
 *
 * @param {ActiveWorkoutProviderProps} props The provider props.
 * @returns {ReactElement} The provider element.
 */
export function ActiveWorkoutProvider(props: ActiveWorkoutProviderProps): ReactElement {
    const { status, client } = useAuth();
    const [session, setSession] = useState<Maybe<ActiveSession>>(null);
    const [bootstrapping, setBootstrapping] = useState<boolean>(true);

    useEffect(() => {
        if (status !== 'signedIn') {
            return;
        }
        let active: boolean = true;
        const reconcile = async (): Promise<void> => {
            const hint: Maybe<string> = await getActiveWorkoutHint();
            if (hint !== null && active) {
                setSession({ workoutId: hint, startedAt: Date.now() });
            }
            try {
                const page = await listWorkouts(client, null, 1);
                const newest: Maybe<WorkoutSummary> = page.data.length !== 0 ? page.data[0] ?? null : null;
                if (!active) {
                    return;
                }
                if (newest !== null && newest.endedAt === null) {
                    setSession({ workoutId: newest.id, startedAt: Date.parse(newest.startedAt) });
                    await setActiveWorkoutHint(newest.id);
                } else {
                    setSession(null);
                    await clearActiveWorkoutHint();
                }
            } catch {
                /* keep the hint-derived session; reconcile retries on next launch */
            } finally {
                if (active) {
                    setBootstrapping(false);
                }
            }
        };
        void reconcile();
        return (): void => { active = false; };
    }, [status, client]);

    const start = useCallback(async (input?: StartWorkoutInput): Promise<string> => {
        const created: WorkoutSummary = await createWorkout(client, { gymLocationId: input?.gymLocationId, name: input?.name });
        setSession({ workoutId: created.id, startedAt: Date.parse(created.startedAt) });
        await setActiveWorkoutHint(created.id);
        navigateToWorkout(created.id);
        return created.id;
    }, [client]);

    const resume = useCallback((): void => {
        if (session === null) {
            return;
        }
        navigateToWorkout(session.workoutId);
    }, [session]);

    const clearSession = useCallback(async (): Promise<void> => {
        setSession(null);
        await clearActiveWorkoutHint();
    }, []);

    const setActiveFromWorkout = useCallback((workoutId: string, startedAtIso: string): void => {
        setSession({ workoutId, startedAt: Date.parse(startedAtIso) });
        void setActiveWorkoutHint(workoutId);
    }, []);

    const value: ActiveWorkoutValue = useMemo(() => ({
        session,
        isLive: session !== null,
        bootstrapping,
        start,
        resume,
        clearSession,
        setActiveFromWorkout
    }), [session, bootstrapping, start, resume, clearSession, setActiveFromWorkout]);

    return <ActiveWorkoutContext.Provider value={value}>{props.children}</ActiveWorkoutContext.Provider>;
}
