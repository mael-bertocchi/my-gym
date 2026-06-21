import * as SecureStore from 'expo-secure-store';
import type { Maybe } from '@/shared/models';

const ACTIVE_KEY: string = 'mygym.activeWorkoutId';
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

/**
 * @function getActiveWorkoutHint
 * @description Reads the persisted live-workout id hint (for an instant cold-launch strip).
 *
 * @returns {Promise<Maybe<string>>} The stored workout id, or null.
 */
export async function getActiveWorkoutHint(): Promise<Maybe<string>> {
    return SecureStore.getItemAsync(ACTIVE_KEY, OPTIONS);
}

/**
 * @function setActiveWorkoutHint
 * @description Persists the live-workout id hint.
 *
 * @param {string} workoutId The live workout id.
 * @returns {Promise<void>} Resolves once written.
 */
export async function setActiveWorkoutHint(workoutId: string): Promise<void> {
    await SecureStore.setItemAsync(ACTIVE_KEY, workoutId, OPTIONS);
}

/**
 * @function clearActiveWorkoutHint
 * @description Clears the live-workout id hint (on finish).
 *
 * @returns {Promise<void>} Resolves once removed.
 */
export async function clearActiveWorkoutHint(): Promise<void> {
    await SecureStore.deleteItemAsync(ACTIVE_KEY, OPTIONS);
}
