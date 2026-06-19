import type { Maybe, Perhaps } from '@/shared/models';

const SKEW_SECONDS: number = 30;

/**
 * @function decodeExp
 * @description Reads the `exp` (seconds) claim from a JWT without verifying its signature. JWT segments are base64url-encoded, so the payload is normalized before decoding. Returns null on any malformed/missing value.
 *
 * @param {string} token The access token.
 * @returns {Maybe<number>} The exp claim in seconds, or null.
 */
export function decodeExp(token: string): Maybe<number> {
    const segments: string[] = token.split('.');
    if (segments.length !== 3) {
        return null;
    }
    const segment: Perhaps<string> = segments[1];
    if (segment === undefined) {
        return null;
    }
    try {
        const base64: string = segment.replace(/-/g, '+').replace(/_/g, '/');
        const padded: string = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const json: string = globalThis.atob(padded);
        const payload: Record<string, unknown> = { ...JSON.parse(json) };
        const exp: unknown = payload.exp;
        if (typeof exp !== 'number') {
            return null;
        }
        return exp;
    } catch {
        return null;
    }
}

/**
 * @function isExpired
 * @description Determines whether a token is expired (or within a 30s clock-skew margin) using a locally decoded exp.
 *
 * @param {string} token The access token.
 * @param {() => number} now A clock returning the current epoch milliseconds (injectable for tests).
 * @returns {boolean} True when the token is expired or unreadable.
 */
export function isExpired(token: string, now: () => number = Date.now): boolean {
    const exp: Maybe<number> = decodeExp(token);
    if (exp === null) {
        return true;
    }
    return now() / 1000 >= exp - SKEW_SECONDS;
}
