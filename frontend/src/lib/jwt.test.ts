import { decodeExp, isExpired } from '@/lib/jwt';

/**
 * @function makeToken
 * @description Builds a fake JWT with the given exp claim for testing decode only (signature ignored).
 *
 * @param {Maybe<number>} exp The exp claim in seconds, or null to omit it.
 * @returns {string} A three-segment token string.
 */
function makeToken(exp: number | null): string {
    const payload: Record<string, number> = exp === null ? {} : { exp };
    const body: string = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `header.${body}.signature`;
}

describe('jwt', () => {
    it('decodes the exp claim', () => {
        expect(decodeExp(makeToken(1893456000))).toBe(1893456000);
    });
    it('returns null when exp is absent', () => {
        expect(decodeExp(makeToken(null))).toBeNull();
    });
    it('returns null for a malformed token', () => {
        expect(decodeExp('not-a-jwt')).toBeNull();
    });
    it('treats a past exp as expired', () => {
        expect(isExpired(makeToken(1), () => 1000 * 1000)).toBe(true);
    });
    it('treats a future exp as not expired', () => {
        expect(isExpired(makeToken(1893456000), () => 1000)).toBe(false);
    });
});
