import { createContext } from 'react';
import type { ApiClient } from '@/lib/api-client';
import type { AuthStatus, Profile } from '@/modules/identity/identity-models';
import type { Maybe } from '@/shared/models';

/**
 * @interface AuthContextValue
 * @description The shape exposed by useAuth().
 */
export interface AuthContextValue {
    status: AuthStatus; /*!< Bootstrap/auth state */
    profile: Maybe<Profile>; /*!< Warmed profile, null until /me resolves */
    client: ApiClient; /*!< The shared api-client */
    signIn: (email: string, password: string) => Promise<void>; /*!< Logs in and routes into tabs */
    signOut: () => Promise<void>; /*!< Clears the session */
}

/**
 * @constant AuthContext
 * @description React context backing useAuth(); null until the provider mounts.
 */
export const AuthContext = createContext<Maybe<AuthContextValue>>(null);
