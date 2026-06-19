import * as SecureStore from 'expo-secure-store';
import type { Maybe } from '@/shared/models';

const ACCESS_KEY: string = 'mygym.accessToken';
const REFRESH_KEY: string = 'mygym.refreshToken';
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

/**
 * @interface TokenPair
 * @description The stored access/refresh token pair (each null when absent).
 */
export interface TokenPair {
    accessToken: Maybe<string>; /*!< Bearer access token */
    refreshToken: Maybe<string>; /*!< Refresh token used to rotate the pair */
}

/**
 * @function getTokens
 * @description Reads both tokens from the secure keychain.
 *
 * @returns {Promise<TokenPair>} The stored pair, each value null when missing.
 */
export async function getTokens(): Promise<TokenPair> {
    const accessToken: Maybe<string> = await SecureStore.getItemAsync(ACCESS_KEY, OPTIONS);
    const refreshToken: Maybe<string> = await SecureStore.getItemAsync(REFRESH_KEY, OPTIONS);
    return { accessToken, refreshToken };
}

/**
 * @function setTokens
 * @description Persists both tokens (overwriting any previous pair — refresh rotates both).
 *
 * @param {string} accessToken The new access token.
 * @param {string} refreshToken The new refresh token.
 * @returns {Promise<void>} Resolves once both keys are written.
 */
export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken, OPTIONS);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken, OPTIONS);
}

/**
 * @function clearTokens
 * @description Deletes both tokens (logout / session loss).
 *
 * @returns {Promise<void>} Resolves once both keys are removed.
 */
export async function clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_KEY, OPTIONS);
    await SecureStore.deleteItemAsync(REFRESH_KEY, OPTIONS);
}
