import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { createApiClient } from '@/lib/api-client';
import { readApiBaseUrl } from '@/shared/env';
import { isExpired } from '@/lib/jwt';
import { clearTokens, getTokens, setTokens } from '@/lib/token-storage';
import * as identityApi from '@/modules/identity/identity-api';
import { AuthContext } from '@/modules/identity/identity-context';
import type { AuthContextValue } from '@/modules/identity/identity-context';
import type { AuthStatus, Profile } from '@/modules/identity/identity-models';
import type { Maybe } from '@/shared/models';

/**
 * @interface AuthProviderProps
 * @description Props for the AuthProvider.
 */
export interface AuthProviderProps {
    children: ReactNode; /*!< App subtree under the auth gate */
}

/**
 * @function AuthProvider
 * @description Owns tokens, the api-client, bootstrap (local-exp pre-route refresh), and sign-in/out.
 *
 * @param {AuthProviderProps} props The provider props.
 * @returns {ReactElement} The provider element.
 */
export function AuthProvider(props: AuthProviderProps): ReactElement {
    const [status, setStatus] = useState<AuthStatus>('bootstrapping');
    const [profile, setProfile] = useState<Maybe<Profile>>(null);

    const client = useMemo(() => createApiClient({
        baseUrl: readApiBaseUrl(),
        fetchImpl: fetch,
        getAccessToken: async () => (await getTokens()).accessToken,
        onRefresh: async () => {
            const { refreshToken } = await getTokens();
            if (refreshToken === null) {
                throw new Error('No refresh token');
            }
            const base = createApiClient({ baseUrl: readApiBaseUrl(), fetchImpl: fetch, getAccessToken: async () => null, onRefresh: async () => { throw new Error('nested refresh'); }, onAuthLost: async () => {} });
            const pair = await base.post<{ accessToken: string; refreshToken: string }>('/identity/refresh', { refreshToken });
            await setTokens(pair.accessToken, pair.refreshToken);
            return pair.accessToken;
        },
        onAuthLost: async () => { await clearTokens(); setProfile(null); setStatus('signedOut'); }
    }), []);

    const warm = useCallback(async (): Promise<void> => {
        const me: Profile = await identityApi.fetchMe(client);
        setProfile(me);
        setStatus('signedIn');
    }, [client]);

    useEffect(() => {
        let active: boolean = true;
        const bootstrap = async (): Promise<void> => {
            const { accessToken, refreshToken } = await getTokens();
            if (accessToken === null || refreshToken === null) {
                if (active) { setStatus('signedOut'); }
                return;
            }
            try {
                if (isExpired(accessToken)) {
                    const pair = await client.post<{ accessToken: string; refreshToken: string }>('/identity/refresh', { refreshToken });
                    await setTokens(pair.accessToken, pair.refreshToken);
                }
                await warm();
            } catch {
                await clearTokens();
                if (active) { setStatus('signedOut'); }
            }
        };
        void bootstrap();
        return (): void => { active = false; };
    }, [client, warm]);

    const signIn = useCallback(async (email: string, password: string): Promise<void> => {
        const pair = await identityApi.login(client, email, password);
        await setTokens(pair.accessToken, pair.refreshToken);
        await warm();
    }, [client, warm]);

    const signOut = useCallback(async (): Promise<void> => {
        await clearTokens();
        setProfile(null);
        setStatus('signedOut');
    }, []);

    const value: AuthContextValue = useMemo(() => ({ status, profile, client, signIn, signOut }), [status, profile, client, signIn, signOut]);

    return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}
