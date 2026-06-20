import type { ReactElement } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/modules/identity/identity-hook';
import type { Maybe } from '@/shared/models';

/**
 * @function Index
 * @description Root entry at `/`: returns null while auth is bootstrapping (the native splash is still up), then redirects into the tabs when signed in, or to the sign-in screen otherwise. Exists because neither route group declares an index, so `/` would otherwise match no screen and render blank.
 *
 * @returns {Maybe<ReactElement>} A redirect element, or null while bootstrapping.
 */
export default function Index(): Maybe<ReactElement> {
    const { status } = useAuth();

    if (status === 'bootstrapping') {
        return null;
    }
    if (status !== 'signedIn') {
        return <Redirect href="/sign-in" />;
    }
    return <Redirect href="/history" />;
}
