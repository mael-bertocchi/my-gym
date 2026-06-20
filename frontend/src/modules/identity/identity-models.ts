import type { WeightUnit } from '@/lib/weight';

/**
 * @interface Profile
 * @description The authenticated user's profile as returned by GET /v1/identity/me.
 */
export interface Profile {
    id: string; /*!< User id */
    email: string; /*!< Login email */
    firstname: string; /*!< Given name */
    lastname: string; /*!< Family name */
    isAdministrator: boolean; /*!< Admin flag */
    weightUnit: WeightUnit; /*!< Preferred weight display unit */
    createdAt: string; /*!< ISO creation timestamp */
    updatedAt: string; /*!< ISO update timestamp */
}

/**
 * @interface TokenPairResponse
 * @description The token pair returned by login/refresh.
 */
export interface TokenPairResponse {
    accessToken: string; /*!< Bearer access token */
    refreshToken: string; /*!< Rotating refresh token */
}

/**
 * @type AuthStatus
 * @description Bootstrap/auth state machine for the root gate.
 */
export type AuthStatus = 'bootstrapping' | 'signedIn' | 'signedOut';
