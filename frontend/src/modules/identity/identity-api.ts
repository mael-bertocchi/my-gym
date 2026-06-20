import type { ApiClient } from '@/lib/api-client';
import type { Profile, TokenPairResponse } from '@/modules/identity/identity-models';
import type { WeightUnit } from '@/lib/weight';

/**
 * @function login
 * @description POST /identity/login — exchanges credentials for a token pair.
 *
 * @param {ApiClient} client The api-client.
 * @param {string} email The user's email.
 * @param {string} password The user's password.
 * @returns {Promise<TokenPairResponse>} The token pair.
 */
export function login(client: ApiClient, email: string, password: string): Promise<TokenPairResponse> {
    return client.post<TokenPairResponse>('/identity/login', { email, password });
}

/**
 * @function fetchMe
 * @description GET /identity/me — warms the profile and caches weightUnit.
 *
 * @param {ApiClient} client The api-client.
 * @returns {Promise<Profile>} The profile.
 */
export function fetchMe(client: ApiClient): Promise<Profile> {
    return client.get<Profile>('/identity/me');
}

/**
 * @function updateWeightUnit
 * @description PATCH /identity/me { weightUnit } — persists the unit preference.
 *
 * @param {ApiClient} client The api-client.
 * @param {WeightUnit} weightUnit The new unit.
 * @returns {Promise<Profile>} The updated profile.
 */
export function updateWeightUnit(client: ApiClient, weightUnit: WeightUnit): Promise<Profile> {
    return client.patch<Profile>('/identity/me', { weightUnit });
}
