import { getTokens, setTokens, clearTokens } from '@/lib/token-storage';

describe('token-storage', () => {
    afterEach(async () => { await clearTokens(); });

    it('returns null pair before any write', async () => {
        expect(await getTokens()).toEqual({ accessToken: null, refreshToken: null });
    });
    it('round-trips a written pair', async () => {
        await setTokens('a.b.c', 'r.r.r');
        expect(await getTokens()).toEqual({ accessToken: 'a.b.c', refreshToken: 'r.r.r' });
    });
    it('clears both keys', async () => {
        await setTokens('a', 'b');
        await clearTokens();
        expect(await getTokens()).toEqual({ accessToken: null, refreshToken: null });
    });
});
