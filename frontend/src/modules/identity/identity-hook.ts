import { useContext } from 'react';
import { AuthContext } from '@/modules/identity/identity-context';
import type { AuthContextValue } from '@/modules/identity/identity-context';

/**
 * @function useAuth
 * @description Reads the auth context, throwing when used outside the provider.
 *
 * @returns {AuthContextValue} The auth context value.
 */
export function useAuth(): AuthContextValue {
    const value = useContext(AuthContext);
    if (value === null) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return value;
}
