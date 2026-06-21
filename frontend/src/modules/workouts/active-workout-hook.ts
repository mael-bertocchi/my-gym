import { useContext } from 'react';
import { ActiveWorkoutContext } from '@/modules/workouts/active-workout-context';
import type { ActiveWorkoutValue } from '@/modules/workouts/active-workout-context';

/**
 * @function useActiveWorkout
 * @description Reads the active-workout context, throwing when used outside the provider.
 *
 * @returns {ActiveWorkoutValue} The active-workout context value.
 */
export function useActiveWorkout(): ActiveWorkoutValue {
    const value = useContext(ActiveWorkoutContext);
    if (value === null) {
        throw new Error('useActiveWorkout must be used within ActiveWorkoutProvider');
    }
    return value;
}
